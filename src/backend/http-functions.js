/* ═══════════════════════════════════════════════════════════════════════════
 * SABIO VALLEY — HTTP Functions
 * Archivo:  backend/http-functions.js
 * VERSION:  1.2.0
 * FECHA:    16 Julio 2026
 *
 * CAMBIOS v1.1.1 → v1.2.0 — LIMPIEZA DEL TEST SSE:
 *   Eliminado get_ssePing. Era un test de medición temporal, no producción.
 *
 *   QUÉ MIDIÓ (conclusiones que quedan documentadas aquí para que nadie
 *   vuelva a intentarlo):
 *
 *   1. El código backend de Velo NO se corta a los 14s. Site Monitoring
 *      registró chunk 15 @ 14039ms … chunk 30 @ 29077ms, FIN @ 29077ms,
 *      sin cancelación del runtime. El backend sigue ejecutándose y
 *      completando su trabajo (por eso _saveMessages guarda la respuesta
 *      aunque el cliente reciba 504).
 *
 *   2. Lo que se corta a los ~14s es la CONEXIÓN al cliente. Aplica por
 *      igual a webMethods y a http-functions. NO hay ruta rápida por
 *      infraestructura dentro de Wix.
 *
 *   3. STREAMING SSE ES IMPOSIBLE EN VELO. wix-http-functions no acepta
 *      streams: ni ReadableStream (web) ni stream.Readable (Node).
 *      · Devolver {status, headers, body:ReadableStream} → 500 @ 565ms.
 *      · Devolver ok({body: Readable}) → el helper serializa el objeto
 *        con JSON.stringify y cierra a los 437ms. El cliente recibe la
 *        estructura interna del stream (_readableState, buffers en bytes
 *        crudos, pipes:[]), no los datos.
 *      El modelo de wix-http-functions es petición → respuesta completa
 *      materializada. No hay entrega progresiva posible.
 *
 *   NO REINTENTAR SSE EN WIX. Está medido, no supuesto.
 *
 * CAMBIOS v1.0.0 → v1.1.0/v1.1.1:
 *   - Añadido y luego reescrito get_ssePing (test, ya eliminado).
 *
 * Expone endpoints HTTP públicos para el sitio sabiovalley.com.
 * El widget del navegador puede llamarlos directamente con fetch(),
 * evitando el paso por Page Code (que trunca setAttribute con payloads
 * grandes).
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { ok, badRequest, serverError } from 'wix-http-functions';
import { egaelSynthesize } from 'backend/egaelTTS.web';
import { askCathoviaCore } from 'backend/cathoviaBackend.web';

/**
 * POST /_functions/egaelTts
 * Body: { texto, cursoId, voiceName?, speakingRate?, pitch? }
 * Respuesta: { ok, audioContent, mimeType, voice, timeMs, error? }
 *
 * NOTA: este endpoint también sufre el techo de 14s. Site Monitoring
 * reporta P95 16954ms y 5.9% de error — el TTS revienta el timeout por
 * la misma razón que Cathovia cuando el texto es largo.
 */
export async function post_egaelTts(request) {
  try {
    const body = await request.body.json();
    const { texto, cursoId, voiceName, speakingRate, pitch } = body || {};

    if (!texto) {
      return badRequest({
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'texto requerido' })
      });
    }

    const result = await egaelSynthesize({ texto, cursoId, voiceName, speakingRate, pitch });

    return ok({
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result)
    });
  } catch (err) {
    console.error('post_egaelTts EXCEPTION:', err);
    return serverError({
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: err.message || 'error interno' })
    });
  }
}

/**
 * POST /_functions/cathoviaAsk
 * Body: { cursoId, sessionId, query, userId, userName }
 * Respuesta: { ok, respuesta, sessionId, inlineCatalog, error? }
 *
 * Ruta principal desde el widget para Cathovia. Sustituye la ruta anterior
 * (widget → cathovia-query → cathoviaPage → cathoviaPreguntar webMethod).
 *
 * CORRECCIÓN v1.2.0: el comentario original afirmaba que http-functions.js
 * tiene ~5 min de timeout. Es FALSO y esa suposición no verificada costó el
 * ciclo v1.5.2/v1.6.1 entero. Wix corta la conexión al cliente a los ~14s
 * aquí igual que en cualquier webMethod. Cuando askCathoviaCore tarda más,
 * el cliente recibe 504 pero el backend termina y guarda la respuesta en
 * EgaelMessages.
 */
export async function post_cathoviaAsk(request) {
  try {
    const body = await request.body.json();
    const { cursoId, sessionId, query, userId, userName } = body || {};

    if (!cursoId) {
      return badRequest({
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'cursoId requerido' })
      });
    }
    if (!query) {
      return badRequest({
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'query requerida' })
      });
    }

    const result = await askCathoviaCore({ cursoId, sessionId, query, userId, userName });

    return ok({
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result)
    });
  } catch (err) {
    console.error('post_cathoviaAsk EXCEPTION:', err);
    return serverError({
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: err.message || 'error interno' })
    });
  }
}