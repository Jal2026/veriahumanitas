/* ═══════════════════════════════════════════════════════════════════════════
 * VERIA HUMANITAS — CATHOVIA · Analizador · Intérprete emocional (Clima)
 * Archivo:  backend/cathoviaClima.js
 * VERSION:  1.3.0
 * FECHA:    4 Octubre 2026
 *
 * CAMBIOS v1.2.1 → v1.3.0 — LECTURA CON COMPORTAMIENTO Y MENOS SESGOS:
 *   1. generarLectura envía a Sonnet, además del Clima, los indicadores de
 *      comportamiento del periodo leídos de las instantáneas de uso
 *      (CathoviaStats): cortes probables (> CONFIG.LIMITE_CONEXION_MS),
 *      tiempo mediano, longitud mediana frente a CONFIG.OBJETIVO_LONGITUD y
 *      conversaciones de una sola pregunta. Mismo cálculo que el panel.
 *   2. Desenlace separado entre conversaciones de una sola pregunta y de
 *      varias (campo `turnos` de cada interpretación).
 *   3. Reglas nuevas en el prompt: el desenlace indeterminado de una sola
 *      pregunta es falta de datos, no un fallo; las pruebas de la herramienta
 *      no son uso real ni aciertos ni fallos; la relación entre abandono,
 *      cortes y longitud se presenta como hipótesis, no como causa.
 *   La firma de generarLectura no cambia: el web module no se toca.
 *
 * CAMBIOS v1.2.0 → v1.2.1 — «PRUEBA LA HERRAMIENTA» SOLO SI ES LITERAL:
 *   Una pregunta normal puede ser una prueba o curiosidad real, y no se
 *   distingue. prueba_herramienta queda solo para lo que suena literalmente
 *   a prueba (test, probando, ¿funciona?, comprobar el micrófono) o para
 *   pedir un documento concreto por su nombre («busca un documento que se
 *   llama…»). Cualquier otra pregunta va a la intención de su contenido.
 *   CRITERIO '2' → '3': todo se reinterpreta al procesar.
 *
 * CAMBIOS v1.1.0 → v1.2.0 — INTÉRPRETE MÁS EXIGENTE Y EXCLUSIONES:
 *   1. CRITERIO DE TONO EXPLÍCITO. Con el prompt de v1.0 Haiku daba un 99 %
 *      de tono adecuado, incluidas personas angustiadas o dolidas. Ahora
 *      "adecuado" exige cumplir todos los criterios; "parcial" e
 *      "inadecuado" tienen casos concretos (respuesta enciclopédica a una
 *      pregunta breve, no reconocer la emoción expresada, doctrina ante el
 *      dolor, juicio moral no pedido…). El modelo ve además la longitud real
 *      de cada respuesta, aunque el texto llegue recortado.
 *   2. REINTERPRETACIÓN AUTOMÁTICA. Cada interpretación guarda `criterio`
 *      (CRITERIO). Las hechas con otro criterio pasan a pendientes: el botón
 *      «Procesar histórico ahora» y el job las rehacen sin más cambios.
 *   3. EXCLUSIONES. Las conversaciones de CONFIG.EXCLUIR_USUARIOS ya
 *      interpretadas se marcan estado 'excluida' y no cuentan en el resumen.
 *   Sin cambios de firma en los métodos exportados.
 *
 * CAMBIOS v1.0.0 → v1.1.0 — PROCESAR EL HISTÓRICO DESDE EL PANEL:
 *   Nuevo interpretarLote(max): interpreta hasta `max` conversaciones
 *   pendientes (por defecto 3, una tanda en paralelo) y devuelve cuántas
 *   quedan. El panel lo llama en bucle para procesar todo el histórico sin
 *   esperar al job. Cada llamada queda por debajo de los ~14 s del corte de
 *   Wix; si alguna lo supera, el backend termina y la siguiente sigue.
 *   La selección de pendientes y el bucle se comparten con el job
 *   (_pendientes, _procesarLista): el job no cambia de comportamiento.
 *
 * QUÉ ES
 *   Interpreta cómo llega la gente a Cathovia y si se va mejor de lo que vino.
 *   Esquema híbrido en tres capas:
 *     1. Señales por código (gratis, deterministas): abandono, quejas de
 *        corte, reformulaciones, agradecimientos, frustración.
 *     2. Interpretación por conversación con Haiku 4.5: taxonomía cerrada,
 *        JSON validado aquí. Lo que no esté en la taxonomía se descarta.
 *     3. Lectura del periodo con Sonnet, sobre agregados y descripciones
 *        neutras. Nunca recibe texto literal de las conversaciones.
 *
 * CUÁNDO
 *   Capa 1 y 2: job nocturno (backend/jobs.config → interpretarPendientes).
 *   Una conversación se interpreta cuando lleva CIERRE_MS sin actividad, y
 *   se reinterpreta si después recibe mensajes nuevos.
 *   Capa 3: bajo demanda desde el panel (generarLectura).
 *
 * ⚠️ COLECCIÓN NUEVA: CathoviaInterpretaciones — crear en el CMS:
 *     sesionRef       TEXT      _id de EgaelSessions
 *     fecha           DATETIME  fechaCreacion de la sesión
 *     interpretadoEn  DATETIME  cuándo se interpretó
 *     turnos          NUMBER    mensajes del usuario
 *     senales         TEXT      JSON de la capa 1
 *     interpretacion  TEXT      JSON de la capa 2 (o del error)
 *     estado          TEXT      'ok' | 'error' | 'sin_mensajes'
 *     modelo          TEXT
 *     version         TEXT
 *   Permisos: solo Admin. No guarda usuarioId; sesionRef sí permite volver
 *   a la sesión: es seudonimizado, no anónimo. El panel solo ve agregados.
 *
 * PRIVACIDAD
 *   - Antes de enviar texto al modelo se quitan correos, URL, teléfonos,
 *     DNI/NIE e IBAN (_anonimizar). Los nombres propios no se pueden quitar
 *     con fiabilidad: el prompt prohíbe reproducirlos.
 *   - `motivo` (descripción de la conversación) se pide neutra y sin datos
 *     personales. Solo lo recibe Sonnet en la capa 3; no viaja al widget.
 *   - Finalidad nueva sobre datos de categoría especial (art. 9 RGPD):
 *     debe constar en la política de privacidad antes de activarlo.
 *
 * LÍMITE DE TIEMPO DE LA CAPA 3
 *   Sonnet puede tardar más de los ~14 s en que Wix corta la conexión. El
 *   backend termina igualmente y guarda la lectura en CathoviaStats
 *   (tipo 'lectura'); el widget la recoge con leerLectura().
 *
 * Secret: EGAEL_API_KEY
 * ═══════════════════════════════════════════════════════════════════════════
 */

import wixData from 'wix-data';
import { fetch } from 'wix-fetch';
import { getSecret } from 'wix-secrets-backend';
import { CONFIG, C_STATS, diaDe, esDia, leerInstantaneas } from 'backend/cathoviaAnalyticsCore';

export const VERSION = '1.3.0';

// Versión del criterio de interpretación. Cambiarla obliga a reinterpretar todo.
const CRITERIO = '3';
const TAG = `[CathoviaClima][${VERSION}]`;
const AUTH = { suppressAuth: true };

const C_INTERP   = 'CathoviaInterpretaciones';
const C_SESSIONS = 'EgaelSessions';
const C_MESSAGES = 'EgaelMessages';

const SECRET_API      = 'EGAEL_API_KEY';
const MODELO_INTERPRETE = 'claude-haiku-4-5';    // mismo que proponerCategoria
const MODELO_LECTURA    = 'claude-sonnet-4-6';   // mismo primario que cathoviaBackend

const CIERRE_MS          = 2 * 3600000;   // sin actividad desde hace 2 h = conversación cerrada
const JOB_PRESUPUESTO_MS = 240000;        // los jobs de Wix se cortan a los 5 min
const EN_PARALELO        = 3;
const MAX_INTENTOS       = 3;
const MAX_TRANSCRIPCION  = 9000;          // caracteres enviados por conversación
const MAX_TURNO_ASISTENTE = 700;          // de cada respuesta solo el principio
const MAX_MOTIVOS_LECTURA = 40;
const LOTE_MAX           = 3;             // interpretarLote: una tanda en paralelo
const LOTE_PRESUPUESTO_MS = 9000;         // no empezar otra tanda pasado este tiempo

// ── Taxonomía (capa 2). Cambiarla aquí; el prompt y la validación la leen. ──
export const TAXONOMIA = {
  intencion: ['aprender', 'duda_de_fe', 'situacion_vital', 'busca_recurso', 'prueba_herramienta', 'otra'],
  emocion: ['sereno', 'curioso', 'inquieto', 'angustiado', 'dolido', 'esperanzado', 'agradecido', 'frustrado_herramienta', 'indeterminado'],
  intensidad: ['baja', 'media', 'alta'],
  necesidadPersona: ['ninguna', 'conveniente', 'clara'],
  derivo: ['si', 'no', 'no_aplica'],
  tono: ['adecuado', 'parcial', 'inadecuado'],
  desenlace: ['resuelto', 'insatisfecho', 'abandono', 'indeterminado']
};

const DESCRIPCION_TAXONOMIA = [
  'intencion: aprender (entender un tema) | duda_de_fe (duda personal sobre creer o practicar) | situacion_vital (familia, duelo, enfermedad, moral práctica, relación) | busca_recurso (parroquia, sacramento, horario, contacto) | prueba_herramienta (SOLO si suena literalmente a prueba: "test", "esto es una prueba", "probando", "¿funcionas?", comprobar el micrófono o el audio; o si pide localizar un documento concreto por su nombre, p. ej. "busca un documento que se llama…") | otra',
  'emocion (al llegar, en los mensajes del usuario): sereno | curioso | inquieto | angustiado | dolido | esperanzado | agradecido | frustrado_herramienta | indeterminado',
  'intensidad: baja | media | alta',
  'necesidadPersona (¿le convendría hablar con un sacerdote, catequista o guía?): ninguna | conveniente | clara',
  'derivo (¿Cathovia sugirió hablar con una persona cuando hacía falta?): si | no | no_aplica (no hacía falta)',
  'tono (¿las respuestas de Cathovia encajaron con el estado y la necesidad del usuario? criterios abajo): adecuado | parcial | inadecuado',
  'desenlace (inferido del final): resuelto | insatisfecho | abandono | indeterminado (criterios abajo)',
  'senalCrisis: true solo si hay indicios de riesgo para la persona (autolesión, desesperación grave, abuso, violencia)'
].join('\n');

const EMOCIONES_DIFICILES = ['inquieto', 'angustiado', 'dolido'];

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

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

function _json(v) {
  if (v && typeof v === 'object') return v;
  try { return JSON.parse(String(v || '')); } catch (e) { return {}; }
}

function _sumar(mapa, clave, n) {
  const k = clave === undefined || clave === null || clave === '' ? '—' : String(clave);
  mapa[k] = (mapa[k] || 0) + (n === undefined ? 1 : n);
}

function _pct(lista, p) {
  if (!lista || lista.length === 0) return null;
  const s = lista.slice().sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.ceil(p * s.length) - 1))];
}

function _proporcion(parte, todo) {
  return todo > 0 ? Math.round((parte / todo) * 1000) / 10 : null;
}

function _norm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Quita datos de contacto e identificadores. No quita nombres propios. */
function _anonimizar(texto) {
  return String(texto || '')
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[correo]')
    .replace(/\bhttps?:\/\/\S+|\bwww\.\S+/gi, '[url]')
    .replace(/\bES\d{2}(?:[\s-]?\d{4}){5}\b/gi, '[iban]')
    .replace(/\b[XYZ]\d{7}[A-Z]\b/gi, '[nie]')
    .replace(/\b\d{8}[A-HJ-NP-TV-Z]\b/gi, '[dni]')
    .replace(/(?:\+?34[\s-]?)?\b[6789]\d{2}[\s-]?\d{3}[\s-]?\d{3}\b/g, '[telefono]')
    .replace(/\b\d{9,}\b/g, '[numero]');
}

// ═══════════════════════════════════════════════════════════════════════════
// CAPA 1 — SEÑALES POR CÓDIGO
// ═══════════════════════════════════════════════════════════════════════════

// Ajustadas contra los mensajes reales de jul-ago 2026 («Se cortó repite
// respuesta», «se te está cortando mucho», «se ha vuelto a cortar»…)
const RE_CORTE   = /\bse\b[^.?!\n]{0,25}\bcort|\bcortad[oa]\b|no (has |me has )?terminad|incomplet|a medias|no termin|\brep[ií]te(me)?\b/i;
const RE_CORRIGE = /^\s*error\b|te equivocas|eso no es (as[ií]|cierto|correcto|verdad)|no es correcto|es incorrect|no es el \d|no es la \d/i;
const RE_GRACIAS = /\bgracias\b|muy amable|me (has|ha) ayudado|me sirve|\bperfecto\b|\bgenial\b|que bien|qué bien/i;
const RE_FRUSTRA = /no (me )?entiendes|no sirve|no funciona|otra vez|ya te (lo )?he dicho|no es eso|no contestas|no respondes/i;

function _palabras(t) {
  return new Set(_norm(t).replace(/[^a-zñ0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 3));
}

function _parecido(a, b) {
  const A = _palabras(a), B = _palabras(b);
  if (A.size === 0 || B.size === 0) return 0;
  let comun = 0;
  A.forEach((w) => { if (B.has(w)) comun++; });
  return comun / (A.size + B.size - comun);
}

export function calcularSenales(mensajes) {
  const usuario = mensajes.filter((m) => m.rol === 'user').map((m) => String(m.contenido || ''));
  const posteriores = usuario.slice(1);
  let reformulaciones = 0;
  for (let i = 1; i < usuario.length; i++) {
    if (_parecido(usuario[i - 1], usuario[i]) >= 0.5) reformulaciones++;
  }
  return {
    turnosUsuario: usuario.length,
    abandonoTrasPrimera: usuario.length === 1,
    // También el primer mensaje: tras un 504 hay quien abre sesión nueva
    // quejándose del corte («ola? que paso se corto»).
    quejaCorte: usuario.some((t) => RE_CORTE.test(t)),
    reformulaciones,
    agradecimiento: usuario.some((t) => RE_GRACIAS.test(t)),
    frustracion: posteriores.some((t) => RE_FRUSTRA.test(t)),
    correccion: posteriores.some((t) => RE_CORRIGE.test(t)),
    longitudUsuarioP50: _pct(usuario.map((t) => t.length), 0.5)
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CAPA 2 — INTERPRETACIÓN POR CONVERSACIÓN (Haiku)
// ═══════════════════════════════════════════════════════════════════════════

function _transcripcion(mensajes) {
  const partes = mensajes.map((m) => {
    const largo = String(m.contenido || '').length;
    const quien = m.rol === 'user' ? 'USUARIO' : `CATHOVIA (${largo.toLocaleString('es-ES')} caracteres)`;
    let t = _anonimizar(m.contenido);
    if (m.rol !== 'user' && t.length > MAX_TURNO_ASISTENTE) t = t.slice(0, MAX_TURNO_ASISTENTE) + ' […]';
    return `${quien}: ${t}`;
  });
  let txt = partes.join('\n\n');
  if (txt.length > MAX_TRANSCRIPCION) {
    // Se conserva el principio (cómo llega) y el final (cómo se va)
    const mitad = Math.floor(MAX_TRANSCRIPCION / 2);
    txt = txt.slice(0, mitad) + '\n\n[… parte central omitida …]\n\n' + txt.slice(-mitad);
  }
  return txt;
}

async function _llamarModelo(apiKey, modelo, system, user, maxTokens) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: modelo,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }]
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data && data.error ? data.error.message : `HTTP ${res.status}`);
  return (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
}

const SYSTEM_INTERPRETE = [
  'Analizas conversaciones entre usuarios y Cathovia, el asistente de IA de Veria Humanitas (pensamiento, cultura y tradición cristiana).',
  'La filosofía de Cathovia: cada respuesta resuelve la pregunta sin demostrar todo lo que sabe; primero ayudar, después profundizar; una buena respuesta invita a la siguiente pregunta. Cathovia no sustituye a un sacerdote ni al acompañamiento personal.',
  'Tu tarea: clasificar la conversación con una taxonomía CERRADA. Usa solo los valores listados, copiados exactamente.',
  '',
  'TAXONOMÍA:',
  DESCRIPCION_TAXONOMIA,
  '',
  'CRITERIO DE TONO (sé exigente; un medidor que siempre aprueba no sirve):',
  '- adecuado: SOLO si se cumplen TODOS: responde a lo que se pregunta; la extensión es proporcionada a la pregunta (una pregunta breve o concreta pide pocos párrafos); si el usuario expresa una emoción o una situación personal, Cathovia la reconoce antes de informar; el tono es cercano, sin sermón; deja abierta la conversación cuando procede.',
  '- parcial: la respuesta es correcta pero falla en alguno de esos puntos. Por ejemplo: extensa o enciclopédica para lo que se pidió; no reconoce la emoción o la situación expresada; responde de forma genérica a algo personal; no sugiere hablar con una persona cuando convenía.',
  '- inadecuado: contesta otra cosa; responde con doctrina o argumentos a alguien que expresa dolor, culpa o angustia sin atender primero a la persona; emite un juicio moral no pedido; es frío o condescendiente; da información errónea; ignora una señal de riesgo.',
  '- Cada respuesta de CATHOVIA indica su longitud real en caracteres; úsala para juzgar la proporción aunque el texto llegue recortado.',
  '',
  'CRITERIO DE DESENLACE:',
  '- resuelto: el usuario agradece, confirma o la respuesta cierra claramente una pregunta concreta y factual.',
  '- insatisfecho: el usuario corrige, repite, reformula o expresa que no le sirvió.',
  '- abandono: la conversación se corta tras una respuesta que no resolvía lo planteado (incompleta, cortada o que pedía algo más al usuario).',
  '- indeterminado: no hay base para saberlo (por ejemplo, una sola pregunta abierta y ninguna reacción).',
  '',
  'REGLAS:',
  '- Juzga la emoción por lo que escribe el usuario, no por el tema. Una pregunta sobre la muerte puede ser curiosidad.',
  '- Una pregunta normal sobre cualquier tema (historia, costumbres, doctrina…) NUNCA es prueba_herramienta, aunque parezca hecha para comprobar a Cathovia: clasifícala por su contenido.',
  '- Si no hay base suficiente, usa indeterminado. No adivines.',
  '- No hagas diagnósticos clínicos ni psicológicos.',
  '- "tema": 2 a 5 palabras, genérico.',
  '- "motivo": máximo 20 palabras, neutro, SIN nombres, lugares concretos, edades ni ningún dato que identifique a nadie.',
  'Responde SOLO con JSON, sin texto alrededor ni bloques de código:',
  '{"intencion":"","emocion":"","intensidad":"","necesidadPersona":"","derivo":"","tono":"","desenlace":"","senalCrisis":false,"tema":"","motivo":""}'
].join('\n');

function _validar(r) {
  const out = {};
  Object.keys(TAXONOMIA).forEach((campo) => {
    const v = String(r[campo] || '').trim();
    out[campo] = TAXONOMIA[campo].indexOf(v) >= 0 ? v : null;
  });
  out.senalCrisis = r.senalCrisis === true;
  out.tema = String(r.tema || '').trim().slice(0, 60);
  out.motivo = _anonimizar(String(r.motivo || '').trim()).slice(0, 200);
  out.camposInvalidos = Object.keys(TAXONOMIA).filter((c) => out[c] === null);
  out.criterio = CRITERIO;
  return out;
}

async function _interpretar(apiKey, mensajes) {
  const raw = await _llamarModelo(apiKey, MODELO_INTERPRETE, SYSTEM_INTERPRETE, 'CONVERSACIÓN:\n\n' + _transcripcion(mensajes), 400);
  let r;
  try {
    r = JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch (e) {
    throw new Error('Respuesta no JSON: ' + raw.slice(0, 120));
  }
  return _validar(r);
}

async function _guardar(fila) {
  const res = await wixData.query(C_INTERP).eq('sesionRef', fila.sesionRef).limit(1).find(AUTH);
  if (res.items && res.items.length > 0) {
    await wixData.update(C_INTERP, { ...res.items[0], ...fila }, AUTH);
  } else {
    await wixData.insert(C_INTERP, fila, AUTH);
  }
}

async function _procesarSesion(apiKey, sesion, intentosPrevios) {
  const mensajes = await _todos(
    wixData.query(C_MESSAGES).eq('sesionRef', sesion._id).ascending('orden')
  );
  const base = {
    sesionRef: sesion._id,
    fecha: sesion.fechaCreacion || sesion._createdDate,
    interpretadoEn: new Date(),
    version: VERSION
  };

  if (mensajes.length === 0) {
    await _guardar({ ...base, turnos: 0, senales: '{}', interpretacion: '{}', estado: 'sin_mensajes', modelo: '' });
    return 'sin_mensajes';
  }

  const senales = calcularSenales(mensajes);
  try {
    const interp = await _interpretar(apiKey, mensajes);
    await _guardar({
      ...base,
      turnos: senales.turnosUsuario,
      senales: JSON.stringify(senales),
      interpretacion: JSON.stringify(interp),
      estado: 'ok',
      modelo: MODELO_INTERPRETE
    });
    return 'ok';
  } catch (e) {
    console.warn(`${TAG} interpretación fallida ${sesion._id}: ${e.message}`);
    await _guardar({
      ...base,
      turnos: senales.turnosUsuario,
      senales: JSON.stringify(senales),
      interpretacion: JSON.stringify({ intentos: intentosPrevios + 1, error: String(e.message).slice(0, 300) }),
      estado: 'error',
      modelo: MODELO_INTERPRETE
    });
    return 'error';
  }
}

/**
 * Conversaciones cerradas pendientes, de la más reciente a la más antigua.
 * Pendiente = sin interpretar | con mensajes nuevos desde la interpretación |
 * en error con menos de MAX_INTENTOS | interpretada con otro CRITERIO |
 * excluida cuyo usuario ya no está en CONFIG.EXCLUIR_USUARIOS.
 * Las ya interpretadas de usuarios excluidos se marcan 'excluida'.
 * Devuelve [{ sesion, intentos }].
 */
async function _pendientes() {
  const excluir = new Set(CONFIG.EXCLUIR_USUARIOS);
  const [sesiones, previas] = await Promise.all([
    _todos(
      wixData.query(C_SESSIONS)
        .eq('cursoRef', CONFIG.CURSO_ID)
        .lt('fechaActualizacion', new Date(Date.now() - CIERRE_MS))
        .descending('fechaActualizacion')
    ),
    _todos(wixData.query(C_INTERP))
  ]);

  const hechas = {};
  previas.forEach((p) => { hechas[p.sesionRef] = p; });

  const out = [];
  const aExcluir = [];
  sesiones.forEach((s) => {
    const p = hechas[s._id];
    if (excluir.has(s.usuarioId || '')) {
      if (p && p.estado !== 'excluida') aExcluir.push(p);
      return;
    }
    if (p && p.estado === 'excluida') { out.push({ sesion: s, intentos: 0 }); return; }   // ya no está excluido
    if (!p) { out.push({ sesion: s, intentos: 0 }); return; }
    if (p.estado === 'error') {
      const intentos = _json(p.interpretacion).intentos || 0;
      if (intentos < MAX_INTENTOS) out.push({ sesion: s, intentos });
      return;
    }
    if (p.estado === 'ok' && _json(p.interpretacion).criterio !== CRITERIO) {
      out.push({ sesion: s, intentos: 0 });   // interpretada con otro criterio
      return;
    }
    const act = s.fechaActualizacion ? new Date(s.fechaActualizacion).getTime() : 0;
    const int = p.interpretadoEn ? new Date(p.interpretadoEn).getTime() : 0;
    if (act > int) out.push({ sesion: s, intentos: 0 });
  });
  if (aExcluir.length) await _marcarExcluidas(aExcluir);
  return out;
}

/** Marca como excluidas las interpretaciones de usuarios excluidos. */
async function _marcarExcluidas(filas) {
  for (let i = 0; i < filas.length; i += 10) {
    await Promise.all(filas.slice(i, i + 10).map((f) =>
      wixData.update(C_INTERP, { ...f, estado: 'excluida' }, AUTH).catch((e) => {
        console.warn(`${TAG} no se pudo marcar excluida ${f.sesionRef}: ${e.message}`);
      })
    ));
  }
  console.log(`${TAG} ${filas.length} interpretaciones marcadas como excluidas`);
}

/** Procesa en tandas de EN_PARALELO hasta `max` o hasta agotar el presupuesto. */
async function _procesarLista(apiKey, lista, presupuestoMs, max) {
  const t0 = Date.now();
  const cuenta = { ok: 0, error: 0, sin_mensajes: 0, procesadas: 0 };
  const limite = Math.min(lista.length, max || lista.length);
  let i = 0;
  while (i < limite) {
    if (Date.now() - t0 > presupuestoMs) break;
    const lote = lista.slice(i, Math.min(i + EN_PARALELO, limite));
    const res = await Promise.all(lote.map((x) =>
      _procesarSesion(apiKey, x.sesion, x.intentos).catch((e) => {
        console.error(`${TAG} sesión ${x.sesion._id}: ${e.message}`);
        return 'error';
      })
    ));
    res.forEach((r) => { cuenta[r] = (cuenta[r] || 0) + 1; });
    i += lote.length;
  }
  cuenta.procesadas = i;
  return cuenta;
}

/**
 * JOB: interpreta las conversaciones cerradas pendientes hasta agotar el
 * presupuesto. Lo que falte, mañana.
 */
export async function interpretarPendientes() {
  const t0 = Date.now();
  const apiKey = await getSecret(SECRET_API);
  if (!apiKey) {
    console.error(`${TAG} falta el secret ${SECRET_API}`);
    return { ok: false, error: `Falta el secret ${SECRET_API}.` };
  }

  const pendientes = await _pendientes();
  const cuenta = await _procesarLista(apiKey, pendientes, JOB_PRESUPUESTO_MS - (Date.now() - t0));
  if (cuenta.procesadas < pendientes.length) {
    console.warn(`${TAG} presupuesto agotado: quedan ${pendientes.length - cuenta.procesadas} conversaciones para mañana`);
  }

  console.log(`${TAG} job fin: pendientes=${pendientes.length} ok=${cuenta.ok} error=${cuenta.error} vacías=${cuenta.sin_mensajes} ${Date.now() - t0}ms`);
  return { ok: true, pendientes: pendientes.length, ...cuenta };
}

/**
 * PANEL: interpreta hasta `max` conversaciones pendientes y dice cuántas
 * quedan. El panel lo llama en bucle hasta quedan === 0.
 */
export async function interpretarLote(max) {
  const apiKey = await getSecret(SECRET_API);
  if (!apiKey) throw new Error(`Falta el secret ${SECRET_API}.`);

  const n = Math.max(1, Math.min(Number(max) || LOTE_MAX, LOTE_MAX));
  const pendientes = await _pendientes();
  const cuenta = await _procesarLista(apiKey, pendientes, LOTE_PRESUPUESTO_MS, n);
  const quedan = pendientes.length - cuenta.procesadas;

  console.log(`${TAG} lote: procesadas=${cuenta.procesadas} ok=${cuenta.ok} error=${cuenta.error} quedan=${quedan}`);
  return { ...cuenta, pendientesAntes: pendientes.length, quedan };
}

// ═══════════════════════════════════════════════════════════════════════════
// RESUMEN DE UN PERIODO (solo agregados)
// ═══════════════════════════════════════════════════════════════════════════

export async function leerInterpretaciones(desde, hasta) {
  const base = Date.parse(desde + 'T00:00:00Z');
  const fin = Date.parse(hasta + 'T00:00:00Z');
  const filas = await _todos(
    wixData.query(C_INTERP)
      .ge('fecha', new Date(base - 3 * 3600000))
      .lt('fecha', new Date(fin + 27 * 3600000))
  );
  return filas.filter((f) => {
    const d = diaDe(f.fecha);
    return d >= desde && d <= hasta;
  });
}

function _cruce(destino, a, b) {
  const ka = a || '—', kb = b || '—';
  if (!destino[ka]) destino[ka] = {};
  destino[ka][kb] = (destino[ka][kb] || 0) + 1;
}

export function resumirClima(todas) {
  const filas = todas.filter((f) => f.estado !== 'excluida');
  const ok = filas.filter((f) => f.estado === 'ok');
  const dist = {};
  Object.keys(TAXONOMIA).forEach((c) => { dist[c] = {}; });
  const cruces = { emocionTono: {}, intencionDesenlace: {}, necesidadDerivo: {} };
  const temas = {};
  const crisis = { total: 0, derivadas: 0, noDerivadas: 0, tonoAdecuado: 0 };
  const dificil = { total: 0, tonoAdecuado: 0, tonoInadecuado: 0, resueltas: 0 };
  const senales = { conversaciones: 0, abandonoTrasPrimera: 0, quejaCorte: 0, conReformulacion: 0, agradecimiento: 0, frustracion: 0, correccion: 0 };
  const longitudes = [];

  filas.forEach((f) => {
    if (f.estado === 'sin_mensajes') return;
    const s = _json(f.senales);
    senales.conversaciones++;
    if (s.abandonoTrasPrimera) senales.abandonoTrasPrimera++;
    if (s.quejaCorte) senales.quejaCorte++;
    if (s.reformulaciones > 0) senales.conReformulacion++;
    if (s.agradecimiento) senales.agradecimiento++;
    if (s.frustracion) senales.frustracion++;
    if (s.correccion) senales.correccion++;
    if (s.longitudUsuarioP50) longitudes.push(s.longitudUsuarioP50);
  });

  ok.forEach((f) => {
    const r = _json(f.interpretacion);
    Object.keys(TAXONOMIA).forEach((c) => _sumar(dist[c], r[c]));
    _cruce(cruces.emocionTono, r.emocion, r.tono);
    _cruce(cruces.intencionDesenlace, r.intencion, r.desenlace);
    _cruce(cruces.necesidadDerivo, r.necesidadPersona, r.derivo);
    if (r.tema) _sumar(temas, _norm(r.tema));

    if (r.senalCrisis) {
      crisis.total++;
      if (r.derivo === 'si') crisis.derivadas++;
      if (r.derivo === 'no') crisis.noDerivadas++;
      if (r.tono === 'adecuado') crisis.tonoAdecuado++;
    }
    if (EMOCIONES_DIFICILES.indexOf(r.emocion) >= 0) {
      dificil.total++;
      if (r.tono === 'adecuado') dificil.tonoAdecuado++;
      if (r.tono === 'inadecuado') dificil.tonoInadecuado++;
      if (r.desenlace === 'resuelto') dificil.resueltas++;
    }
  });

  const necesitan = ok.filter((f) => ['conveniente', 'clara'].indexOf(_json(f.interpretacion).necesidadPersona) >= 0);
  const derivadas = necesitan.filter((f) => _json(f.interpretacion).derivo === 'si').length;

  return {
    conversaciones: filas.length,
    interpretadas: ok.length,
    errores: filas.filter((f) => f.estado === 'error').length,
    sinMensajes: filas.filter((f) => f.estado === 'sin_mensajes').length,
    distribucion: dist,
    cruces,
    temas: Object.keys(temas).map((t) => ({ tema: t, veces: temas[t] })).sort((a, b) => b.veces - a.veces).slice(0, 15),
    llegadaDificil: {
      ...dificil,
      pct: _proporcion(dificil.total, ok.length),
      pctTonoAdecuado: _proporcion(dificil.tonoAdecuado, dificil.total)
    },
    necesidadPersona: {
      total: necesitan.length,
      derivadas,
      pctDerivadas: _proporcion(derivadas, necesitan.length)
    },
    crisis,
    senales: {
      ...senales,
      pctAbandono: _proporcion(senales.abandonoTrasPrimera, senales.conversaciones),
      pctQuejaCorte: _proporcion(senales.quejaCorte, senales.conversaciones),
      pctAgradecimiento: _proporcion(senales.agradecimiento, senales.conversaciones),
      longitudUsuarioP50: _pct(longitudes, 0.5)
    },
    taxonomia: TAXONOMIA
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CAPA 3 — LECTURA DEL PERIODO (Sonnet)
// ═══════════════════════════════════════════════════════════════════════════

const SYSTEM_LECTURA = [
  'Eres el analista de experiencia de Cathovia, el asistente de IA de Veria Humanitas (pensamiento, cultura y tradición cristiana).',
  'Su filosofía: cada respuesta resuelve la pregunta sin demostrar todo lo que sabe; primero ayudar, después profundizar; la profundidad está disponible pero nunca se impone; una buena respuesta invita a la siguiente pregunta. Cathovia no sustituye a un sacerdote ni al acompañamiento personal.',
  'Recibes los agregados del CLIMA de un periodo (JSON), los indicadores de COMPORTAMIENTO del mismo periodo (JSON) y descripciones breves y neutras de algunas conversaciones.',
  'COMPORTAMIENTO: cortes = respuestas que superan el límite en que la plataforma corta la conexión (el usuario no recibe la respuesta, ve un error); longitud = caracteres de cada respuesta frente al objetivo de la filosofía de «pocos párrafos breves»; unaPregunta = conversaciones con una sola pregunta.',
  'Escribe en español una lectura para el equipo que gestiona Cathovia, con estas secciones en Markdown:',
  '## Lectura general (2-3 frases)',
  '## Cómo llega la gente',
  '## Dónde Cathovia acompaña bien',
  '## Dónde falla',
  '## Ajustes propuestos (para el Entrenador o el corpus, concretos y accionables)',
  'REGLAS:',
  '- Usa SOLO las cifras de los JSON. No inventes datos ni porcentajes.',
  '- El desenlace indeterminado en conversaciones de UNA sola pregunta es falta de datos (no hubo reacción que juzgar), no un fallo de Cathovia. Usa desenlaceUnaPregunta y desenlaceVariasPreguntas: juzga el desenlace sobre todo en las de varias preguntas y, del resto, di solo que impiden medir.',
  '- Las conversaciones de intención prueba_herramienta son pruebas, no uso real: no las presentes como aciertos ni como fallos.',
  '- Si los cortes o la longitud son altos, inclúyelos en «Dónde falla». Puedes relacionarlos con el abandono como hipótesis, nunca como causa demostrada.',
  '- Si la muestra es pequeña (menos de 30 conversaciones interpretadas), dilo al principio y modera las conclusiones.',
  '- No identifiques personas ni reproduzcas descripciones literalmente.',
  '- No hagas diagnósticos clínicos.',
  '- Máximo 400 palabras. Directo, sin adornos.'
].join('\n');

function _muestraMotivos(filas) {
  const ok = filas.filter((f) => f.estado === 'ok').map((f) => _json(f.interpretacion)).filter((r) => r.motivo);
  // Prioridad: llegadas difíciles y desenlaces insatisfechos, luego el resto
  const peso = (r) => (EMOCIONES_DIFICILES.indexOf(r.emocion) >= 0 ? 2 : 0) + (r.desenlace === 'insatisfecho' || r.desenlace === 'abandono' ? 1 : 0);
  return ok.sort((a, b) => peso(b) - peso(a)).slice(0, MAX_MOTIVOS_LECTURA)
    .map((r) => `- [${r.intencion || '?'} · ${r.emocion || '?'} · tono ${r.tono || '?'} · ${r.desenlace || '?'}] ${r.motivo}`);
}

function _claveLectura(desde, hasta) {
  return `lectura:${desde}_${hasta}`;
}

/**
 * Indicadores de comportamiento del periodo desde las instantáneas de uso.
 * Mismo cálculo que leerPeriodo en cathoviaAnalytics.web.js.
 */
async function _comportamientoPeriodo(desde, hasta) {
  const dias = await leerInstantaneas('uso', desde, hasta);
  const lim = CONFIG.LIMITE_CONEXION_MS;
  const obj = CONFIG.OBJETIVO_LONGITUD;
  const total = [], longitud = [], mensajes = [];
  let consultas = 0;
  dias.forEach(({ datos: d }) => {
    consultas += d.consultas || 0;
    total.push(...((d.tiempos && d.tiempos.total) || []));
    longitud.push(...(d.respLen || []));
    mensajes.push(...(((d.sesiones && d.sesiones.mensajes) || []).filter((n) => n > 0)));
  });
  const cortes = total.filter((t) => t > lim).length;
  const largas = longitud.filter((n) => n > obj).length;
  const unaPregunta = mensajes.filter((n) => n === 2).length;
  return {
    consultas,
    respuestasConTiempoMedido: total.length,
    cortes,
    pctCortes: _proporcion(cortes, total.length),
    limiteCorteSegundos: lim / 1000,
    tiempoMedianoSegundos: total.length ? Math.round(_pct(total, 0.5) / 100) / 10 : null,
    longitudMediana: _pct(longitud, 0.5),
    objetivoLongitud: obj,
    pctSobreObjetivo: _proporcion(largas, longitud.length),
    conversacionesConMensajes: mensajes.length,
    unaPregunta,
    pctUnaPregunta: _proporcion(unaPregunta, mensajes.length)
  };
}

export async function generarLectura(desde, hasta) {
  if (!esDia(desde) || !esDia(hasta) || desde > hasta) throw new Error('Periodo no válido.');
  const apiKey = await getSecret(SECRET_API);
  if (!apiKey) throw new Error(`Falta el secret ${SECRET_API}.`);

  const filas = await leerInterpretaciones(desde, hasta);
  const resumen = resumirClima(filas);
  if (resumen.interpretadas === 0) throw new Error('No hay conversaciones interpretadas en el periodo.');

  const { taxonomia, ...agregados } = resumen;

  // Desenlace por número de preguntas del usuario
  const una = {}, varias = {};
  filas.filter((f) => f.estado === 'ok').forEach((f) => {
    const d = _json(f.interpretacion).desenlace || '—';
    const destino = Number(f.turnos) === 1 ? una : varias;
    destino[d] = (destino[d] || 0) + 1;
  });
  agregados.desenlaceUnaPregunta = una;
  agregados.desenlaceVariasPreguntas = varias;

  const comportamiento = await _comportamientoPeriodo(desde, hasta);

  const user =
    `PERIODO: ${desde} a ${hasta}\n\nCLIMA:\n${JSON.stringify(agregados)}\n\n` +
    `COMPORTAMIENTO:\n${JSON.stringify(comportamiento)}\n\n` +
    `DESCRIPCIONES (muestra de ${Math.min(MAX_MOTIVOS_LECTURA, resumen.interpretadas)}):\n${_muestraMotivos(filas).join('\n')}`;

  const t0 = Date.now();
  const texto = await _llamarModelo(apiKey, MODELO_LECTURA, SYSTEM_LECTURA, user, 1000);

  const datos = {
    desde, hasta, texto,
    interpretadas: resumen.interpretadas,
    comportamiento,
    modelo: MODELO_LECTURA,
    generadoEn: new Date().toISOString(),
    ms: Date.now() - t0
  };

  const clave = _claveLectura(desde, hasta);
  const fila = { clave, tipo: 'lectura', fecha: new Date(hasta + 'T12:00:00Z'), datos: JSON.stringify(datos), version: VERSION };
  const prev = await wixData.query(C_STATS).eq('clave', clave).limit(1).find(AUTH);
  if (prev.items && prev.items.length > 0) await wixData.update(C_STATS, { ...prev.items[0], ...fila }, AUTH);
  else await wixData.insert(C_STATS, fila, AUTH);

  console.log(`${TAG} lectura ${desde}→${hasta} interpretadas=${resumen.interpretadas} ${datos.ms}ms`);
  return datos;
}

export async function leerLectura(desde, hasta) {
  const res = await wixData.query(C_STATS).eq('clave', _claveLectura(desde, hasta)).limit(1).find(AUTH);
  const it = res.items && res.items[0];
  return it ? _json(it.datos) : null;
}
