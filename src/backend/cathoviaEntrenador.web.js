/* ═══════════════════════════════════════════════════════════════════════════
 * VERIA HUMANITAS — CATHOVIA · Entrenador (backend)
 * Archivo:  backend/cathoviaEntrenador.web.js
 * VERSION:  1.0.0
 * FECHA:    4 Octubre 2026
 *
 * ───────────────────────────────────────────────────────────────────────────
 * PROCEDENCIA
 * ───────────────────────────────────────────────────────────────────────────
 * Port de centriEntrenador.web.js v1.0.0 (CENTRI · Centrimerca).
 *
 * ───────────────────────────────────────────────────────────────────────────
 * QUÉ ES
 * ───────────────────────────────────────────────────────────────────────────
 * La superficie de gobierno de Cathovia: identidad, tono, guardrails,
 * instrucciones, saludo de pantalla y documentos fijos, sin abrir el CMS.
 *
 * Escribe en las MISMAS colecciones que lee cathoviaBackend.web.js:
 *   - EgaelAlignment  → filas del proyecto CURSO_ID (borrador / publicado / archivado)
 *   - EgaelResources  → documentos fijos del proyecto CURSO_ID
 * CathoviaKnowledge (corpus RAG) NO se gestiona desde aquí.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ⚠️ SEGURIDAD
 * ───────────────────────────────────────────────────────────────────────────
 * Todos los métodos pasan por _exigirAdmin(). Los permisos de página no
 * protegen un webMethod.
 *
 * ⚠️ REQUIERE LA COLECCIÓN CathoviaAdmins, con los ID de campo
 *    `email` (texto), `memberId` (texto) y `activo` (booleano).
 *    Basta con rellenar `email` con el correo de acceso al sitio.
 *
 * ⚠️ FALLA CERRADO: si la colección no existe o está vacía, NADIE entra.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * QUÉ CAMBIA RESPECTO A centriEntrenador v1.0.0
 * ───────────────────────────────────────────────────────────────────────────
 *   1. SIN PLANOS. Cathovia tiene un único alignment por proyecto
 *      (cursoRef = CURSO_ID).
 *   2. Campos de EgaelAlignment: estado, fechaPublicacion, tono, nivelDetalle,
 *      instruccionesExtra, grSinAsesoria, grCitarFuentes, grDisclaimer,
 *      grAnonimizar, welcomeTitle, welcomeText, placeholder.
 *   3. Corpus = EgaelResources (title, tipo, contenido, resumen, cursoRef,
 *      idioma, activo, orden, fechaCreacion). Todas las operaciones verifican
 *      que el documento pertenece a CURSO_ID: no se tocan recursos de otros
 *      proyectos que comparten la colección.
 *   4. GUARDAR = READ-MERGE. EgaelAlignment tiene campos que el entrenador no
 *      edita (idiomaSalida, imageReference, rulesIndex, rulesQuiz,
 *      rulesContent…). Un borrador nuevo parte de una copia de la publicada,
 *      así al publicar no se pierde nada.
 *   5. PUBLICAR: primero se publica la nueva y DESPUÉS se archivan las
 *      anteriores. Al revés habría un instante sin fila publicada y la
 *      consola caería a la identidad por defecto.
 *   6. PRESUPUESTO: un único tope, espejo de MAX_DOC_CHARS de
 *      cathoviaBackend.web.js. Se envía al widget en cada carga.
 *   7. PRUEBA: reproduce los bloques de identidad, tono, guardrails,
 *      instrucciones y documentos de _buildSystemBlocks de cathoviaBackend,
 *      con los mismos textos y el mismo recorte. NO incluye el catálogo de
 *      tarjetas ni el corpus doctrinal (RAG). Para eso, la consola.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { webMethod, Permissions } from 'wix-web-module';
import { fetch } from 'wix-fetch';
import wixData from 'wix-data';
import { getSecret } from 'wix-secrets-backend';
import { currentMember } from 'wix-members-backend';

const VERSION = '1.0.0';
const TAG = `[CathoviaEntrenador][${VERSION}]`;
const AUTH = { suppressAuth: true };

const C_ALIGNMENT = 'EgaelAlignment';
const C_RESOURCES = 'EgaelResources';
const C_ADMINS    = 'CathoviaAdmins';

// ⚠️ ESPEJO de CURSO_ID_DEFAULT en el page code de la consola (Cathovia.evk47.js).
// Si allí cambia, aquí también.
const CURSO_ID = 'a83606cf-9aca-4ed4-ad89-bc268e03a73b';

const SECRET_API = 'EGAEL_API_KEY';
const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS_TEST = 700;      // espejo de MAX_TOKENS en cathoviaBackend

// ⚠️ ESPEJO de MAX_DOC_CHARS en cathoviaBackend.web.js. Si allí cambia, aquí
// también: si no, el medidor del widget mentirá.
const MAX_DOC_CHARS = 8000;

const TONOS_VALIDOS = ['formal', 'pedagógico', 'técnico'];
const TONO_DEFECTO  = 'pedagógico';

// Campos de sistema que no se copian al crear un borrador desde la publicada.
const CAMPOS_SISTEMA = ['_id', '_createdDate', '_updatedDate', '_owner'];

// ═══════════════════════════════════════════════════════════════════════════
// CONTROL DE ACCESO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Comprueba que quien llama está autorizado y activo en CathoviaAdmins.
 * Autoriza por email de acceso o por memberId.
 *
 * ⚠️ FALLA CERRADO. Sin sesión, sin colección, sin fila o con error de
 * lectura → NO autorizado.
 */
async function _exigirAdmin() {
  let memberId = '';
  let email = '';

  try {
    // ⚠️ getMember() sin opciones no trae loginEmail. Hay que pedir FULL.
    let member = null;
    try {
      member = await currentMember.getMember({ fieldsets: ['FULL'] });
    } catch (eFull) {
      console.warn(`${TAG} fieldset FULL no disponible, se usa el reducido:`, eFull.message);
      member = await currentMember.getMember();
    }

    memberId = (member && member._id) || '';

    let bruto = (member && member.loginEmail) || '';
    if (!bruto && member && member.contactDetails) {
      const cd = member.contactDetails;
      if (Array.isArray(cd.emails) && cd.emails.length > 0) {
        bruto = typeof cd.emails[0] === 'string' ? cd.emails[0] : (cd.emails[0].email || '');
      }
    }
    email = String(bruto || '').trim().toLowerCase();

  } catch (e) {
    console.warn(`${TAG} sin sesión de miembro:`, e.message);
    return { ok: false, error: 'Necesitas iniciar sesión.' };
  }

  if (!memberId && !email) {
    return { ok: false, error: 'Necesitas iniciar sesión.' };
  }

  try {
    // Comparación en memoria: el CMS puede guardar el correo con mayúsculas o
    // espacios y un .eq() literal no casaría.
    const res = await wixData.query(C_ADMINS)
      .eq('activo', true)
      .limit(200)
      .find(AUTH);

    const filas = res.items || [];

    const autorizado = filas.some(f => {
      const fEmail = String(f.email || '').trim().toLowerCase();
      const fId    = String(f.memberId || '').trim();
      if (email && fEmail && fEmail === email) return true;
      if (memberId && fId && fId === memberId) return true;
      return false;
    });

    if (!autorizado) {
      console.warn(`${TAG} acceso DENEGADO al entrenador: email=${email || '—'} memberId=${memberId || '—'} (${filas.length} filas activas en ${C_ADMINS})`);
      return { ok: false, error: 'No tienes acceso al entrenador de Cathovia.' };
    }

    return { ok: true, memberId, email };

  } catch (e) {
    console.error(`${TAG} no se pudo comprobar ${C_ADMINS} — se deniega el acceso:`, e.message);
    return { ok: false, error: 'No se pudo verificar el acceso.' };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function _tono(v) {
  const s = String(v || '').trim();
  return TONOS_VALIDOS.indexOf(s) >= 0 ? s : TONO_DEFECTO;
}

function _docLigero(d) {
  return {
    id: d._id,
    titulo: d.title || '',
    tipo: d.tipo || '',
    resumen: d.resumen || '',
    activo: d.activo === true,
    orden: Number(d.orden) || 0,
    chars: (d.contenido || '').length
  };
}

/** Lee un recurso y comprueba que pertenece al proyecto de Cathovia. */
async function _getRecursoPropio(documentoId) {
  const d = await wixData.get(C_RESOURCES, documentoId, AUTH);
  if (!d) return { ok: false, error: 'Documento no encontrado.' };
  if (d.cursoRef !== CURSO_ID) {
    console.warn(`${TAG} documento ${documentoId} no pertenece a ${CURSO_ID} (cursoRef=${d.cursoRef || '—'})`);
    return { ok: false, error: 'Ese documento no pertenece a Cathovia.' };
  }
  return { ok: true, doc: d };
}

async function _getBorrador() {
  const res = await wixData.query(C_ALIGNMENT)
    .eq('cursoRef', CURSO_ID)
    .eq('estado', 'borrador')
    .descending('_updatedDate')
    .limit(1)
    .find(AUTH);
  return (res.items && res.items[0]) || null;
}

async function _getPublicada() {
  // Misma consulta que _getAlignmentConfig() de cathoviaBackend.
  const res = await wixData.query(C_ALIGNMENT)
    .eq('cursoRef', CURSO_ID)
    .eq('estado', 'publicado')
    .descending('fechaPublicacion')
    .limit(1)
    .find(AUTH);
  return (res.items && res.items[0]) || null;
}

// ═══════════════════════════════════════════════════════════════════════════
// LLAMADA AL MODELO (solo para probar y para generar prompts)
// ═══════════════════════════════════════════════════════════════════════════

async function _callModelo(systemPrompt, userMessage, maxTokens) {
  const apiKey = await getSecret(SECRET_API);
  if (!apiKey) throw new Error(`Falta el secret ${SECRET_API}.`);

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens || 800,
      system: systemPrompt,
      messages: [{ role: 'user', content: String(userMessage) }]
    })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data && data.error ? data.error.message : `HTTP ${res.status}`);

  return (data.content || [])
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n')
    .trim();
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. CARGAR — alignment + documentos
// ═══════════════════════════════════════════════════════════════════════════

export const cargarConfigEntrenador = webMethod(
  Permissions.SiteMember,
  async () => {
    const admin = await _exigirAdmin();
    if (!admin.ok) return { ok: false, error: admin.error };

    try {
      console.log(`${TAG} cargarConfigEntrenador cursoRef=${CURSO_ID}`);

      const [borrador, publicada, docsRes] = await Promise.all([
        _getBorrador(),
        _getPublicada(),
        wixData.query(C_RESOURCES).eq('cursoRef', CURSO_ID).ascending('orden').limit(300).find(AUTH)
      ]);

      // ⚠️ NO se devuelve `contenido`. Para editar uno se pide con leerDocumento().
      const documentos = (docsRes.items || []).map(_docLigero);

      const activos = documentos.filter(d => d.activo);
      const consumo = {
        documentos: activos.length,
        chars: activos.reduce((n, d) => n + d.chars, 0)
      };

      return {
        ok: true,
        borrador,
        publicada,
        documentos,
        consumo,
        tope: MAX_DOC_CHARS,
        documentosActivos: activos.length
      };

    } catch (e) {
      console.error(`${TAG} cargarConfigEntrenador error:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 2. GUARDAR BORRADOR
// ═══════════════════════════════════════════════════════════════════════════

export const guardarAlignment = webMethod(
  Permissions.SiteMember,
  async ({ config }) => {
    const admin = await _exigirAdmin();
    if (!admin.ok) return { ok: false, error: admin.error };

    try {
      if (!config) return { ok: false, error: 'config requerido' };
      console.log(`${TAG} guardarAlignment cursoRef=${CURSO_ID}`);

      const existente = await _getBorrador();

      // READ-MERGE: se parte del borrador existente o, si no lo hay, de una
      // copia de la publicada. Así se conservan los campos que el entrenador
      // no edita (idiomaSalida, imageReference, rules*, etc.).
      let base = {};
      if (existente) {
        base = { ...existente };
      } else {
        const publicada = await _getPublicada();
        if (publicada) {
          base = { ...publicada };
          for (const k of CAMPOS_SISTEMA) delete base[k];
        }
      }

      const registro = {
        ...base,
        cursoRef: CURSO_ID,
        // IDENTIDAD (promptBase) y COMPORTAMIENTO (instruccionesExtra) no se
        // mezclan. Los datos masivos van a los documentos.
        promptBase: config.promptBase || '',
        instruccionesExtra: config.instruccionesExtra || '',
        tono: _tono(config.tono),
        nivelDetalle: config.nivelDetalle || 'medio',
        grSinAsesoria:  config.grSinAsesoria  === true,
        grCitarFuentes: config.grCitarFuentes === true,
        grDisclaimer:   config.grDisclaimer   === true,
        grAnonimizar:   config.grAnonimizar   === true,
        welcomeTitle: config.welcomeTitle || '',
        welcomeText:  config.welcomeText  || '',
        placeholder:  config.placeholder  || '',
        estado: 'borrador',
        title: 'Borrador'
      };

      let saved;
      if (existente) {
        registro._id = existente._id;
        saved = await wixData.update(C_ALIGNMENT, registro, AUTH);
      } else {
        saved = await wixData.insert(C_ALIGNMENT, registro, AUTH);
      }

      return { ok: true, alignmentId: saved._id, version: registro.version || '' };

    } catch (e) {
      console.error(`${TAG} guardarAlignment error:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 3. PUBLICAR
// ═══════════════════════════════════════════════════════════════════════════

export const publicarAlignment = webMethod(
  Permissions.SiteMember,
  async ({ alignmentId }) => {
    const admin = await _exigirAdmin();
    if (!admin.ok) return { ok: false, error: admin.error };

    try {
      if (!alignmentId) return { ok: false, error: 'alignmentId requerido' };

      const item = await wixData.get(C_ALIGNMENT, alignmentId, AUTH);
      if (!item) return { ok: false, error: 'Configuración no encontrada.' };
      if (item.cursoRef !== CURSO_ID) return { ok: false, error: 'Esa configuración no pertenece a Cathovia.' };

      console.log(`${TAG} publicarAlignment id=${alignmentId}`);

      // Versión máxima del proyecto, comparada COMO NÚMERO.
      const todas = await wixData.query(C_ALIGNMENT)
        .eq('cursoRef', CURSO_ID)
        .limit(200)
        .find(AUTH);

      let maxVersion = 1.0;
      for (const a of (todas.items || [])) {
        const v = parseFloat(a.version);
        if (!isNaN(v) && v > maxVersion) maxVersion = v;
      }

      const nuevaVersion = (Math.round((maxVersion + 0.1) * 10) / 10).toFixed(1);

      item.estado = 'publicado';
      item.fechaPublicacion = new Date();
      item.version = nuevaVersion;
      item.title = `Config v${nuevaVersion}`;

      // ⚠️ PRIMERO se publica la nueva, DESPUÉS se archivan las anteriores.
      await wixData.update(C_ALIGNMENT, item, AUTH);

      const anteriores = (todas.items || []).filter(a => a.estado === 'publicado' && a._id !== alignmentId);
      for (const ant of anteriores) {
        ant.estado = 'archivado';
        await wixData.update(C_ALIGNMENT, ant, AUTH);
      }

      console.log(`${TAG} publicado v${nuevaVersion} · archivadas=${anteriores.length}`);
      return {
        ok: true,
        version: nuevaVersion,
        fechaPublicacion: item.fechaPublicacion,
        archivadas: anteriores.length
      };

    } catch (e) {
      console.error(`${TAG} publicarAlignment error:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 4. PROBAR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Prueba una respuesta con la configuración en pantalla, SIN publicarla.
 *
 * ⚠️ Reproduce de _buildSystemBlocks (cathoviaBackend v1.6.3) los bloques de
 * identidad, tono, guardrails, instrucciones y documentos fijos, con los
 * mismos textos y el mismo recorte por MAX_DOC_CHARS. NO incluye el catálogo
 * de tarjetas ni el corpus doctrinal (RAG), ni el historial.
 */
export const testCathovia = webMethod(
  Permissions.SiteMember,
  async ({ message, configOverride }) => {
    const admin = await _exigirAdmin();
    if (!admin.ok) return { ok: false, error: admin.error };

    const startMs = Date.now();
    try {
      if (!message) return { ok: false, error: 'message requerido' };

      const config = configOverride || await _getPublicada();
      if (!config) return { ok: false, error: 'No hay configuración. Guarda una primero.' };

      const docsRes = await wixData.query(C_RESOURCES)
        .eq('cursoRef', CURSO_ID)
        .eq('activo', true)
        .ascending('orden')
        .limit(300)
        .find(AUTH);
      const resources = docsRes.items || [];

      const parts = [];

      // ── IDENTIDAD ──
      if (config.promptBase) {
        parts.push(config.promptBase);
      } else {
        parts.push('Eres Cathovia, la consola de acompañamiento con inteligencia artificial de Veria Humanitas. Acompañas al usuario en cualquier ámbito de la vida desde la mirada y las enseñanzas de la Iglesia Católica. Hablas en español con calidez y claridad.');
      }

      // ── TONO ──
      if (config.tono) {
        const tones = {
          'formal':      'TONO: Formal y profesional.',
          'pedagógico':  'TONO: Pedagógico, accesible, con ejemplos cuando sea útil.',
          'técnico':     'TONO: Técnico, con terminología especializada consolidada.'
        };
        if (tones[config.tono]) parts.push(tones[config.tono]);
      }

      // ── GUARDRAILS + INSTRUCCIONES ADICIONALES ──
      const guardrails = [];
      if (config.grSinAsesoria) guardrails.push('No des asesoramiento profesional directo. Recomienda consultar con un profesional cualificado.');
      if (config.grCitarFuentes) guardrails.push('Cuando uses información de los documentos, menciona la fuente.');
      if (config.grDisclaimer) guardrails.push('Incluye disclaimer breve en temas sensibles.');
      if (config.grAnonimizar) guardrails.push('No compartas datos personales que aparezcan en los documentos.');
      if (guardrails.length > 0) parts.push('--- GUARDRAILS ---\n' + guardrails.join('\n'));
      if (config.instruccionesExtra) parts.push('--- INSTRUCCIONES ADICIONALES ---\n' + config.instruccionesExtra);

      // ── DOCUMENTOS FIJOS — mismo recorte que cathoviaBackend ──
      let charsEnviados = 0;
      let charsTotales = 0;
      if (resources.length > 0) {
        const resourceBlocks = ['--- DOCUMENTOS DE REFERENCIA ---'];
        resourceBlocks.push('Usa la siguiente información como base. Intégrala de forma natural, no la cites textualmente:');
        let totalChars = 0;
        let cortado = false;
        for (let i = 0; i < resources.length; i++) {
          const r = resources[i];
          const content = r.contenido || '';
          charsTotales += content.length;
          if (cortado) continue;
          if (totalChars + content.length > MAX_DOC_CHARS) {
            const remaining = MAX_DOC_CHARS - totalChars;
            if (remaining > 200) {
              resourceBlocks.push('[' + (r.title || 'Doc') + ']\n' + content.substring(0, remaining) + '…');
              totalChars += remaining;
            }
            cortado = true;
            continue;
          }
          resourceBlocks.push('[' + (r.title || 'Doc') + ']\n' + content);
          totalChars += content.length;
        }
        charsEnviados = totalChars;
        parts.push(resourceBlocks.join('\n\n'));
      }

      const systemPrompt = parts.join('\n\n');
      const respuesta = await _callModelo(systemPrompt, message, MAX_TOKENS_TEST);

      const grEtiquetas = [];
      if (config.grSinAsesoria)  grEtiquetas.push('Sin asesoría');
      if (config.grCitarFuentes) grEtiquetas.push('Citar fuentes');
      if (config.grDisclaimer)   grEtiquetas.push('Aviso en temas sensibles');
      if (config.grAnonimizar)   grEtiquetas.push('Anonimizar');

      return {
        ok: true,
        response: respuesta,
        systemPromptLength: systemPrompt.length,
        corpusChars: charsEnviados,
        corpusTotal: charsTotales,
        documentsCount: resources.length,
        config: {
          tono: config.tono,
          nivelDetalle: config.nivelDetalle,
          guardrails: grEtiquetas,
          version: config.version
        },
        timeMs: Date.now() - startMs
      };

    } catch (e) {
      console.error(`${TAG} testCathovia error:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 5. GENERAR IDENTIDAD CON IA
// ═══════════════════════════════════════════════════════════════════════════

const META_PROMPT = `Eres un diseñador de prompts experto para asistentes de IA.

El usuario trabaja en Veria Humanitas, una plataforma digital de conocimiento, cultura y tradición cristiana, abierta a la persona, la familia, la educación y la sociedad. Su asistente de IA se llama Cathovia. Hoy Veria Humanitas ofrece artículos, podcast y otros contenidos. NO menciones cursos ni eventos.

El usuario te va a describir cómo quiere que sea Cathovia. A partir de esa descripción, redacta el bloque de IDENTIDAD del asistente.

REGLAS DURAS:
- Escribe SOLO la identidad: quién es Cathovia, con qué voz habla y cuál es su propósito.
- NO incluyas reglas de comportamiento, prohibiciones ni formato de salida: eso vive en otro campo.
- NO incluyas datos concretos (direcciones, teléfonos, nombres de personas, listados): eso vive en los documentos. Un dato metido aquí queda congelado y desactualizado.
- Segunda persona ("Eres…", "Tu propósito es…").
- Español, texto plano, entre 80 y 200 palabras.
- Responde SOLO con el texto de la identidad, sin explicaciones ni comillas.`;

export const generarPromptCathovia = webMethod(
  Permissions.SiteMember,
  async ({ descripcion }) => {
    const admin = await _exigirAdmin();
    if (!admin.ok) return { ok: false, error: admin.error };

    try {
      if (!descripcion || String(descripcion).trim().length < 20) {
        return { ok: false, error: 'Describe cómo debe ser Cathovia con al menos unas frases.' };
      }
      console.log(`${TAG} generarPromptCathovia`);

      const prompt = await _callModelo(META_PROMPT, descripcion, 900);
      if (!prompt) return { ok: false, error: 'No se pudo generar el texto.' };

      return { ok: true, prompt };

    } catch (e) {
      console.error(`${TAG} generarPromptCathovia error:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 6. DOCUMENTOS (EgaelResources del proyecto)
// ═══════════════════════════════════════════════════════════════════════════

export const crearDocumento = webMethod(
  Permissions.SiteMember,
  async ({ titulo, tipo, contenido, resumen }) => {
    const admin = await _exigirAdmin();
    if (!admin.ok) return { ok: false, error: admin.error };

    try {
      if (!titulo)    return { ok: false, error: 'titulo requerido' };
      if (!contenido) return { ok: false, error: 'contenido requerido' };

      // Orden máximo DENTRO del proyecto, no de toda la colección.
      const maxOrden = await wixData.query(C_RESOURCES)
        .eq('cursoRef', CURSO_ID)
        .descending('orden')
        .limit(1)
        .find(AUTH);
      const nextOrden = maxOrden.items.length > 0 ? (Number(maxOrden.items[0].orden) || 0) + 1 : 1;

      const doc = await wixData.insert(C_RESOURCES, {
        title: String(titulo),
        tipo: tipo || 'documento',
        contenido: String(contenido),
        resumen: resumen || String(titulo),
        cursoRef: CURSO_ID,
        idioma: 'es',
        activo: true,
        orden: nextOrden,
        fechaCreacion: new Date()
      }, AUTH);

      console.log(`${TAG} crearDocumento OK "${titulo}" chars=${String(contenido).length}`);

      return { ok: true, documento: _docLigero(doc) };

    } catch (e) {
      console.error(`${TAG} crearDocumento error:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

export const leerDocumento = webMethod(
  Permissions.SiteMember,
  async ({ documentoId }) => {
    const admin = await _exigirAdmin();
    if (!admin.ok) return { ok: false, error: admin.error };

    try {
      if (!documentoId) return { ok: false, error: 'documentoId requerido' };
      const r = await _getRecursoPropio(documentoId);
      if (!r.ok) return r;
      const d = r.doc;

      return {
        ok: true,
        documento: {
          id: d._id,
          titulo: d.title || '',
          tipo: d.tipo || '',
          contenido: d.contenido || '',
          resumen: d.resumen || '',
          activo: d.activo === true,
          orden: Number(d.orden) || 0
        }
      };
    } catch (e) {
      console.error(`${TAG} leerDocumento error:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

/**
 * ⚠️ READ-MERGE-UPDATE: el update reemplaza el documento entero. Se lee, se
 * fusiona solo lo que llega y se escribe completo.
 */
export const actualizarDocumento = webMethod(
  Permissions.SiteMember,
  async ({ documentoId, titulo, tipo, contenido, resumen, orden }) => {
    const admin = await _exigirAdmin();
    if (!admin.ok) return { ok: false, error: admin.error };

    try {
      if (!documentoId) return { ok: false, error: 'documentoId requerido' };

      const r = await _getRecursoPropio(documentoId);
      if (!r.ok) return r;

      const merged = { ...r.doc };
      if (titulo    !== undefined) merged.title     = String(titulo);
      if (tipo      !== undefined) merged.tipo      = String(tipo);
      if (contenido !== undefined) merged.contenido = String(contenido);
      if (resumen   !== undefined) merged.resumen   = String(resumen);
      if (orden     !== undefined) merged.orden     = Number(orden) || 0;

      await wixData.update(C_RESOURCES, merged, AUTH);

      console.log(`${TAG} actualizarDocumento OK ${documentoId} chars=${(merged.contenido || '').length}`);

      return { ok: true, documento: _docLigero(merged) };

    } catch (e) {
      console.error(`${TAG} actualizarDocumento error:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

export const toggleDocumento = webMethod(
  Permissions.SiteMember,
  async ({ documentoId, activo }) => {
    const admin = await _exigirAdmin();
    if (!admin.ok) return { ok: false, error: admin.error };

    try {
      if (!documentoId) return { ok: false, error: 'documentoId requerido' };
      const r = await _getRecursoPropio(documentoId);
      if (!r.ok) return r;

      const merged = { ...r.doc };
      merged.activo = activo === true;
      await wixData.update(C_RESOURCES, merged, AUTH);

      console.log(`${TAG} toggleDocumento ${documentoId} → activo=${merged.activo}`);
      return { ok: true, documentoId, activo: merged.activo };

    } catch (e) {
      console.error(`${TAG} toggleDocumento error:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

export const eliminarDocumento = webMethod(
  Permissions.SiteMember,
  async ({ documentoId }) => {
    const admin = await _exigirAdmin();
    if (!admin.ok) return { ok: false, error: admin.error };

    try {
      if (!documentoId) return { ok: false, error: 'documentoId requerido' };
      const r = await _getRecursoPropio(documentoId);
      if (!r.ok) return r;

      await wixData.remove(C_RESOURCES, documentoId, AUTH);
      console.log(`${TAG} eliminarDocumento ${documentoId}`);
      return { ok: true, documentoId };
    } catch (e) {
      console.error(`${TAG} eliminarDocumento error:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

/* ═══════════════════════════════════════════════════════════════════════════
 * MÉTODOS EXPUESTOS
 * ═══════════════════════════════════════════════════════════════════════════
 *   cargarConfigEntrenador()
 *   guardarAlignment({ config })
 *   publicarAlignment({ alignmentId })
 *   testCathovia({ message, configOverride })
 *   generarPromptCathovia({ descripcion })
 *   crearDocumento({ titulo, tipo, contenido, resumen })
 *   leerDocumento({ documentoId })
 *   actualizarDocumento({ documentoId, ...campos })
 *   toggleDocumento({ documentoId, activo })
 *   eliminarDocumento({ documentoId })
 *
 * TODOS pasan por _exigirAdmin(). Sin fila activa en CathoviaAdmins, ninguno
 * responde.
 * ═══════════════════════════════════════════════════════════════════════════
 */
