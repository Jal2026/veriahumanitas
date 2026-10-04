/* ═══════════════════════════════════════════════════════════════════════════
 * VERIA HUMANITAS — CATHOVIA · Page Code del Analizador
 * Página:   Analizador Cathovia
 * VERSION:  1.0.0
 * FECHA:    4 Octubre 2026
 *
 * Puente entre el widget (HtmlComponent, postMessage) y
 * backend/cathoviaAnalytics.web.js v1.2.0. Sin lógica propia.
 * Mismo patrón que el Gestor del corpus (GestorCorpus_page.js v1.0.4).
 *
 * ⚠️ ACCESO: roles de miembro de Wix en los permisos de la página.
 *
 * ⚠️ generarLecturaClima puede superar los ~14 s en que Wix corta la
 *    conexión. Entonces llega aquí como excepción y se reenvía como error;
 *    el backend termina igualmente y el widget recoge la lectura con
 *    'readingGet'.
 *
 * ⛔ ORDEN DE DESPLIEGUE: colecciones CathoviaStats y
 *    CathoviaInterpretaciones → backend (core, clima, web, jobs.config) →
 *    este page code → el widget.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
  cargarAnalizador,
  leerPeriodo,
  recalcularDia,
  recalcularCorpus,
  leerClima,
  generarLecturaClima,
  leerLecturaClima,
  procesarClimaLote
} from 'backend/cathoviaAnalytics.web';

const EL_ID = '#htmlAnalizador';   // ← debe coincidir con el Element ID en el editor
const TAG = '[PageCode_Analizador][1.0.0]';

$w.onReady(function () {
  console.log(`${TAG} onReady`);

  const el = $w(EL_ID);
  // $w('#id-inexistente') no lanza error: devuelve un selector sin onMessage.
  if (!el || typeof el.onMessage !== 'function') {
    console.error(`${TAG} No existe ${EL_ID}. Revisa el Element ID del HtmlComponent en el editor.`);
    return;
  }

  el.onMessage(async (event) => {
    const msg = event.data;
    if (!msg || !msg.type) return;

    // reqId viaja de vuelta: el widget lo usa para emparejar respuestas.
    const send = (type, payload) => el.postMessage({ type, reqId: msg.reqId, payload });

    console.log(`${TAG} mensaje: ${msg.type}`);

    try {
      if (msg.type === 'ready') {
        return send('init', await cargarAnalizador());
      }
      if (msg.type === 'period') {
        return send('periodRead', await leerPeriodo({ desde: msg.desde, hasta: msg.hasta }));
      }
      if (msg.type === 'clima') {
        return send('climaRead', await leerClima({ desde: msg.desde, hasta: msg.hasta }));
      }
      if (msg.type === 'recalcDay') {
        return send('dayRecalculated', await recalcularDia({ dia: msg.dia }));
      }
      if (msg.type === 'recalcCorpus') {
        return send('corpusRecalculated', await recalcularCorpus());
      }
      if (msg.type === 'reading') {
        return send('readingDone', await generarLecturaClima({ desde: msg.desde, hasta: msg.hasta }));
      }
      if (msg.type === 'climaBatch') {
        return send('climaBatchDone', await procesarClimaLote({ max: msg.max }));
      }
      if (msg.type === 'readingGet') {
        return send('readingRead', await leerLecturaClima({ desde: msg.desde, hasta: msg.hasta }));
      }

      console.warn(`${TAG} mensaje no reconocido: ${msg.type}`);

    } catch (e) {
      console.error(`${TAG} EXCEPTION en ${msg.type}:`, e);
      send('error', { ok: false, error: e.message || 'Error técnico.', conexion: true });
    }
  });

  el.postMessage({ type: 'pageReady' });
});
