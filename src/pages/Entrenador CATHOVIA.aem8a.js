/* ═══════════════════════════════════════════════════════════════════════════
 * VERIA HUMANITAS — CATHOVIA · Page Code del Entrenador
 * Página:   Entrenador Cathovia
 * VERSION:  1.0.1
 * FECHA:    4 Octubre 2026
 *
 * CAMBIOS v1.0.0 → v1.0.1: solo comentarios de acceso. El backend v1.0.1 ya
 * no usa CathoviaAdmins. Sin cambios de lógica.
 *
 * Port del page code del Entrenador CENTRI v1.0.0.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * PATRÓN EGAEL: PUENTE, SIN LÓGICA PROPIA
 * ───────────────────────────────────────────────────────────────────────────
 * Solo enruta mensajes entre el widget y el backend. El criterio vive en
 * cathoviaEntrenador.web.js.
 *
 * El Entrenador es un HtmlComponent (iframe) y habla por postMessage.
 * La consola Cathovia es un custom element. No mezclar los patrones.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ⚠️ ACCESO
 * ───────────────────────────────────────────────────────────────────────────
 * El acceso a la página lo deciden los roles de miembro de Wix. En el backend,
 * _exigirAdmin() exige sesión de miembro y, si ROL_AUTORIZADO tiene valor en
 * cathoviaEntrenador.web.js, ese rol.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * CAMBIOS RESPECTO A CENTRI v1.0.0
 * ───────────────────────────────────────────────────────────────────────────
 *   1. Sin planos: no se reenvía `modo`.
 *   2. Imports de backend/cathoviaEntrenador.web.
 *   3. Comprobación de que el Element ID existe: $w('#id-inexistente') no
 *      lanza error, devuelve un selector sin onMessage (lección del Hall de
 *      CENTRI). Ahora se avisa en consola con el motivo real.
 *
 * ⛔ ORDEN DE DESPLIEGUE: cathoviaEntrenador → este page code → el widget.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import {
  cargarConfigEntrenador,
  guardarAlignment,
  publicarAlignment,
  testCathovia,
  generarPromptCathovia,
  crearDocumento,
  leerDocumento,
  actualizarDocumento,
  toggleDocumento,
  eliminarDocumento
} from 'backend/cathoviaEntrenador.web';

const EL_ID = '#htmlEntrenadorCathovia';   // ← debe coincidir con el Element ID en el editor
const TAG = '[PageCode_Entrenador_Cathovia][1.0.1]';

$w.onReady(function () {
  console.log(`${TAG} onReady`);

  const el = $w(EL_ID);
  if (!el || typeof el.onMessage !== 'function') {
    console.error(`${TAG} No existe ${EL_ID}. Revisa el Element ID del HtmlComponent en el editor.`);
    return;
  }

  el.onMessage(async (event) => {
    const msg = event.data;
    if (!msg || !msg.type) return;

    const send = (type, data) => el.postMessage(Object.assign({ type }, data));

    console.log(`${TAG} mensaje: ${msg.type}`);

    try {
      if (msg.type === 'ready') {
        const res = await cargarConfigEntrenador();
        return send('configLoaded', { payload: res });
      }

      if (msg.type === 'saveConfig') {
        const res = await guardarAlignment({ config: msg.config });
        return send('configSaved', { payload: res });
      }

      if (msg.type === 'publishConfig') {
        const res = await publicarAlignment({ alignmentId: msg.alignmentId });
        return send('configPublished', { payload: res });
      }

      if (msg.type === 'testPrompt') {
        const res = await testCathovia({
          message: msg.message,
          configOverride: msg.configOverride
        });
        return send('testResult', { payload: res });
      }

      if (msg.type === 'generatePrompt') {
        const res = await generarPromptCathovia({ descripcion: msg.descripcion });
        return send('promptGenerated', { payload: res });
      }

      // ── Documentos ──
      if (msg.type === 'createDocument') {
        const res = await crearDocumento({
          titulo: msg.titulo,
          tipo: msg.tipo,
          contenido: msg.contenido,
          resumen: msg.resumen
        });
        return send('documentCreated', { payload: res });
      }

      if (msg.type === 'readDocument') {
        const res = await leerDocumento({ documentoId: msg.documentoId });
        return send('documentRead', { payload: res });
      }

      if (msg.type === 'updateDocument') {
        const res = await actualizarDocumento({
          documentoId: msg.documentoId,
          titulo: msg.titulo,
          tipo: msg.tipo,
          contenido: msg.contenido,
          resumen: msg.resumen
        });
        return send('documentUpdated', { payload: res });
      }

      if (msg.type === 'toggleDocument') {
        const res = await toggleDocumento({
          documentoId: msg.documentoId,
          activo: msg.activo
        });
        return send('documentToggled', { payload: res });
      }

      if (msg.type === 'deleteDocument') {
        const res = await eliminarDocumento({ documentoId: msg.documentoId });
        // documentoId viaja de vuelta: el widget lo necesita para quitar la fila.
        return send('documentDeleted', { payload: res, documentoId: msg.documentoId });
      }

      if (msg.type === 'resize') return;   // lo gestiona el propio widget

      console.warn(`${TAG} mensaje no reconocido: ${msg.type}`);

    } catch (e) {
      console.error(`${TAG} EXCEPTION en ${msg.type}:`, e);
      send('error', { payload: { error: e.message || 'Error técnico.' } });
    }
  });
});
