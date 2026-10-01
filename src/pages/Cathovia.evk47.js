/* ═══════════════════════════════════════════════════════════════════════════
 * SABIO VALLEY — CATHOVIA Página Velo
 * VERSION:  1.4.6
 * FECHA:    18 Julio 2026
 *
 * CAMBIOS v1.4.4 → v1.4.6 — ELIMINADO welcomeTitle DEL BRAND:
 *   Se quita la clave welcomeTitle del BRAND local. El widget usa su
 *   DEFAULT_BRAND.welcomeTitle (v1.6.6+ = "Te damos la bienvenida a").
 *   Al no venir la clave en cfg.brand, el merge del widget preserva el
 *   default y ya no hay forma de que aparezca "Bienvenido a Cathovia" —
 *   el string no existe en ningun sitio del codigo.
 *
 * CAMBIOS v1.4.3 → v1.4.4:
 *   - Nuevo import cathoviaBorrarChat + nuevo listener cathovia-delete-chat
 *     que llama al backend con {sessionId, userId} y refresca la lista tras
 *     el borrado (autoritativo). Requiere backend v1.2.4+.
 *
 * CAMBIOS v1.4.2 → v1.4.3:
 *   - FIX BUG DEFINITIVO DE REAPERTURA: `history` e `inlineCatalog` ahora
 *     incluyen un timestamp `_ts` en el JSON, forzando que el browser vea
 *     un valor distinto y dispare el attributeChangedCallback del custom
 *     element. Sin _ts, un JSON idéntico no disparaba el callback (spec
 *     del DOM: setAttribute con mismo valor no dispara MutationObserver).
 *
 * CAMBIOS v1.4.1 → v1.4.2:
 *   - cathovia-open-chat pasa cursoId al backend y aplica inlineCatalog
 *     antes que history. Requiere backend v1.2.3+. Blindaje definitivo
 *     contra el bug de "al reabrir un chat viejo, los enlaces no aparecen".
 *
 * CAMBIOS v1.4.0 → v1.4.1:
 *   - FIX RACE CONDITION: cargarEstadoInicial ahora carga PRIMERO los
 *     catálogos (courses, eventos, inlineCatalog) y DESPUÉS el history.
 *     Antes: el historial se pintaba con _appendAssistant antes de que
 *     inlineCatalog estuviera en el widget, por lo que los marcadores
 *     [[CARD:id]] de mensajes viejos se descartaban silenciosamente
 *     (los usuarios veían texto sin cards al refrescar la página).
 *
 * CAMBIOS v1.3.0 → v1.4.0:
 *   - Import unificado: cathoviaCatalogo reemplaza a cathoviaContenidos y
 *     cathoviaEventos (eliminadas del backend v1.2.0)
 *   - Nuevo listener cathovia-load-courses → cathoviaCatalogo(tipo:'curso')
 *     → atributo `courses`
 *   - Listener cathovia-load-events actualizado → cathoviaCatalogo(tipo:'evento')
 *     → atributo `eventos`
 *   - Eliminado listener cathovia-load-content (ya no existe en el widget)
 *   - Nuevo listener cathovia-load-inline → carga contenidos+encuentros para
 *     que el widget pueda renderizar [[CARD:id]] inline en historial
 *   - cathoviaPreguntar ahora devuelve `inlineCatalog`; se pasa al widget
 *     dentro del `response` para que las cards inline se pinten
 *   - Nuevo listener cathovia-inline-action (analítica futura, opcional)
 *   - Nuevos listeners cathovia-course-open y cathovia-event-open del panel
 *     lateral (abren en pestaña nueva desde el widget mismo; aquí solo log)
 *
 * CAMBIOS v1.2.0 → v1.3.0:
 *   - Carga inicial forzada de historial y lista de chats
 *   - Eliminado listener cathovia-new-chat (v1.3.2 hace reset local)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import wixLocation from 'wix-location';
import { currentMember } from 'wix-members-frontend';
import {
  cathoviaAbrir,
  cathoviaPreguntar,
  cathoviaListarChats,
  cathoviaAbrirChat,
  cathoviaBorrarChat,
  cathoviaCatalogo
} from 'backend/cathoviaBackend.web';

// ── CONFIGURACIÓN ──────────────────────────────────────────────────────────
const CURSO_ID_DEFAULT = 'a83606cf-9aca-4ed4-ad89-bc268e03a73b';

const BRAND = {
  name:         'Cathovia',
  sub:          'Veria Humanitas',
  welcome:      'Estoy aquí para acompañarte —en cualquier ámbito de tu vida— desde la mirada y las enseñanzas de la Iglesia Católica. Pregúntame lo que quieras.',
  placeholder:  'Escribe tu pregunta…',
  thinking:     'Buscando la respuesta…'
};

const COLORS = {};

const V = 'Cathovia Page v1.4.6';

// ═══════════════════════════════════════════════════════════════════════════

$w.onReady(async function () {
  console.log(`[${V}] onReady`);
  const el = $w('#egaelConsole');

  // ── Helper robusto para setAttribute ─────────────────────────────────
  const trySetAttr = (name, value, retries = 3) => {
    try {
      el.setAttribute(name, value);
      return true;
    } catch (err) {
      console.warn(`[${V}] setAttribute("${name}") intento fallo:`, err.message);
      if (retries > 0) {
        setTimeout(() => trySetAttr(name, value, retries - 1), 200);
      } else {
        console.error(`[${V}] setAttribute("${name}") ABANDONO tras reintentos`);
      }
      return false;
    }
  };

  // ── Resolver cursoId ──────────────────────────────────────────────────
  const qs = wixLocation.query || {};
  const cursoId = qs.cursoId || CURSO_ID_DEFAULT;
  console.log(`[${V}] cursoId resuelto: ${cursoId}`);

  if (!cursoId || cursoId.indexOf('PONER_') === 0) {
    console.error(`[${V}] CURSO_ID_DEFAULT no configurado. Aborto init.`);
    setTimeout(() => {
      trySetAttr('systemError',
        'No hay cursoId configurado. Edita CURSO_ID_DEFAULT en el Page Code con el _id del proyecto EGAEL de Cathovia.'
      );
    }, 100);
    return;
  }

  // ── Resolver usuario ──────────────────────────────────────────────────
  let userId = '';
  let userName = '';
  try {
    const member = await currentMember.getMember();
    if (member) {
      userId   = member._id || '';
      userName = (member.profile && member.profile.nickname) || member.loginEmail || '';
    }
  } catch (_) { /* anónimo */ }
  console.log(`[${V}] user: ${userId ? userId + ' / ' + userName : 'anónimo'}`);

  // ═════════════════════════════════════════════════════════════════════
  // REGISTRAR LISTENERS **ANTES** DE ENVIAR CONFIG
  // ═════════════════════════════════════════════════════════════════════

  el.on('cathovia-query', async (event) => {
    const { query, sessionId: sId, messageId } = event.detail;
    console.log(`[${V}] cathovia-query "${query.substring(0, 40)}…"`);
    try {
      const result = await cathoviaPreguntar({ cursoId, sessionId: sId, query, userId, userName });
      console.log(`[${V}] cathoviaPreguntar →`, result.ok ? `OK (${(result.respuesta || '').length} chars, inline=${(result.inlineCatalog || []).length})` : `ERR: ${result.error}`);
      trySetAttr('response', JSON.stringify({
        respuesta: result.respuesta || null,
        sessionId: result.sessionId || null,
        inlineCatalog: result.inlineCatalog || [],
        error: result.error || null,
        messageId
      }));
    } catch (err) {
      console.error(`[${V}] cathoviaPreguntar EXCEPTION:`, err);
      trySetAttr('response', JSON.stringify({
        error: 'Error de conexión: ' + err.message,
        messageId
      }));
    }
  });

  el.on('cathovia-open-chat', async (event) => {
    const { sessionId: sId } = event.detail;
    if (!sId) return;
    console.log(`[${V}] cathovia-open-chat ${sId}`);
    try {
      const result = await cathoviaAbrirChat({ sessionId: sId, cursoId });
      if (result.ok) {
        // Refrescar catálogo inline ANTES del history para que los
        // [[CARD:id]] de mensajes viejos encuentren su ítem.
        // Se añade _ts para forzar cambio de JSON y disparar el
        // attributeChangedCallback aunque el catálogo sea idéntico
        // (el browser no dispara callback si el atributo no cambia).
        if (result.inlineCatalog && Array.isArray(result.inlineCatalog)) {
          trySetAttr('inlineCatalog', JSON.stringify({
            _ts: Date.now(),
            items: result.inlineCatalog
          }));
        }
        trySetAttr('history', JSON.stringify({
          _ts: Date.now(),
          sessionId: result.sessionId,
          mensajes: result.mensajes || []
        }));
      }
    } catch (err) {
      console.error(`[${V}] cathoviaAbrirChat EXCEPTION:`, err);
    }
  });

  el.on('cathovia-load-chats', async () => {
    console.log(`[${V}] cathovia-load-chats`);
    try {
      const result = await cathoviaListarChats({ cursoId, userId });
      trySetAttr('chats', JSON.stringify(result.chats || []));
    } catch (err) {
      console.error(`[${V}] cathoviaListarChats EXCEPTION:`, err);
    }
  });

  el.on('cathovia-delete-chat', async (event) => {
    const { sessionId: sId } = event.detail || {};
    if (!sId) return;
    console.log(`[${V}] cathovia-delete-chat ${sId}`);
    try {
      const result = await cathoviaBorrarChat({ sessionId: sId, userId });
      if (!result.ok) {
        console.error(`[${V}] cathoviaBorrarChat ERR: ${result.error}`);
      } else {
        console.log(`[${V}] cathoviaBorrarChat OK deletedMsgs=${result.deletedMsgs || 0}`);
      }
      // Refrescar lista tras el borrado (autoritativo desde el backend)
      const listing = await cathoviaListarChats({ cursoId, userId });
      trySetAttr('chats', JSON.stringify(listing.chats || []));
    } catch (err) {
      console.error(`[${V}] cathoviaBorrarChat EXCEPTION:`, err);
    }
  });

  el.on('cathovia-load-courses', async () => {
    console.log(`[${V}] cathovia-load-courses`);
    try {
      const result = await cathoviaCatalogo({ cursoId, tipo: 'curso' });
      trySetAttr('courses', JSON.stringify(result.items || []));
    } catch (err) {
      console.error(`[${V}] cathoviaCatalogo(curso) EXCEPTION:`, err);
    }
  });

  el.on('cathovia-load-events', async () => {
    console.log(`[${V}] cathovia-load-events`);
    try {
      const result = await cathoviaCatalogo({ cursoId, tipo: 'evento' });
      trySetAttr('eventos', JSON.stringify(result.items || []));
    } catch (err) {
      console.error(`[${V}] cathoviaCatalogo(evento) EXCEPTION:`, err);
    }
  });

  el.on('cathovia-load-inline', async () => {
    console.log(`[${V}] cathovia-load-inline`);
    try {
      const [c, e] = await Promise.all([
        cathoviaCatalogo({ cursoId, tipo: 'contenido' }),
        cathoviaCatalogo({ cursoId, tipo: 'encuentro' })
      ]);
      const inline = [
        ...(c.ok ? (c.items || []) : []),
        ...(e.ok ? (e.items || []) : [])
      ];
      console.log(`[${V}] inlineCatalog: ${inline.length} ítems`);
      trySetAttr('inlineCatalog', JSON.stringify(inline));
    } catch (err) {
      console.error(`[${V}] cathoviaCatalogo(inline) EXCEPTION:`, err);
    }
  });

  el.on('cathovia-inline-action', (event) => {
    const { itemId, type, actionUrl } = event.detail || {};
    console.log(`[${V}] cathovia-inline-action itemId=${itemId} type=${type} url=${actionUrl}`);
    // El widget abre actionUrl en pestaña nueva; aquí solo log/analítica futura.
  });

  el.on('cathovia-course-open', (event) => {
    const { cursoId: cid, actionUrl } = event.detail || {};
    console.log(`[${V}] cathovia-course-open cursoId=${cid} url=${actionUrl}`);
    // El widget abre actionUrl en pestaña nueva.
  });

  el.on('cathovia-event-open', (event) => {
    const { eventoId, actionUrl } = event.detail || {};
    console.log(`[${V}] cathovia-event-open eventoId=${eventoId} url=${actionUrl}`);
    // El widget abre actionUrl en pestaña nueva.
  });

  console.log(`[${V}] listeners registrados`);

  // ═════════════════════════════════════════════════════════════════════
  // ABRIR CONSOLA Y ENVIAR CONFIG
  // ═════════════════════════════════════════════════════════════════════

  let sessionId = null;
  try {
    const abrir = await cathoviaAbrir({ cursoId, userId });
    console.log(`[${V}] cathoviaAbrir →`, abrir);
    if (!abrir.ok) {
      setTimeout(() => trySetAttr('systemError', abrir.error || 'No se pudo abrir la consola.'), 100);
      return;
    }
    sessionId = abrir.sessionId || null;
  } catch (err) {
    console.error(`[${V}] cathoviaAbrir EXCEPTION:`, err);
    setTimeout(() => trySetAttr('systemError', 'Error de conexión: ' + err.message), 100);
    return;
  }

  const configPayload = JSON.stringify({
    cursoId, userId, userName, sessionId,
    brand: BRAND,
    colors: COLORS
  });

  // Carga inicial forzada de estado
  //
  // ORDEN CRÍTICO: catálogos primero (courses, eventos, inlineCatalog),
  // luego history. Si el history se pintara antes de que inlineCatalog
  // esté en el widget, los marcadores [[CARD:id]] de mensajes históricos
  // se descartarían silenciosamente (los usuarios verían texto sin cards
  // al refrescar la página).
  const cargarEstadoInicial = async () => {
    try {
      // 1. Cargar los cuatro catálogos en paralelo
      const [cursos, eventos, contenido, encuentro] = await Promise.all([
        cathoviaCatalogo({ cursoId, tipo: 'curso' }),
        cathoviaCatalogo({ cursoId, tipo: 'evento' }),
        cathoviaCatalogo({ cursoId, tipo: 'contenido' }),
        cathoviaCatalogo({ cursoId, tipo: 'encuentro' })
      ]);
      trySetAttr('courses', JSON.stringify(cursos.items || []));
      trySetAttr('eventos', JSON.stringify(eventos.items || []));
      trySetAttr('inlineCatalog', JSON.stringify({
        _ts: Date.now(),
        items: [
          ...(contenido.items || []),
          ...(encuentro.items || [])
        ]
      }));

      // 2. Chats + history DESPUÉS (para que _appendAssistant tenga catálogo)
      const chats = await cathoviaListarChats({ cursoId, userId });
      trySetAttr('chats', JSON.stringify(chats.chats || []));
      if (sessionId) {
        const history = await cathoviaAbrirChat({ sessionId, cursoId });
        if (history.ok) {
          trySetAttr('history', JSON.stringify({
            _ts: Date.now(),
            sessionId: history.sessionId || sessionId,
            mensajes: history.mensajes || []
          }));
        }
      }
    } catch (err) {
      console.error(`[${V}] cargarEstadoInicial EXCEPTION:`, err);
    }
  };

  setTimeout(() => {
    console.log(`[${V}] enviando config al custom element`);
    trySetAttr('config', configPayload);
    setTimeout(cargarEstadoInicial, 400);
  }, 150);
});