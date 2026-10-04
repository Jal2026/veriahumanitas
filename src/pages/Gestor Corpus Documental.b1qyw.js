/* ═══════════════════════════════════════════════════════════════════════════
 * VERIA HUMANITAS — CATHOVIA · Page Code del Gestor del corpus
 * Página:   Gestor Corpus Cathovia
 * VERSION:  1.0.2
 *
 * CAMBIOS v1.0.1 → v1.0.2: tras registrar onMessage se envía 'pageReady' al
 * widget, para que arranque aunque su primer 'ready' se perdiera.
 * FECHA:    4 Octubre 2026
 *
 * Puente entre el widget (HtmlComponent, postMessage) y
 * backend/cathoviaCorpus.web.js. Sin lógica propia.
 *
 * ⚠️ ACCESO: roles de miembro de Wix en los permisos de la página.
 *
 * ⛔ ORDEN DE DESPLIEGUE: cathoviaBackend v1.6.4 → cathoviaCorpus →
 *    este page code → el widget.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
  cargarGestorCorpus,
  crearCategoria,
  listarCorpus,
  leerDocumentoCorpus,
  guardarDocumentoCorpus,
  activarDocumentoCorpus,
  eliminarDocumentoCorpus,
  buscarDuplicados,
  crearDocumentoCorpus
} from 'backend/cathoviaCorpus.web';

const EL_ID = '#htmlGestorCorpus';   // ← debe coincidir con el Element ID en el editor
const TAG = '[PageCode_GestorCorpus][1.0.2]';

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

    // reqId viaja de vuelta: el widget lo usa para emparejar respuestas
    // (la ingesta por lotes lanza varias peticiones seguidas).
    const send = (type, payload) => el.postMessage({ type, reqId: msg.reqId, payload });

    console.log(`${TAG} mensaje: ${msg.type}`);

    try {
      if (msg.type === 'ready') {
        return send('init', await cargarGestorCorpus());
      }
      if (msg.type === 'createCategory') {
        return send('categoryCreated', await crearCategoria({ nombre: msg.nombre }));
      }
      if (msg.type === 'list') {
        return send('listed', await listarCorpus({
          texto: msg.texto,
          categoria: msg.categoria,
          estado: msg.estado,
          pagina: msg.pagina
        }));
      }
      if (msg.type === 'read') {
        return send('docRead', await leerDocumentoCorpus({ id: msg.id }));
      }
      if (msg.type === 'save') {
        return send('docSaved', await guardarDocumentoCorpus({
          id: msg.id,
          titulo: msg.titulo,
          category: msg.category,
          categorySecondary: msg.categorySecondary,
          content: msg.content
        }));
      }
      if (msg.type === 'toggle') {
        return send('docToggled', await activarDocumentoCorpus({ id: msg.id, activo: msg.activo }));
      }
      if (msg.type === 'delete') {
        return send('docDeleted', await eliminarDocumentoCorpus({ id: msg.id }));
      }
      if (msg.type === 'checkDup') {
        return send('dupChecked', await buscarDuplicados({ titulo: msg.titulo }));
      }
      if (msg.type === 'create') {
        return send('docCreated', await crearDocumentoCorpus({
          titulo: msg.titulo,
          category: msg.category,
          categorySecondary: msg.categorySecondary,
          content: msg.content,
          fileType: msg.fileType
        }));
      }

      console.warn(`${TAG} mensaje no reconocido: ${msg.type}`);

    } catch (e) {
      console.error(`${TAG} EXCEPTION en ${msg.type}:`, e);
      send('error', { ok: false, error: e.message || 'Error técnico.' });
    }
  });

  el.postMessage({ type: 'pageReady' });
});
