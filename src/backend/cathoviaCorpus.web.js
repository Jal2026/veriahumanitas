/* ═══════════════════════════════════════════════════════════════════════════
 * VERIA HUMANITAS — CATHOVIA · Gestor del corpus (backend)
 * Archivo:  backend/cathoviaCorpus.web.js
 * VERSION:  1.0.5
 * FECHA:    4 Octubre 2026
 *
 * CAMBIOS v1.0.4 → v1.0.5 — QUIÉN ESTÁ CONECTADO Y QUIÉN TOCA CADA DOCUMENTO:
 *   1. cargarGestorCorpus devuelve `usuario` { nombre, email } del miembro
 *      con sesión (wix-members-backend, fieldset FULL).
 *   2. Autoría en CathoviaKnowledge — ⚠️ CREAR DOS CAMPOS DE TEXTO:
 *        autorAlta          quién lo dio de alta desde el gestor
 *        autorModificacion  quién hizo el último cambio desde el gestor
 *      Formato: "Nombre Apellido <email>" (o solo el email si no hay nombre).
 *      Alta → ambos. Editar, asignar categoría, activar/desactivar →
 *      autorModificacion. La fecha de la última modificación es la propia
 *      _updatedDate de Wix.
 *      En los documentos migrados ambos campos están vacíos.
 *   3. Eliminar: el documento desaparece, así que quién y qué se borró
 *      queda en Site Events: [CathoviaCorpus] ELIMINADO … por …
 *
 * CAMBIOS v1.0.3 → v1.0.4 — ASIGNACIÓN DESDE EL LISTADO:
 *   1. Nuevo método asignarCategoria({ id, category, categorySecondary }):
 *      cambia solo las categorías (read-merge), sin enviar el contenido.
 *      categorySecondary === undefined → no se toca.
 *   2. proponerCategoria admite { id }: si no llega content, lee el
 *      documento en servidor. Así el listado no tiene que descargar textos.
 *
 * CAMBIOS v1.0.2 → v1.0.3 — PROPUESTA DE CATEGORÍA CON IA:
 *   Nuevo método proponerCategoria({ titulo, content }). Envía al modelo el
 *   título, el principio del texto y el índice completo, y devuelve una
 *   categoría principal y otra secundaria ELEGIDAS DEL ÍNDICE (lo que no
 *   esté en él se descarta). No guarda nada: solo propone.
 *   Modelo: claude-haiku-4-5 (el mismo fallback que usa cathoviaBackend).
 *   Secret: EGAEL_API_KEY.
 *
 * CAMBIOS v1.0.1 → v1.0.2 — ÍNDICE DE CATEGORÍAS:
 *   _leerIndice fallaba con "no es un JSON válido" porque Wix entrega el
 *   campo payload ya convertido en lista, no como texto. Ahora acepta las
 *   dos formas, y crearCategoria lo guarda en la misma forma en que lo leyó.
 *
 * CAMBIOS v1.0.0 → v1.0.1 — ACCESO POR ROLES DE WIX:
 *   Eliminada la comprobación contra CathoviaAdmins (_exigirAdmin). El
 *   acceso a la página se controla con los roles de miembro de Wix.
 *   Los métodos siguen exigiendo sesión iniciada (Permissions.SiteMember).
 *
 * ───────────────────────────────────────────────────────────────────────────
 * QUÉ ES
 * ───────────────────────────────────────────────────────────────────────────
 * Gestión del corpus documental que Cathovia consulta en cada pregunta
 * (CathoviaKnowledge) y de su índice de categorías (CathoviaCategories):
 *   - explorar, buscar y filtrar los documentos
 *   - editar título, categorías y contenido
 *   - activar / desactivar (campo `activo`) y eliminar
 *   - ingestar documentos nuevos (el texto llega ya extraído del navegador)
 *   - crear categorías nuevas en el índice
 *
 * ───────────────────────────────────────────────────────────────────────────
 * ESQUEMA (verificado contra export real de CathoviaKnowledge)
 * ───────────────────────────────────────────────────────────────────────────
 *   title             título original
 *   titleFixed        título mostrado. cathoviaBackend usa titleFixed || title
 *   content           texto del documento (lo que busca el RAG)
 *   sourceUrl         URL del fichero original (vacío en altas del gestor)
 *   fileType          'doc' en los migrados; 'docx' | 'txt' | 'md' | 'pdf' aquí
 *   charLength        content.length
 *   sourceId          id Wix del fichero (6a5fc9_…) en los migrados;
 *                     'gestor_<marca>' en las altas del gestor
 *   category          nombre exacto de una categoría del índice
 *   categoryIndex     posición de la categoría en el índice, EN BASE 1
 *                     (comprobado: 'Antropología de la persona' = posición 8
 *                     del array → categoryIndex 9)
 *   categorySecondary nombre de una categoría del índice, o vacío
 *   categorySource    'directo' en los migrados; 'manual' cuando la
 *                     categoría se asigna o cambia desde el gestor
 *   createdDate       fecha de alta
 *   activo            booleano. VACÍO = ACTIVO (los migrados no lo tienen)
 *
 * ⚠️ cathoviaBackend v1.6.4 o superior es necesario para que `activo = false`
 *    saque el documento de las respuestas. Con v1.6.3 se ignora.
 *
 * ⚠️ El índice de categorías SOLO CRECE POR EL FINAL. Reordenarlo cambiaría
 *    el categoryIndex de los 5.000+ documentos.
 *
 * ⚠️ cathoviaBackend cachea el índice 5 minutos: una categoría nueva tarda
 *    hasta 5 minutos en ser detectable en las preguntas.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * SEGURIDAD
 * ───────────────────────────────────────────────────────────────────────────
 * Acceso a la página: roles de miembro de Wix (configurado en el editor).
 * Métodos: Permissions.SiteMember (exigen sesión iniciada).
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { webMethod, Permissions } from 'wix-web-module';
import wixData from 'wix-data';
import { fetch } from 'wix-fetch';
import { getSecret } from 'wix-secrets-backend';
import { currentMember } from 'wix-members-backend';

const VERSION = '1.0.5';
const TAG = `[CathoviaCorpus][${VERSION}]`;
const AUTH = { suppressAuth: true };

const C_KNOWLEDGE  = 'CathoviaKnowledge';
const C_CATEGORIES = 'CathoviaCategories';

// ⚠️ ESPEJO de CATEGORIES_ROW_ID / CATEGORIES_FIELD en cathoviaBackend.web.js.
const CATEGORIES_ROW_ID = 'e2bcd77e-3066-436b-9b85-0835b7bce644';
const CATEGORIES_FIELD  = 'payload';

// Campos de autoría en CathoviaKnowledge (texto). Hay que crearlos en el CMS.
const F_AUTOR_ALTA = 'autorAlta';
const F_AUTOR_MOD  = 'autorModificacion';

const PAGE_SIZE = 50;
const SIN_CATEGORIA = '__sin__';

// Tope de seguridad por documento. Un ítem de Wix Data no puede superar
// ~512 KB; con margen para el resto de campos y caracteres multibyte.
const MAX_CONTENT_CHARS = 200000;

const FILE_TYPES = ['docx', 'txt', 'md', 'pdf', 'manual'];

// Propuesta de categoría
const SECRET_API     = 'EGAEL_API_KEY';
const MODEL_PROPUESTA = 'claude-haiku-4-5';
const PROPUESTA_CHARS = 6000;      // del texto solo se envía el principio

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

async function _leerIndice() {
  const row = await wixData.get(C_CATEGORIES, CATEGORIES_ROW_ID, AUTH);
  if (!row) throw new Error(`No existe la fila del índice en ${C_CATEGORIES}.`);
  const bruto = row[CATEGORIES_FIELD];
  let lista = [];
  let comoTexto = true;

  if (Array.isArray(bruto)) {
    // Wix puede entregar el campo ya como lista
    lista = bruto.slice();
    comoTexto = false;
  } else {
    const txt = String(bruto == null ? '' : bruto).replace(/^\uFEFF/, '').trim();
    try {
      lista = JSON.parse(txt || '[]');
    } catch (e) {
      console.error(`${TAG} payload no parseable (tipo=${typeof bruto}): ${txt.slice(0, 120)}`);
      throw new Error('El índice de categorías no es un JSON válido.');
    }
  }
  if (!Array.isArray(lista)) throw new Error('El índice de categorías no es una lista.');
  return { row, lista, comoTexto };
}

/** Devuelve { category, categoryIndex } validados contra el índice, o error. */
function _resolverCategoria(nombre, lista) {
  const n = String(nombre || '').trim();
  if (!n) return { ok: true, category: '', categoryIndex: null };
  const idx = lista.indexOf(n);
  if (idx < 0) return { ok: false, error: `La categoría "${n}" no está en el índice.` };
  return { ok: true, category: n, categoryIndex: idx + 1 };   // base 1
}

function _validarSecundaria(nombre, lista) {
  const n = String(nombre || '').trim();
  if (!n) return { ok: true, valor: '' };
  if (lista.indexOf(n) < 0) return { ok: false, error: `La categoría secundaria "${n}" no está en el índice.` };
  return { ok: true, valor: n };
}

// ═══════════════════════════════════════════════════════════════════════════
// QUIÉN ESTÁ CONECTADO
// ═══════════════════════════════════════════════════════════════════════════

/** Devuelve { id, nombre, email, etiqueta } del miembro con sesión. */
async function _quien() {
  let member = null;
  try {
    member = await currentMember.getMember({ fieldsets: ['FULL'] });
  } catch (eFull) {
    try { member = await currentMember.getMember(); } catch (e) { member = null; }
  }
  if (!member) return { id: '', nombre: '', email: '', etiqueta: 'desconocido' };

  let email = member.loginEmail || '';
  const cd = member.contactDetails || {};
  if (!email && Array.isArray(cd.emails) && cd.emails.length > 0) {
    email = typeof cd.emails[0] === 'string' ? cd.emails[0] : (cd.emails[0].email || '');
  }
  const nombre = [cd.firstName, cd.lastName].filter(Boolean).join(' ').trim() ||
                 (member.profile && member.profile.nickname) || '';
  email = String(email || '').trim();
  const etiqueta = nombre && email ? `${nombre} <${email}>` : (email || nombre || member._id || 'desconocido');
  return { id: member._id || '', nombre, email, etiqueta };
}

function _docLigero(d) {
  return {
    id: d._id,
    titulo: d.titleFixed || d.title || '',
    category: d.category || '',
    categorySecondary: d.categorySecondary || '',
    fileType: d.fileType || '',
    charLength: Number(d.charLength) || (d.content || '').length,
    activo: d.activo !== false,
    origen: String(d.sourceId || '').indexOf('gestor_') === 0 ? 'gestor' : 'migrado',
    actualizado: d._updatedDate || null,
    autorAlta: d[F_AUTOR_ALTA] || '',
    autorModificacion: d[F_AUTOR_MOD] || ''
  };
}

function _norm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function _baseQuery(categoria, estado) {
  let q = wixData.query(C_KNOWLEDGE);
  if (categoria === SIN_CATEGORIA) q = q.isEmpty('category');
  else if (categoria) q = q.eq('category', categoria);
  // Solo se filtra por "inactivos" (eq false es inequívoco). "Activos" no
  // se filtra en servidor: vacío también es activo.
  if (estado === 'inactivos') q = q.eq('activo', false);
  return q;
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. ÍNDICE DE CATEGORÍAS + RESUMEN
// ═══════════════════════════════════════════════════════════════════════════

export const cargarGestorCorpus = webMethod(
  Permissions.SiteMember,
  async () => {
    try {
      const [{ lista }, total, sinCategoria, inactivos, yo] = await Promise.all([
        _leerIndice(),
        wixData.query(C_KNOWLEDGE).count(AUTH),
        wixData.query(C_KNOWLEDGE).isEmpty('category').count(AUTH),
        wixData.query(C_KNOWLEDGE).eq('activo', false).count(AUTH),
        _quien()
      ]);

      console.log(`${TAG} cargarGestorCorpus total=${total} sinCat=${sinCategoria} inactivos=${inactivos} cats=${lista.length}`);
      return {
        ok: true,
        categorias: lista,
        resumen: { total, sinCategoria, inactivos },
        usuario: { nombre: yo.nombre, email: yo.email }
      };

    } catch (e) {
      console.error(`${TAG} cargarGestorCorpus error:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

export const crearCategoria = webMethod(
  Permissions.SiteMember,
  async ({ nombre }) => {
    try {
      const n = String(nombre || '').trim().replace(/\s+/g, ' ');
      if (n.length < 3) return { ok: false, error: 'El nombre de la categoría es demasiado corto.' };

      const { row, lista, comoTexto } = await _leerIndice();
      const existente = lista.find(c => _norm(c) === _norm(n));
      if (existente) return { ok: false, error: `Ya existe la categoría "${existente}".` };

      // ⚠️ Solo por el final: no se reordena nunca.
      lista.push(n);
      // Se guarda en la misma forma en que se leyó (texto JSON o lista)
      row[CATEGORIES_FIELD] = comoTexto ? JSON.stringify(lista) : lista;
      await wixData.update(C_CATEGORIES, row, AUTH);

      console.log(`${TAG} crearCategoria "${n}" → posición ${lista.length}`);
      return { ok: true, categorias: lista, nombre: n, categoryIndex: lista.length };

    } catch (e) {
      console.error(`${TAG} crearCategoria error:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 2. LISTADO
// ═══════════════════════════════════════════════════════════════════════════

export const listarCorpus = webMethod(
  Permissions.SiteMember,
  async ({ texto, categoria, estado, pagina }) => {
    try {
      const p = Math.max(0, Number(pagina) || 0);
      const t = String(texto || '').trim();

      let q;
      if (t) {
        // Busca en los dos títulos. La consulta repite los filtros en ambas
        // ramas del .or() para que se apliquen a las dos.
        q = _baseQuery(categoria, estado).contains('title', t)
          .or(_baseQuery(categoria, estado).contains('titleFixed', t));
      } else {
        q = _baseQuery(categoria, estado);
      }

      const res = await q.ascending('title').skip(p * PAGE_SIZE).limit(PAGE_SIZE).find(AUTH);

      return {
        ok: true,
        documentos: (res.items || []).map(_docLigero),
        total: res.totalCount,
        pagina: p,
        paginas: Math.max(1, Math.ceil((res.totalCount || 0) / PAGE_SIZE))
      };

    } catch (e) {
      console.error(`${TAG} listarCorpus error:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 3. LECTURA Y EDICIÓN
// ═══════════════════════════════════════════════════════════════════════════

export const leerDocumentoCorpus = webMethod(
  Permissions.SiteMember,
  async ({ id }) => {
    try {
      if (!id) return { ok: false, error: 'id requerido' };
      const d = await wixData.get(C_KNOWLEDGE, id, AUTH);
      if (!d) return { ok: false, error: 'Documento no encontrado.' };

      return {
        ok: true,
        documento: {
          ..._docLigero(d),
          tituloOriginal: d.title || '',
          content: d.content || '',
          sourceUrl: d.sourceUrl || '',
          sourceId: d.sourceId || '',
          categorySource: d.categorySource || ''
        }
      };
    } catch (e) {
      console.error(`${TAG} leerDocumentoCorpus error:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

/**
 * ⚠️ READ-MERGE-UPDATE: se lee el ítem, se cambian solo los campos editados
 * y se escribe completo. Conserva los campos que el gestor no toca
 * (sourceUrl, sourceId, fileType, SeleccionadoExport…).
 *
 * El título editado se escribe en titleFixed (el que muestra Cathovia).
 * `title` conserva el original salvo que esté vacío.
 */
export const guardarDocumentoCorpus = webMethod(
  Permissions.SiteMember,
  async ({ id, titulo, category, categorySecondary, content }) => {
    try {
      if (!id) return { ok: false, error: 'id requerido' };
      const tit = String(titulo || '').trim();
      if (!tit) return { ok: false, error: 'El título es obligatorio.' };
      const txt = String(content || '');
      if (!txt.trim()) return { ok: false, error: 'El contenido no puede quedar vacío.' };
      if (txt.length > MAX_CONTENT_CHARS) {
        return { ok: false, error: `El contenido supera ${MAX_CONTENT_CHARS.toLocaleString('es-ES')} caracteres. Divídelo en varios documentos.` };
      }

      const [d, { lista }] = await Promise.all([wixData.get(C_KNOWLEDGE, id, AUTH), _leerIndice()]);
      if (!d) return { ok: false, error: 'Documento no encontrado.' };

      // Una categoría que el documento YA tenía se respeta aunque no esté en
      // el índice (datos heredados): solo se valida lo que cambia.
      const catPedida = String(category || '').trim();
      const cat = catPedida && catPedida === (d.category || '')
        ? { ok: true, category: d.category, categoryIndex: d.categoryIndex }
        : _resolverCategoria(catPedida, lista);
      if (!cat.ok) return cat;
      const secPedida = String(categorySecondary || '').trim();
      const sec = secPedida && secPedida === (d.categorySecondary || '')
        ? { ok: true, valor: d.categorySecondary }
        : _validarSecundaria(secPedida, lista);
      if (!sec.ok) return sec;

      const merged = { ...d };
      merged.titleFixed = tit;
      if (!merged.title) merged.title = tit;
      merged.content = txt;
      merged.charLength = txt.length;
      if ((d.category || '') !== cat.category) merged.categorySource = 'manual';
      merged.category = cat.category;
      merged.categoryIndex = cat.categoryIndex;
      merged.categorySecondary = sec.valor;
      merged[F_AUTOR_MOD] = (await _quien()).etiqueta;

      await wixData.update(C_KNOWLEDGE, merged, AUTH);
      console.log(`${TAG} guardarDocumentoCorpus ${id} chars=${txt.length} cat="${cat.category}"`);

      return { ok: true, documento: _docLigero(merged) };

    } catch (e) {
      console.error(`${TAG} guardarDocumentoCorpus error:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

/**
 * Cambia solo las categorías de un documento (asignación desde el listado).
 * READ-MERGE: el resto del ítem no se toca. categorySecondary undefined = sin cambios.
 */
export const asignarCategoria = webMethod(
  Permissions.SiteMember,
  async ({ id, category, categorySecondary }) => {
    try {
      if (!id) return { ok: false, error: 'id requerido' };
      const [d, { lista }] = await Promise.all([wixData.get(C_KNOWLEDGE, id, AUTH), _leerIndice()]);
      if (!d) return { ok: false, error: 'Documento no encontrado.' };

      const cat = _resolverCategoria(category, lista);
      if (!cat.ok) return cat;

      const merged = { ...d };
      if ((d.category || '') !== cat.category) merged.categorySource = 'manual';
      merged.category = cat.category;
      merged.categoryIndex = cat.categoryIndex;

      if (categorySecondary !== undefined) {
        const sec = _validarSecundaria(categorySecondary, lista);
        if (!sec.ok) return sec;
        merged.categorySecondary = sec.valor === cat.category ? '' : sec.valor;
      }
      merged[F_AUTOR_MOD] = (await _quien()).etiqueta;

      await wixData.update(C_KNOWLEDGE, merged, AUTH);
      console.log(`${TAG} asignarCategoria ${id} → "${cat.category}" / "${merged.categorySecondary || ''}"`);
      return { ok: true, documento: _docLigero(merged) };

    } catch (e) {
      console.error(`${TAG} asignarCategoria error:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

export const activarDocumentoCorpus = webMethod(
  Permissions.SiteMember,
  async ({ id, activo }) => {
    try {
      if (!id) return { ok: false, error: 'id requerido' };
      const d = await wixData.get(C_KNOWLEDGE, id, AUTH);
      if (!d) return { ok: false, error: 'Documento no encontrado.' };

      const merged = { ...d, activo: activo === true };
      merged[F_AUTOR_MOD] = (await _quien()).etiqueta;
      await wixData.update(C_KNOWLEDGE, merged, AUTH);
      console.log(`${TAG} activarDocumentoCorpus ${id} → ${merged.activo}`);
      return { ok: true, id, activo: merged.activo };

    } catch (e) {
      console.error(`${TAG} activarDocumentoCorpus error:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

export const eliminarDocumentoCorpus = webMethod(
  Permissions.SiteMember,
  async ({ id }) => {
    try {
      if (!id) return { ok: false, error: 'id requerido' };
      const [d, yo] = await Promise.all([wixData.get(C_KNOWLEDGE, id, AUTH), _quien()]);
      await wixData.remove(C_KNOWLEDGE, id, AUTH);
      // El documento desaparece: el rastro queda en Site Events
      console.log(`${TAG} ELIMINADO ${id} "${d ? (d.titleFixed || d.title || '') : '?'}" por ${yo.etiqueta}`);
      return { ok: true, id };
    } catch (e) {
      console.error(`${TAG} eliminarDocumentoCorpus error:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 4. INGESTA
// ═══════════════════════════════════════════════════════════════════════════

/** Busca documentos con el mismo título (sin tildes ni mayúsculas). */
export const buscarDuplicados = webMethod(
  Permissions.SiteMember,
  async ({ titulo }) => {
    try {
      const t = String(titulo || '').trim();
      if (!t) return { ok: true, duplicados: [] };

      // contains() es insensible a mayúsculas; la igualdad exacta sin tildes
      // se comprueba en memoria.
      const res = await wixData.query(C_KNOWLEDGE).contains('title', t)
        .or(wixData.query(C_KNOWLEDGE).contains('titleFixed', t))
        .limit(20).find(AUTH);

      const objetivo = _norm(t);
      const duplicados = (res.items || [])
        .filter(d => _norm(d.titleFixed) === objetivo || _norm(d.title) === objetivo)
        .map(_docLigero);

      return { ok: true, titulo: t, duplicados };

    } catch (e) {
      console.error(`${TAG} buscarDuplicados error:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

export const crearDocumentoCorpus = webMethod(
  Permissions.SiteMember,
  async ({ titulo, category, categorySecondary, content, fileType }) => {
    try {
      const tit = String(titulo || '').trim();
      if (!tit) return { ok: false, error: 'El título es obligatorio.' };
      const txt = String(content || '');
      if (txt.trim().length < 50) return { ok: false, error: 'El contenido está vacío o es demasiado corto.' };
      if (txt.length > MAX_CONTENT_CHARS) {
        return { ok: false, error: `El contenido supera ${MAX_CONTENT_CHARS.toLocaleString('es-ES')} caracteres. Divídelo en varios documentos.` };
      }

      const { lista } = await _leerIndice();
      const cat = _resolverCategoria(category, lista);
      if (!cat.ok) return cat;
      const sec = _validarSecundaria(categorySecondary, lista);
      if (!sec.ok) return sec;

      const ft = FILE_TYPES.indexOf(String(fileType || '')) >= 0 ? String(fileType) : 'manual';
      const autor = (await _quien()).etiqueta;
      const marca = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

      const nuevo = await wixData.insert(C_KNOWLEDGE, {
        title: tit,
        titleFixed: tit,
        content: txt,
        fileType: ft,
        charLength: txt.length,
        sourceId: 'gestor_' + marca,
        category: cat.category,
        categoryIndex: cat.categoryIndex,
        categorySecondary: sec.valor,
        categorySource: cat.category ? 'manual' : '',
        createdDate: new Date(),
        activo: true,
        [F_AUTOR_ALTA]: autor,
        [F_AUTOR_MOD]: autor
      }, AUTH);

      console.log(`${TAG} crearDocumentoCorpus "${tit}" chars=${txt.length} cat="${cat.category}" tipo=${ft}`);
      return { ok: true, documento: _docLigero(nuevo) };

    } catch (e) {
      console.error(`${TAG} crearDocumentoCorpus error:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 5. PROPUESTA DE CATEGORÍA (IA)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Propone categoría principal y secundaria para un documento.
 * ⚠️ Solo devuelve nombres que existen EXACTAMENTE en el índice. Si el modelo
 *    contesta otra cosa, se descarta. No escribe nada en el CMS.
 */
export const proponerCategoria = webMethod(
  Permissions.SiteMember,
  async ({ titulo, content, id }) => {
    const startMs = Date.now();
    try {
      let tit = String(titulo || '').trim();
      let txt = String(content || '').trim();
      if (id && !txt) {
        const d = await wixData.get(C_KNOWLEDGE, id, AUTH);
        if (!d) return { ok: false, error: 'Documento no encontrado.' };
        tit = tit || d.titleFixed || d.title || '';
        txt = String(d.content || '').trim();
      }
      if (!tit && txt.length < 50) return { ok: false, error: 'No hay título ni texto suficiente para proponer.' };

      const { lista } = await _leerIndice();
      if (lista.length === 0) return { ok: false, error: 'El índice de categorías está vacío.' };

      const apiKey = await getSecret(SECRET_API);
      if (!apiKey) return { ok: false, error: `Falta el secret ${SECRET_API}.` };

      const system = [
        'Clasificas documentos del corpus de Cathovia, asistente de Veria Humanitas (pensamiento, cultura y tradición cristiana).',
        'Recibes un índice cerrado de categorías y un documento.',
        'Elige la categoría PRINCIPAL que mejor describe el documento y, solo si aporta, una SECUNDARIA distinta.',
        'REGLAS: copia los nombres EXACTAMENTE como aparecen en el índice. No inventes categorías.',
        'Responde SOLO con JSON, sin texto alrededor ni bloques de código:',
        '{"principal":"<nombre del índice>","secundaria":"<nombre del índice o vacío>","confianza":"alta|media|baja","motivo":"<máx. 15 palabras>"}'
      ].join('\n');

      const user =
        'ÍNDICE DE CATEGORÍAS:\n' + lista.map(c => '- ' + c).join('\n') +
        '\n\nDOCUMENTO\nTítulo: ' + (tit || '(sin título)') +
        '\nTexto (principio):\n' + txt.slice(0, PROPUESTA_CHARS);

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: MODEL_PROPUESTA,
          max_tokens: 300,
          system,
          messages: [{ role: 'user', content: user }]
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data && data.error ? data.error.message : `HTTP ${res.status}`);

      const raw = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
      let r;
      try {
        r = JSON.parse(raw.replace(/```json|```/g, '').trim());
      } catch (e) {
        console.warn(`${TAG} proponerCategoria respuesta no JSON: ${raw.slice(0, 200)}`);
        return { ok: false, error: 'La IA no devolvió una propuesta válida. Inténtalo de nuevo.' };
      }

      // Solo nombres del índice. Comparación exacta y, si falla, sin tildes ni mayúsculas.
      const buscar = (n) => {
        const v = String(n || '').trim();
        if (!v) return '';
        if (lista.indexOf(v) >= 0) return v;
        const hit = lista.find(c => _norm(c) === _norm(v));
        return hit || '';
      };

      const principal = buscar(r.principal);
      let secundaria = buscar(r.secundaria);
      if (secundaria === principal) secundaria = '';

      if (!principal) {
        console.warn(`${TAG} proponerCategoria fuera del índice: "${r.principal}"`);
        return { ok: false, error: `La IA propuso "${r.principal || '—'}", que no está en el índice.` };
      }

      const confianza = ['alta', 'media', 'baja'].indexOf(r.confianza) >= 0 ? r.confianza : 'media';
      console.log(`${TAG} proponerCategoria "${tit.slice(0, 60)}" → "${principal}" / "${secundaria}" (${confianza}) ${Date.now() - startMs}ms`);

      return { ok: true, principal, secundaria, confianza, motivo: String(r.motivo || '').slice(0, 200) };

    } catch (e) {
      console.error(`${TAG} proponerCategoria error:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

/* ═══════════════════════════════════════════════════════════════════════════
 * MÉTODOS EXPUESTOS
 * ═══════════════════════════════════════════════════════════════════════════
 *   cargarGestorCorpus()
 *   crearCategoria({ nombre })
 *   listarCorpus({ texto, categoria, estado, pagina })
 *   leerDocumentoCorpus({ id })
 *   guardarDocumentoCorpus({ id, titulo, category, categorySecondary, content })
 *   activarDocumentoCorpus({ id, activo })
 *   eliminarDocumentoCorpus({ id })
 *   buscarDuplicados({ titulo })
 *   crearDocumentoCorpus({ titulo, category, categorySecondary, content, fileType })
 *   proponerCategoria({ titulo, content } | { id })
 *   asignarCategoria({ id, category, categorySecondary })
 * ═══════════════════════════════════════════════════════════════════════════
 */
