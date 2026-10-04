/* ═══════════════════════════════════════════════════════════════════════════
 * VERIA HUMANITAS — CATHOVIA · Gestor del corpus (backend)
 * Archivo:  backend/cathoviaCorpus.web.js
 * VERSION:  1.0.2
 * FECHA:    4 Octubre 2026
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

const VERSION = '1.0.2';
const TAG = `[CathoviaCorpus][${VERSION}]`;
const AUTH = { suppressAuth: true };

const C_KNOWLEDGE  = 'CathoviaKnowledge';
const C_CATEGORIES = 'CathoviaCategories';

// ⚠️ ESPEJO de CATEGORIES_ROW_ID / CATEGORIES_FIELD en cathoviaBackend.web.js.
const CATEGORIES_ROW_ID = 'e2bcd77e-3066-436b-9b85-0835b7bce644';
const CATEGORIES_FIELD  = 'payload';

const PAGE_SIZE = 50;
const SIN_CATEGORIA = '__sin__';

// Tope de seguridad por documento. Un ítem de Wix Data no puede superar
// ~512 KB; con margen para el resto de campos y caracteres multibyte.
const MAX_CONTENT_CHARS = 200000;

const FILE_TYPES = ['docx', 'txt', 'md', 'pdf', 'manual'];

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
    actualizado: d._updatedDate || null
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
      const [{ lista }, total, sinCategoria, inactivos] = await Promise.all([
        _leerIndice(),
        wixData.query(C_KNOWLEDGE).count(AUTH),
        wixData.query(C_KNOWLEDGE).isEmpty('category').count(AUTH),
        wixData.query(C_KNOWLEDGE).eq('activo', false).count(AUTH)
      ]);

      console.log(`${TAG} cargarGestorCorpus total=${total} sinCat=${sinCategoria} inactivos=${inactivos} cats=${lista.length}`);
      return { ok: true, categorias: lista, resumen: { total, sinCategoria, inactivos } };

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

      await wixData.update(C_KNOWLEDGE, merged, AUTH);
      console.log(`${TAG} guardarDocumentoCorpus ${id} chars=${txt.length} cat="${cat.category}"`);

      return { ok: true, documento: _docLigero(merged) };

    } catch (e) {
      console.error(`${TAG} guardarDocumentoCorpus error:`, e.message);
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
      await wixData.remove(C_KNOWLEDGE, id, AUTH);
      console.log(`${TAG} eliminarDocumentoCorpus ${id}`);
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
        activo: true
      }, AUTH);

      console.log(`${TAG} crearDocumentoCorpus "${tit}" chars=${txt.length} cat="${cat.category}" tipo=${ft}`);
      return { ok: true, documento: _docLigero(nuevo) };

    } catch (e) {
      console.error(`${TAG} crearDocumentoCorpus error:`, e.message);
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
 * ═══════════════════════════════════════════════════════════════════════════
 */
