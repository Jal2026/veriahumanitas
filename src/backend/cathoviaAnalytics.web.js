/* ═══════════════════════════════════════════════════════════════════════════
 * VERIA HUMANITAS — CATHOVIA · Analizador (backend)
 * Archivo:  backend/cathoviaAnalytics.web.js
 * VERSION:  1.2.0
 * FECHA:    4 Octubre 2026
 *
 * CAMBIOS v1.1.0 → v1.2.0 — PROCESAR EL HISTÓRICO DESDE EL PANEL:
 *   1. Nuevo procesarClimaLote({ max }) sobre interpretarLote de
 *      cathoviaClima v1.1.0. Requiere cathoviaClima v1.1.0.
 *   2. cargarAnalizador devuelve `primeraConsulta`: día de la primera
 *      consulta de Cathovia en EgaelLog. El panel recalcula desde ahí.
 *
 * CAMBIOS v1.0.0 → v1.1.0 — INTÉRPRETE EMOCIONAL (pestaña Clima):
 *   Tres métodos nuevos sobre backend/cathoviaClima.js. Los de v1.0.0 no
 *   cambian.
 *     leerClima({ desde, hasta })            agregados de las interpretaciones
 *     generarLecturaClima({ desde, hasta })  lectura del periodo con Sonnet
 *     leerLecturaClima({ desde, hasta })     recoge la lectura guardada
 *   generarLecturaClima puede superar los ~14 s: si el widget recibe error
 *   de conexión, el backend termina y guarda; leerLecturaClima la recoge.
 *
 * QUÉ ES
 *   webMethods del Analizador. Leen las instantáneas de CathoviaStats
 *   (calculadas por backend/cathoviaAnalyticsCore.js) y devuelven SOLO
 *   agregados: ningún usuarioId, ningún texto de conversación viaja al
 *   widget.
 *
 * SEGURIDAD
 *   Igual que el Gestor del corpus: acceso a la página por roles de miembro
 *   de Wix; métodos con Permissions.SiteMember.
 *   ⚠️ Mismo riesgo abierto que el Gestor: cualquier miembro con sesión
 *   podría invocarlos. Se cierra con currentMember.getRoles() cuando se
 *   decida el nombre del rol.
 *
 * TIEMPOS
 *   cargarAnalizador y leerPeriodo solo leen CathoviaStats: rápidos.
 *   recalcularDia y recalcularCorpus calculan en vivo. Si superan los ~14 s
 *   el widget recibe error de conexión, pero el backend termina y guarda la
 *   instantánea: basta con recargar el periodo.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { webMethod, Permissions } from 'wix-web-module';
import wixData from 'wix-data';
import {
  VERSION as CORE_VERSION,
  CONFIG,
  diaDe,
  esDia,
  sumarDias,
  calcularDia,
  calcularCorpus,
  guardarInstantanea,
  leerInstantaneas,
  ultimaInstantanea
} from 'backend/cathoviaAnalyticsCore';
import {
  VERSION as CLIMA_VERSION,
  leerInterpretaciones,
  resumirClima,
  generarLectura,
  leerLectura,
  interpretarLote
} from 'backend/cathoviaClima';

const VERSION = '1.2.0';
const TAG = `[CathoviaAnalyticsWeb][${VERSION}]`;
const AUTH = { suppressAuth: true };

const MAX_DIAS_PERIODO = 366;
const TOP_DOCUMENTOS = 25;

// ═══════════════════════════════════════════════════════════════════════════
// ESTADÍSTICA
// ═══════════════════════════════════════════════════════════════════════════

function _ordenar(a) { return a.slice().sort((x, y) => x - y); }

/** Percentil por rango más cercano. null si no hay datos. */
function _pct(lista, p) {
  if (!lista || lista.length === 0) return null;
  const s = _ordenar(lista);
  const i = Math.min(s.length - 1, Math.max(0, Math.ceil(p * s.length) - 1));
  return s[i];
}

function _proporcion(parte, todo) {
  return todo > 0 ? Math.round((parte / todo) * 1000) / 10 : null;   // % con 1 decimal
}

function _sumarMapa(destino, origen) {
  Object.keys(origen || {}).forEach((k) => { destino[k] = (destino[k] || 0) + (Number(origen[k]) || 0); });
}

/** Indicadores de comportamiento sobre un conjunto de días ya agregados. */
function _indicadores(acc) {
  const lim = CONFIG.LIMITE_CONEXION_MS;
  const obj = CONFIG.OBJETIVO_LONGITUD;
  const medidas = acc.total.length;
  const cortes = acc.total.filter((t) => t > lim).length;
  const largas = acc.respLen.filter((n) => n > obj).length;
  return {
    consultas: acc.consultas,
    medidas,
    sinMedicion: acc.sinMedicion,
    total:  { p50: _pct(acc.total, 0.5), p90: _pct(acc.total, 0.9), max: medidas ? Math.max(...acc.total) : null },
    prep:   { p50: _pct(acc.prep, 0.5),  p90: _pct(acc.prep, 0.9) },
    api:    { p50: _pct(acc.api, 0.5),   p90: _pct(acc.api, 0.9) },
    cortes,
    pctCortes: _proporcion(cortes, medidas),
    longitud: { p50: _pct(acc.respLen, 0.5), p90: _pct(acc.respLen, 0.9), objetivo: obj, sobreObjetivo: largas, pctSobreObjetivo: _proporcion(largas, acc.respLen.length) },
    tokens: { entradaP50: _pct(acc.entrada, 0.5), salidaP50: _pct(acc.salida, 0.5), conDato: acc.conDato, conCache: acc.conCache, pctCache: _proporcion(acc.conCache, acc.conDato) }
  };
}

function _accVacio() {
  return { consultas: 0, total: [], prep: [], api: [], sinMedicion: 0, respLen: [], entrada: [], salida: [], conDato: 0, conCache: 0 };
}

function _acumular(acc, d) {
  acc.consultas += d.consultas || 0;
  const t = d.tiempos || {};
  acc.total.push(...(t.total || []));
  acc.prep.push(...(t.prep || []));
  acc.api.push(...(t.api || []));
  acc.sinMedicion += t.sinMedicion || 0;
  acc.respLen.push(...(d.respLen || []));
  const k = d.tokens || {};
  acc.entrada.push(...(k.entrada || []));
  acc.salida.push(...(k.salida || []));
  acc.conDato += k.conDato || 0;
  acc.conCache += k.conCache || 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// DATOS DE APOYO
// ═══════════════════════════════════════════════════════════════════════════

/** Versiones publicadas del alineamiento de Cathovia, por fecha. */
async function _versiones() {
  const res = await wixData.query('EgaelAlignment')
    .eq('cursoRef', CONFIG.CURSO_ID)
    .isNotEmpty('fechaPublicacion')
    .ascending('fechaPublicacion')
    .limit(1000)
    .find(AUTH);
  return (res.items || []).map((a) => ({
    version: String(a.version || ''),
    estado: a.estado || '',
    dia: diaDe(a.fechaPublicacion),
    tono: a.tono || '',
    nivelDetalle: a.nivelDetalle || ''
  }));
}

/** Tipo y título de las tarjetas del catálogo. */
async function _catalogo(ids) {
  if (!ids.length) return {};
  const res = await wixData.query('EgaelCatalog').hasSome('_id', ids).limit(1000).find(AUTH);
  const m = {};
  (res.items || []).forEach((c) => { m[c._id] = { tipo: c.type || '', titulo: c.title || '' }; });
  return m;
}

/** Versión vigente en un día: la última publicada ese día o antes. */
function _versionDelDia(versiones, dia) {
  let v = '';
  versiones.forEach((x) => { if (x.dia <= dia) v = x.version; });
  return v;
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. CARGA INICIAL
// ═══════════════════════════════════════════════════════════════════════════

export const cargarAnalizador = webMethod(
  Permissions.SiteMember,
  async () => {
    try {
      const [corpus, primera, ultima, primeraLog] = await Promise.all([
        ultimaInstantanea('corpus'),
        wixData.query('CathoviaStats').eq('tipo', 'uso').ascending('fecha').limit(1).find(AUTH),
        wixData.query('CathoviaStats').eq('tipo', 'uso').descending('fecha').limit(1).find(AUTH),
        wixData.query('EgaelLog').eq('cursoRef', CONFIG.CURSO_ID).eq('category', 'cathovia').ascending('timestamp').limit(1).find(AUTH)
      ]);
      const diaDeFila = (r) => (r.items && r.items[0] ? String(r.items[0].clave || '').split(':')[1] : null);

      console.log(`${TAG} cargarAnalizador corpus=${corpus ? corpus.dia : '—'}`);
      return {
        ok: true,
        version: VERSION,
        coreVersion: CORE_VERSION,
        climaVersion: CLIMA_VERSION,
        hoy: diaDe(new Date()),
        primeraConsulta: primeraLog.items && primeraLog.items[0] ? diaDe(primeraLog.items[0].timestamp) : null,
        primerDia: diaDeFila(primera),
        ultimoDia: diaDeFila(ultima),
        corpus,
        config: {
          objetivoLongitud: CONFIG.OBJETIVO_LONGITUD,
          limiteConexionMs: CONFIG.LIMITE_CONEXION_MS,
          usuariosExcluidos: CONFIG.EXCLUIR_USUARIOS.length
        }
      };
    } catch (e) {
      console.error(`${TAG} cargarAnalizador error:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 2. PERIODO
// ═══════════════════════════════════════════════════════════════════════════

export const leerPeriodo = webMethod(
  Permissions.SiteMember,
  async ({ desde, hasta }) => {
    try {
      if (!esDia(desde) || !esDia(hasta)) return { ok: false, error: 'Fechas no válidas (AAAA-MM-DD).' };
      if (desde > hasta) return { ok: false, error: 'La fecha inicial es posterior a la final.' };
      if (sumarDias(desde, MAX_DIAS_PERIODO) < hasta) return { ok: false, error: `El periodo no puede superar ${MAX_DIAS_PERIODO} días.` };

      const [dias, corpusSerie, corpusUltimo, versiones] = await Promise.all([
        leerInstantaneas('uso', desde, hasta),
        leerInstantaneas('corpus', desde, hasta),
        ultimaInstantanea('corpus'),
        _versiones()
      ]);

      // ── Acumulados del periodo ──
      const acc = _accVacio();
      const porVersion = {};
      const usuarios = {};          // usuarioId → días con actividad (no sale del backend)
      const horas = {};
      const semana = [0, 0, 0, 0, 0, 0, 0];   // 0 = domingo
      const modelos = {};
      const rag = { filas: 0, sinCategoria: 0, categorias: {}, fuentes: {} };
      const srcInfo = {};
      const tarjetas = {};
      const tts = { total: 0, fallos: 0, errores: {}, voces: {} };
      const errores = {};
      const ses = { total: 0, anonimas: 0, sinMensajes: 0, unaPregunta: 0, mensajes: [] };
      let sesionesConConsulta = 0;
      const serie = [];

      dias.forEach(({ dia, datos: d }) => {
        _acumular(acc, d);

        const v = _versionDelDia(versiones, dia) || '—';
        if (!porVersion[v]) porVersion[v] = _accVacio();
        _acumular(porVersion[v], d);

        (d.usuarios || []).forEach((u) => { usuarios[u] = (usuarios[u] || 0) + 1; });
        _sumarMapa(horas, d.horas);
        semana[new Date(dia + 'T12:00:00Z').getUTCDay()] += d.consultas || 0;
        _sumarMapa(modelos, d.modelos);

        const r = d.rag || {};
        rag.filas += r.filas || 0;
        rag.sinCategoria += r.sinCategoria || 0;
        _sumarMapa(rag.categorias, r.categorias);
        _sumarMapa(rag.fuentes, r.fuentes);
        Object.assign(srcInfo, d.srcInfo || {});

        _sumarMapa(tarjetas, d.tarjetas);

        const t = d.tts || {};
        tts.total += t.total || 0;
        tts.fallos += t.fallos || 0;
        _sumarMapa(tts.errores, t.errores);
        _sumarMapa(tts.voces, t.voces);

        _sumarMapa(errores, d.errores);

        const s = d.sesiones || {};
        const msgs = s.mensajes || [];
        ses.total += s.total || 0;
        ses.anonimas += s.anonimas || 0;
        ses.sinMensajes += msgs.filter((n) => n === 0).length;
        ses.unaPregunta += msgs.filter((n) => n === 2).length;
        ses.mensajes.push(...msgs.filter((n) => n > 0));
        sesionesConConsulta += d.sesionesConConsulta || 0;

        const tt = (d.tiempos && d.tiempos.total) || [];
        serie.push({
          dia,
          version: v,
          consultas: d.consultas || 0,
          sesiones: s.total || 0,
          usuarios: (d.usuarios || []).length,
          totalP50: _pct(tt, 0.5),
          prepP50: _pct((d.tiempos && d.tiempos.prep) || [], 0.5),
          apiP50: _pct((d.tiempos && d.tiempos.api) || [], 0.5),
          cortes: tt.filter((x) => x > CONFIG.LIMITE_CONEXION_MS).length,
          medidas: tt.length,
          longitudP50: _pct(d.respLen || [], 0.5)
        });
      });

      // ── Uso ──
      const idsUsuarios = Object.keys(usuarios);
      const uso = {
        consultas: acc.consultas,
        sesiones: ses.total,
        sesionesConConsulta,
        anonimas: ses.anonimas,
        usuarios: idsUsuarios.length,
        recurrentes: idsUsuarios.filter((u) => usuarios[u] > 1).length,
        sinMensajes: ses.sinMensajes,
        unaPregunta: ses.unaPregunta,
        conMensajes: ses.mensajes.length,
        pctUnaPregunta: _proporcion(ses.unaPregunta, ses.mensajes.length),
        preguntasPorSesionP50: ses.mensajes.length ? _pct(ses.mensajes, 0.5) / 2 : null,
        horas,
        semana
      };

      // ── Comportamiento ──
      const versionesEnPeriodo = Object.keys(porVersion).map((v) => ({ version: v, ..._indicadores(porVersion[v]) }));
      const idsTarjetas = Object.keys(tarjetas);
      const cat = await _catalogo(idsTarjetas);
      const tarjetasDet = idsTarjetas
        .map((id) => ({ id, veces: tarjetas[id], tipo: (cat[id] && cat[id].tipo) || '', titulo: (cat[id] && cat[id].titulo) || '(no encontrada)' }))
        .sort((a, b) => b.veces - a.veces);
      const tarjetasPorTipo = {};
      tarjetasDet.forEach((t) => { tarjetasPorTipo[t.tipo || '—'] = (tarjetasPorTipo[t.tipo || '—'] || 0) + t.veces; });

      const comportamiento = {
        ..._indicadores(acc),
        modelos,
        porVersion: versionesEnPeriodo,
        versiones,
        rag: {
          filas: rag.filas,
          sinCategoria: rag.sinCategoria,
          pctSinCategoria: _proporcion(rag.sinCategoria, rag.filas),
          documentosDistintos: Object.keys(rag.fuentes).length
        },
        tarjetas: tarjetasDet,
        tarjetasPorTipo,
        alertaTarjetas: tarjetasDet.filter((t) => t.tipo === 'curso' || t.tipo === 'evento'),
        tts: { ...tts, pctFallos: _proporcion(tts.fallos, tts.total) },
        errores
      };

      // ── Cobertura (corpus × uso) ──
      const docsPorCat = (corpusUltimo && corpusUltimo.datos && corpusUltimo.datos.categorias) || {};
      const usadosPorCat = {};
      const recupPorCat = {};
      Object.keys(rag.fuentes).forEach((id) => {
        const c = (srcInfo[id] && srcInfo[id].c) || '';
        usadosPorCat[c] = (usadosPorCat[c] || 0) + 1;
        recupPorCat[c] = (recupPorCat[c] || 0) + rag.fuentes[id];
      });
      const nombres = new Set([...Object.keys(docsPorCat), ...Object.keys(usadosPorCat), ...Object.keys(rag.categorias)]);
      const categorias = Array.from(nombres).map((c) => ({
        categoria: c || '(sin categoría)',
        documentos: docsPorCat[c] || 0,
        documentosUsados: usadosPorCat[c] || 0,
        recuperaciones: recupPorCat[c] || 0,
        detecciones: rag.categorias[c] || 0
      })).sort((a, b) => (b.recuperaciones + b.detecciones) - (a.recuperaciones + a.detecciones));

      const topDocumentos = Object.keys(rag.fuentes)
        .map((id) => ({
          sourceId: id,
          titulo: (srcInfo[id] && srcInfo[id].t) || '(ya no está en el corpus)',
          categoria: (srcInfo[id] && srcInfo[id].c) || '',
          veces: rag.fuentes[id]
        }))
        .sort((a, b) => b.veces - a.veces)
        .slice(0, TOP_DOCUMENTOS);

      const totalCorpus = corpusUltimo && corpusUltimo.datos ? corpusUltimo.datos.total : null;
      const cobertura = {
        documentosCorpus: totalCorpus,
        documentosUsados: Object.keys(rag.fuentes).length,
        pctCorpusUsado: totalCorpus ? _proporcion(Object.keys(rag.fuentes).length, totalCorpus) : null,
        categorias,
        topDocumentos
      };

      // ── Corpus ──
      const corpus = {
        ultimo: corpusUltimo,
        serie: corpusSerie.map(({ dia, datos: c }) => ({
          dia, total: c.total, activos: c.activos, inactivos: c.inactivos, sinCategoria: c.sinCategoria
        }))
      };

      console.log(`${TAG} leerPeriodo ${desde}→${hasta} días=${dias.length} consultas=${acc.consultas}`);
      return {
        ok: true,
        periodo: { desde, hasta, diasConDatos: dias.length },
        uso,
        comportamiento,
        cobertura,
        corpus,
        serie
      };

    } catch (e) {
      console.error(`${TAG} leerPeriodo error:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 3. RECÁLCULO MANUAL
// ═══════════════════════════════════════════════════════════════════════════

export const recalcularDia = webMethod(
  Permissions.SiteMember,
  async ({ dia }) => {
    try {
      if (!esDia(dia)) return { ok: false, error: 'Día no válido (AAAA-MM-DD).' };
      if (dia > diaDe(new Date())) return { ok: false, error: 'No se puede calcular un día futuro.' };
      const datos = await calcularDia(dia);
      await guardarInstantanea('uso', dia, datos);
      return { ok: true, dia, consultas: datos.consultas, ms: datos.ms };
    } catch (e) {
      console.error(`${TAG} recalcularDia error:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

export const recalcularCorpus = webMethod(
  Permissions.SiteMember,
  async () => {
    try {
      const hoy = diaDe(new Date());
      const datos = await calcularCorpus();
      await guardarInstantanea('corpus', hoy, datos);
      return { ok: true, dia: hoy, corpus: { dia: hoy, version: CORE_VERSION, datos } };
    } catch (e) {
      console.error(`${TAG} recalcularCorpus error:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 4. CLIMA (intérprete emocional)
// ═══════════════════════════════════════════════════════════════════════════

function _validarPeriodo(desde, hasta) {
  if (!esDia(desde) || !esDia(hasta)) return 'Fechas no válidas (AAAA-MM-DD).';
  if (desde > hasta) return 'La fecha inicial es posterior a la final.';
  if (sumarDias(desde, MAX_DIAS_PERIODO) < hasta) return `El periodo no puede superar ${MAX_DIAS_PERIODO} días.`;
  return '';
}

export const leerClima = webMethod(
  Permissions.SiteMember,
  async ({ desde, hasta }) => {
    try {
      const err = _validarPeriodo(desde, hasta);
      if (err) return { ok: false, error: err };
      const [filas, lectura] = await Promise.all([leerInterpretaciones(desde, hasta), leerLectura(desde, hasta)]);
      const clima = resumirClima(filas);
      console.log(`${TAG} leerClima ${desde}→${hasta} conversaciones=${clima.conversaciones} interpretadas=${clima.interpretadas}`);
      return { ok: true, periodo: { desde, hasta }, clima, lectura };
    } catch (e) {
      console.error(`${TAG} leerClima error:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

export const generarLecturaClima = webMethod(
  Permissions.SiteMember,
  async ({ desde, hasta }) => {
    try {
      const err = _validarPeriodo(desde, hasta);
      if (err) return { ok: false, error: err };
      return { ok: true, lectura: await generarLectura(desde, hasta) };
    } catch (e) {
      console.error(`${TAG} generarLecturaClima error:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

export const leerLecturaClima = webMethod(
  Permissions.SiteMember,
  async ({ desde, hasta }) => {
    try {
      const err = _validarPeriodo(desde, hasta);
      if (err) return { ok: false, error: err };
      return { ok: true, lectura: await leerLectura(desde, hasta) };
    } catch (e) {
      console.error(`${TAG} leerLecturaClima error:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

export const procesarClimaLote = webMethod(
  Permissions.SiteMember,
  async ({ max }) => {
    try {
      return { ok: true, ...(await interpretarLote(max)) };
    } catch (e) {
      console.error(`${TAG} procesarClimaLote error:`, e.message);
      return { ok: false, error: e.message };
    }
  }
);

/* ═══════════════════════════════════════════════════════════════════════════
 * MÉTODOS EXPUESTOS
 * ═══════════════════════════════════════════════════════════════════════════
 *   cargarAnalizador()
 *   leerPeriodo({ desde, hasta })        días 'AAAA-MM-DD', máx. 366
 *   recalcularDia({ dia })
 *   recalcularCorpus()
 *   leerClima({ desde, hasta })
 *   generarLecturaClima({ desde, hasta })
 *   leerLecturaClima({ desde, hasta })
 *   procesarClimaLote({ max })            máx. 3 por llamada
 * ═══════════════════════════════════════════════════════════════════════════
 */
