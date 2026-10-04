/* ═══════════════════════════════════════════════════════════════════════════
 * VERIA HUMANITAS — CATHOVIA · Analizador (cálculo de instantáneas)
 * Archivo:  backend/cathoviaAnalyticsCore.js
 * VERSION:  1.0.0
 * FECHA:    4 Octubre 2026
 *
 * QUÉ ES
 *   Cálculo de las cifras del Analizador. Lo usan:
 *     - el job nocturno (backend/jobs.config → calcularInstantaneas)
 *     - backend/cathoviaAnalytics.web.js (botones «Recalcular»)
 *   Es un módulo normal (.js), no un web module: los jobs de Wix necesitan
 *   una función exportada corriente.
 *
 * POR QUÉ INSTANTÁNEAS
 *   Wix corta la conexión al cliente a los ~14 s (medido, ver
 *   http-functions.js v1.2.0). Recorrer el corpus y el log en cada apertura
 *   del panel arriesga ese corte. El job guarda las cifras de cada día en
 *   CathoviaStats y el panel solo lee esas filas.
 *
 * ⚠️ COLECCIÓN NUEVA: CathoviaStats — crear en el CMS:
 *     clave    TEXT      'corpus:AAAA-MM-DD' | 'uso:AAAA-MM-DD'
 *     tipo     TEXT      'corpus' | 'uso'
 *     fecha    DATETIME  día al que corresponde (12:00 UTC)
 *     datos    TEXT      JSON con los agregados
 *     version  TEXT      versión de este módulo que lo calculó
 *   Permisos: solo Admin (lectura y escritura). Se accede con suppressAuth.
 *
 * DÍAS
 *   Un «día» es el día natural en Europe/Madrid. Si el runtime no tiene
 *   zonas horarias (Intl), cae a UTC y lo dice en Site Events.
 *
 * FUENTES (field IDs verificados contra cathoviaBackend v1.6.4,
 * cathoviaCorpus v1.0.5 y egaelTTS)
 *   EgaelLog        cursoRef, sesionRef, usuarioId, query, responseSummary,
 *                   category, parameters (JSON en texto), timeMs, error,
 *                   timestamp, title
 *     category:     'cathovia'               una fila por consulta
 *                   'cathovia_rag'           documentos recuperados
 *                   'cathovia_card_inserted' tarjetas del catálogo
 *                   'cathovia_error'         excepciones capturadas
 *                   'egael_tts'              síntesis de voz
 *   EgaelSessions   cursoRef, usuarioId, fechaCreacion
 *   EgaelMessages   sesionRef
 *   CathoviaKnowledge  category, categorySource, fileType, charLength,
 *                   activo, sourceId, title, titleFixed, autorAlta
 *   CathoviaCategories fila CATEGORIES_ROW_ID, campo payload
 *
 * 504 PROBABLE
 *   timeMs > LIMITE_CONEXION_MS en filas con medición completa (prepMs > 0,
 *   desde cathoviaBackend v1.6.0). Antes de v1.6.0 timeMs medía solo la API
 *   y no sirve para esto: esas filas cuentan como «sin medición».
 *
 * ⚠️ VERIFICAR EN EL PRIMER RUN
 *   La forma exacta de los ítems de wixData.aggregate() con group() de
 *   varios campos. _agrupar() acepta las dos formas conocidas (campos en
 *   _id o en el propio ítem) y escribe en Site Events la forma del primer
 *   ítem de cada colección: [CathoviaAnalytics][1.0.0] forma aggregate …
 * ═══════════════════════════════════════════════════════════════════════════
 */

import wixData from 'wix-data';

export const VERSION = '1.0.0';
const TAG = `[CathoviaAnalytics][${VERSION}]`;
const AUTH = { suppressAuth: true };

// ── Configuración ────────────────────────────────────────────────────────
export const CONFIG = {
  // _id de Cathovia en EgaelCourses (= CURSO_ID_DEFAULT de la página Cathovia)
  CURSO_ID: 'a83606cf-9aca-4ed4-ad89-bc268e03a73b',

  // usuarioId que no cuentan en el análisis (administradores, pruebas).
  // ⚠️ DECISIÓN PENDIENTE: vacío = cuentan todos.
  EXCLUIR_USUARIOS: [],

  // Objetivo de longitud de respuesta en caracteres («pocos párrafos breves»).
  // ⚠️ DECISIÓN PENDIENTE: 900 es un valor de partida.
  OBJETIVO_LONGITUD: 900,

  // Wix corta la conexión al cliente a los ~14 s (http-functions.js v1.2.0)
  LIMITE_CONEXION_MS: 14000,

  ZONA: 'Europe/Madrid'
};

export const C_STATS = 'CathoviaStats';
const C_LOG        = 'EgaelLog';
const C_SESSIONS   = 'EgaelSessions';
const C_MESSAGES   = 'EgaelMessages';
const C_KNOWLEDGE  = 'CathoviaKnowledge';
const C_CATEGORIES = 'CathoviaCategories';

// ⚠️ ESPEJO de cathoviaBackend.web.js y cathoviaCorpus.web.js
const CATEGORIES_ROW_ID = 'e2bcd77e-3066-436b-9b85-0835b7bce644';
const CATEGORIES_FIELD  = 'payload';

const CATS_LOG = ['cathovia', 'cathovia_rag', 'cathovia_card_inserted', 'cathovia_error', 'egael_tts'];

const MAX_CONTENT_CHARS = 200000;   // tope de edición del Gestor del corpus
const TROZO_IDS = 100;              // ids por consulta hasSome
const JOB_PRESUPUESTO_MS = 240000;  // los jobs de Wix se cortan a los 5 min

// ═══════════════════════════════════════════════════════════════════════════
// FECHAS
// ═══════════════════════════════════════════════════════════════════════════

let _avisoZona = false;

/** 'AAAA-MM-DD' del día en Europe/Madrid (o UTC si no hay Intl con zonas). */
export function diaDe(fecha) {
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: CONFIG.ZONA, year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(d);
  } catch (e) {
    if (!_avisoZona) { console.warn(`${TAG} Intl sin zonas horarias: días en UTC`); _avisoZona = true; }
    return d.toISOString().slice(0, 10);
  }
}

function _horaDe(fecha) {
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  try {
    return Number(new Intl.DateTimeFormat('en-GB', {
      timeZone: CONFIG.ZONA, hour: '2-digit', hourCycle: 'h23'
    }).format(d));
  } catch (e) {
    return d.getUTCHours();
  }
}

export function esDia(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
}

export function sumarDias(dia, n) {
  const t = Date.parse(dia + 'T12:00:00Z') + n * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

/** Rango UTC que cubre con margen el día de Madrid (se filtra luego en memoria). */
function _rangoUTC(dia) {
  const base = Date.parse(dia + 'T00:00:00Z');
  return { desde: new Date(base - 3 * 3600000), hasta: new Date(base + 27 * 3600000) };
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS DE DATOS
// ═══════════════════════════════════════════════════════════════════════════

function _json(v) {
  if (v && typeof v === 'object') return v;
  try { return JSON.parse(String(v || '')); } catch (e) { return {}; }
}

function _sumar(mapa, clave, n) {
  const k = clave === undefined || clave === null || clave === '' ? '' : String(clave);
  mapa[k] = (mapa[k] || 0) + (n === undefined ? 1 : n);
}

function _trozos(lista, n) {
  const out = [];
  for (let i = 0; i < lista.length; i += n) out.push(lista.slice(i, i + n));
  return out;
}

/** Todas las páginas de una query (find + next). */
async function _todos(query) {
  let res = await query.limit(1000).find(AUTH);
  const items = (res.items || []).slice();
  let vueltas = 0;
  while (res.hasNext() && vueltas < 50) {
    res = await res.next();
    items.push(...(res.items || []));
    vueltas++;
  }
  return items;
}

const _formaVista = {};

/**
 * aggregate().group(...campos).count(), todas las páginas.
 * Devuelve [{ <campo>: valor, ..., count }]. Acepta los campos dentro de _id
 * (objeto) o en el propio ítem.
 */
async function _agrupar(coleccion, filtro, campos) {
  let agg = wixData.aggregate(coleccion);
  if (filtro) agg = agg.filter(filtro);
  agg = agg.group(...campos).count().limit(1000);

  let res = await agg.run(AUTH);
  const out = [];
  const tomar = (r) => {
    (r.items || []).forEach((it) => {
      if (!_formaVista[coleccion] && it) {
        _formaVista[coleccion] = true;
        console.log(`${TAG} forma aggregate ${coleccion} [${campos.join(',')}]: ${JSON.stringify(it).slice(0, 300)}`);
      }
      const enId = it._id && typeof it._id === 'object' ? it._id : null;
      const o = { count: Number(it.count) || 0 };
      campos.forEach((c) => {
        let v = enId && enId[c] !== undefined ? enId[c] : it[c];
        if (v === undefined && campos.length === 1 && it._id !== undefined && typeof it._id !== 'object') v = it._id;
        o[c] = v === undefined ? null : v;
      });
      out.push(o);
    });
  };
  tomar(res);
  let vueltas = 0;
  while (res.hasNext() && vueltas < 50) {
    res = await res.next();
    tomar(res);
    vueltas++;
  }
  return out;
}

async function _leerIndice() {
  const row = await wixData.get(C_CATEGORIES, CATEGORIES_ROW_ID, AUTH);
  if (!row) return [];
  const bruto = row[CATEGORIES_FIELD];
  if (Array.isArray(bruto)) return bruto.slice();
  try {
    const l = JSON.parse(String(bruto || '[]').replace(/^\uFEFF/, '').trim() || '[]');
    return Array.isArray(l) ? l : [];
  } catch (e) {
    console.error(`${TAG} payload de categorías no parseable`);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// INSTANTÁNEAS (CathoviaStats)
// ═══════════════════════════════════════════════════════════════════════════

export async function guardarInstantanea(tipo, dia, datos) {
  const clave = `${tipo}:${dia}`;
  const res = await wixData.query(C_STATS).eq('clave', clave).limit(1).find(AUTH);
  const fila = {
    clave,
    tipo,
    fecha: new Date(dia + 'T12:00:00Z'),
    datos: JSON.stringify(datos),
    version: VERSION
  };
  if (res.items && res.items.length > 0) {
    await wixData.update(C_STATS, { ...res.items[0], ...fila }, AUTH);
  } else {
    await wixData.insert(C_STATS, fila, AUTH);
  }
  return clave;
}

/** Instantáneas de un tipo entre dos días (incluidos), ordenadas por día. */
export async function leerInstantaneas(tipo, desde, hasta) {
  const items = await _todos(
    wixData.query(C_STATS)
      .eq('tipo', tipo)
      .ge('fecha', new Date(desde + 'T00:00:00Z'))
      .le('fecha', new Date(hasta + 'T23:59:59Z'))
      .ascending('fecha')
  );
  return items.map((it) => ({ dia: String(it.clave || '').split(':')[1] || '', version: it.version || '', datos: _json(it.datos) }));
}

export async function ultimaInstantanea(tipo) {
  const res = await wixData.query(C_STATS).eq('tipo', tipo).descending('fecha').limit(1).find(AUTH);
  const it = res.items && res.items[0];
  if (!it) return null;
  return { dia: String(it.clave || '').split(':')[1] || '', version: it.version || '', datos: _json(it.datos) };
}

// ═══════════════════════════════════════════════════════════════════════════
// CORPUS
// ═══════════════════════════════════════════════════════════════════════════

export async function calcularCorpus() {
  const t0 = Date.now();
  const q = () => wixData.query(C_KNOWLEDGE);

  const [
    indice, total, inactivos, sinCategoria, grandes, titulosCorruptos, altasGestor,
    porCategoria, porOrigen, porTipo, porAutor
  ] = await Promise.all([
    _leerIndice(),
    q().count(AUTH),
    q().eq('activo', false).count(AUTH),
    q().isEmpty('category').count(AUTH),
    q().gt('charLength', MAX_CONTENT_CHARS).count(AUTH),
    q().contains('title', '¡').count(AUTH),
    q().startsWith('sourceId', 'gestor_').count(AUTH),
    _agrupar(C_KNOWLEDGE, null, ['category']),
    _agrupar(C_KNOWLEDGE, null, ['categorySource']),
    _agrupar(C_KNOWLEDGE, null, ['fileType']),
    _agrupar(C_KNOWLEDGE, wixData.filter().startsWith('sourceId', 'gestor_'), ['autorAlta'])
  ]);

  // Títulos repetidos (mismo `title` exacto). No compara contenido: los
  // duplicados de contenido idéntico (846 en el análisis del 04/10) requieren
  // leer `content` y quedan fuera de v1.
  const porTitulo = await _agrupar(C_KNOWLEDGE, null, ['title']);
  let gruposTituloRepetido = 0;
  let copiasTituloRepetido = 0;
  porTitulo.forEach((g) => {
    if (g.title && g.count > 1) { gruposTituloRepetido++; copiasTituloRepetido += g.count - 1; }
  });

  const categorias = {};
  indice.forEach((c) => { categorias[c] = 0; });
  const fueraDeIndice = {};
  porCategoria.forEach((g) => {
    const c = g.category || '';
    if (!c) return;   // sin categoría ya está contado aparte
    if (Object.prototype.hasOwnProperty.call(categorias, c)) categorias[c] = g.count;
    else fueraDeIndice[c] = g.count;
  });
  const categoriasVacias = indice.filter((c) => !categorias[c]);

  const mapa = (lista, campo) => {
    const m = {};
    lista.forEach((g) => _sumar(m, g[campo], g.count));
    return m;
  };

  const datos = {
    total,
    activos: total - inactivos,
    inactivos,
    sinCategoria,
    grandes,
    titulosCorruptos,
    altasGestor,
    gruposTituloRepetido,
    copiasTituloRepetido,
    indiceCategorias: indice.length,
    categorias,
    categoriasVacias,
    fueraDeIndice,
    origen: mapa(porOrigen, 'categorySource'),
    tipos: mapa(porTipo, 'fileType'),
    autoresAlta: mapa(porAutor, 'autorAlta'),
    calculadoEn: new Date().toISOString(),
    ms: Date.now() - t0
  };

  console.log(`${TAG} calcularCorpus total=${total} inactivos=${inactivos} sinCat=${sinCategoria} titRep=${gruposTituloRepetido} ${datos.ms}ms`);
  return datos;
}

// ═══════════════════════════════════════════════════════════════════════════
// USO Y COMPORTAMIENTO DE UN DÍA
// ═══════════════════════════════════════════════════════════════════════════

export async function calcularDia(dia) {
  if (!esDia(dia)) throw new Error(`Día no válido: ${dia}`);
  const t0 = Date.now();
  const { desde, hasta } = _rangoUTC(dia);
  const excluir = new Set(CONFIG.EXCLUIR_USUARIOS);
  const delDia = (f) => f && diaDe(f) === dia;

  const [logsBrutos, sesionesBrutas] = await Promise.all([
    _todos(
      wixData.query(C_LOG)
        .eq('cursoRef', CONFIG.CURSO_ID)
        .hasSome('category', CATS_LOG)
        .ge('timestamp', desde)
        .lt('timestamp', hasta)
    ),
    _todos(
      wixData.query(C_SESSIONS)
        .eq('cursoRef', CONFIG.CURSO_ID)
        .ge('fechaCreacion', desde)
        .lt('fechaCreacion', hasta)
    )
  ]);

  const logs = logsBrutos.filter((l) => delDia(l.timestamp) && !excluir.has(l.usuarioId || ''));
  const sesiones = sesionesBrutas.filter((s) => delDia(s.fechaCreacion) && !excluir.has(s.usuarioId || ''));

  const datos = {
    dia,
    consultas: 0,
    usuarios: [],
    sesionesConConsulta: 0,
    tiempos: { total: [], prep: [], api: [], sinMedicion: 0 },
    respLen: [],
    tokens: { entrada: [], salida: [], conCache: 0, conDato: 0 },
    modelos: {},
    horas: {},
    rag: { filas: 0, sinCategoria: 0, categorias: {}, fuentes: {} },
    srcInfo: {},
    tarjetas: {},
    tts: { total: 0, fallos: 0, errores: {}, voces: {} },
    errores: {},
    sesiones: { total: sesiones.length, anonimas: 0, mensajes: [] }
  };

  const usuarios = new Set();
  const sesionesCon = new Set();

  logs.forEach((l) => {
    const p = _json(l.parameters);

    if (l.category === 'cathovia') {
      datos.consultas++;
      if (l.usuarioId) usuarios.add(l.usuarioId);
      if (l.sesionRef) sesionesCon.add(l.sesionRef);
      _sumar(datos.horas, _horaDe(l.timestamp));
      if (p.modeloUsado) _sumar(datos.modelos, p.modeloUsado);

      const prep = Number(p.prepMs) || 0;
      if (prep > 0 && Number(l.timeMs) > 0) {
        datos.tiempos.total.push(Number(l.timeMs));
        datos.tiempos.prep.push(prep);
        datos.tiempos.api.push(Number(p.apiMs) || 0);
      } else {
        datos.tiempos.sinMedicion++;
      }

      if (l.responseSummary) datos.respLen.push(String(l.responseSummary).length);

      if (p.inputTokens !== undefined) {
        datos.tokens.conDato++;
        datos.tokens.entrada.push(Number(p.inputTokens) || 0);
        datos.tokens.salida.push(Number(p.outputTokens) || 0);
        if (Number(p.cacheHit) > 0) datos.tokens.conCache++;
      }
      return;
    }

    if (l.category === 'cathovia_rag') {
      datos.rag.filas++;
      const cats = Array.isArray(p.categories) ? p.categories : [];
      if (cats.length === 0) datos.rag.sinCategoria++;
      cats.forEach((c) => _sumar(datos.rag.categorias, c));
      (Array.isArray(p.sourceIds) ? p.sourceIds : []).forEach((s) => _sumar(datos.rag.fuentes, s));
      return;
    }

    if (l.category === 'cathovia_card_inserted') {
      (Array.isArray(p.cardIds) ? p.cardIds : []).forEach((c) => _sumar(datos.tarjetas, c));
      return;
    }

    if (l.category === 'cathovia_error') {
      _sumar(datos.errores, p.fnName || l.title || 'desconocido');
      return;
    }

    if (l.category === 'egael_tts') {
      datos.tts.total++;
      if (p.voice) _sumar(datos.tts.voces, p.voice);
      if (p.ok === false) {
        datos.tts.fallos++;
        _sumar(datos.tts.errores, p.error || 'desconocido');
      }
    }
  });

  datos.usuarios = Array.from(usuarios);
  datos.sesionesConConsulta = sesionesCon.size;

  // Sesiones: anónimas y mensajes por sesión
  sesiones.forEach((s) => { if (!s.usuarioId) datos.sesiones.anonimas++; });
  if (sesiones.length > 0) {
    const cuenta = {};
    for (const trozo of _trozos(sesiones.map((s) => s._id), TROZO_IDS)) {
      const grupos = await _agrupar(C_MESSAGES, wixData.filter().hasSome('sesionRef', trozo), ['sesionRef']);
      grupos.forEach((g) => { if (g.sesionRef) cuenta[g.sesionRef] = g.count; });
    }
    datos.sesiones.mensajes = sesiones.map((s) => cuenta[s._id] || 0);
  }

  // Título y categoría de los documentos recuperados (para cobertura)
  const ids = Object.keys(datos.rag.fuentes);
  for (const trozo of _trozos(ids, TROZO_IDS)) {
    const grupos = await _agrupar(C_KNOWLEDGE, wixData.filter().hasSome('sourceId', trozo), ['sourceId', 'category', 'titleFixed', 'title']);
    grupos.forEach((g) => {
      if (!g.sourceId) return;
      datos.srcInfo[g.sourceId] = { t: g.titleFixed || g.title || '', c: g.category || '' };
    });
  }

  datos.calculadoEn = new Date().toISOString();
  datos.ms = Date.now() - t0;
  console.log(`${TAG} calcularDia ${dia} consultas=${datos.consultas} sesiones=${sesiones.length} rag=${datos.rag.filas} ${datos.ms}ms`);
  return datos;
}

// ═══════════════════════════════════════════════════════════════════════════
// JOB NOCTURNO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 1. Corpus de hoy.
 * 2. Uso de ayer (se recalcula siempre).
 * 3. Relleno: días sin instantánea desde la primera consulta de Cathovia,
 *    hasta agotar el presupuesto de tiempo. Lo que falte, la noche siguiente.
 */
export async function calcularInstantaneas() {
  const t0 = Date.now();
  const hoy = diaDe(new Date());
  const ayer = sumarDias(hoy, -1);
  const hechos = [];

  try {
    await guardarInstantanea('corpus', hoy, await calcularCorpus());
    hechos.push(`corpus:${hoy}`);
  } catch (e) {
    console.error(`${TAG} job corpus error:`, e.message);
  }

  try {
    await guardarInstantanea('uso', ayer, await calcularDia(ayer));
    hechos.push(`uso:${ayer}`);
  } catch (e) {
    console.error(`${TAG} job uso ${ayer} error:`, e.message);
  }

  try {
    const primera = await wixData.query(C_LOG)
      .eq('cursoRef', CONFIG.CURSO_ID)
      .eq('category', 'cathovia')
      .ascending('timestamp')
      .limit(1)
      .find(AUTH);
    const primerDia = primera.items && primera.items[0] ? diaDe(primera.items[0].timestamp) : null;

    if (primerDia) {
      const existentes = new Set(
        (await _todos(wixData.query(C_STATS).eq('tipo', 'uso'))).map((it) => String(it.clave || ''))
      );
      for (let d = primerDia; d < ayer; d = sumarDias(d, 1)) {
        if (Date.now() - t0 > JOB_PRESUPUESTO_MS) {
          console.warn(`${TAG} job: presupuesto agotado en ${d}; sigue mañana`);
          break;
        }
        if (existentes.has(`uso:${d}`)) continue;
        await guardarInstantanea('uso', d, await calcularDia(d));
        hechos.push(`uso:${d}`);
      }
    }
  } catch (e) {
    console.error(`${TAG} job relleno error:`, e.message);
  }

  console.log(`${TAG} job fin: ${hechos.length} instantáneas en ${Date.now() - t0}ms`);
  return { ok: true, hechos };
}
