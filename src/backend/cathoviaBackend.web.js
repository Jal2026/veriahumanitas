/* ═══════════════════════════════════════════════════════════════════════════
 * VERIA HUMANITAS — CATHOVIA Backend (Wix Velo)
 * Archivo:  cathoviaBackend.web.js
 * VERSION:  1.6.3
 * FECHA:    1 Octubre 2026
 *
 * CAMBIOS v1.6.2 → v1.6.3 — MARCA EN CABECERA:
 *   Cabecera: marca anterior → "VERIA HUMANITAS" en la línea 2.
 *   Solo comentario. Sin cambios de lógica.
 *
 * CAMBIOS v1.6.1 → v1.6.2 — TEXTOS DE BIENVENIDA DESDE EL CMS:
 *   cathoviaAbrir devuelve `brand` con los textos de pantalla del alignment
 *   publicado (EgaelAlignment), SOLO las celdas no vacías (patrón CENTRI):
 *     welcomeTitle → brand.welcomeTitle
 *     welcomeText  → brand.welcome      (ojo: cambia de nombre al viajar)
 *     placeholder  → brand.placeholder
 *   Celda vacía o solo espacios → no viaja → el widget usa su default.
 *   Sin alignment publicado → brand = {}.
 *   Requiere los 3 campos (Texto) creados en EgaelAlignment.
 *
 * CAMBIOS v1.5.3 → v1.6.0 — RECORTE DE LATENCIA (medido, no estimado):
 *
 *   MEDICIÓN QUE ORIGINA ESTA VERSIÓN (Site Monitoring, 14/07 14:01):
 *     14:01:15.900  cathoviaPreguntar IN
 *     14:01:17.867  _getCategories: 135 categorías cacheadas   → +1967ms
 *     14:01:18.144  config=OK recursos=1 inline=3 corpus=4      → +277ms
 *     14:01:18.395  sesión creada                               → +251ms
 *     14:01:31.789  OUT 11779ms respuestaLen=1316
 *     ─────────────────────────────────────────────────────────
 *     TOTAL REAL: 15889ms.  El log "OUT 11779ms" medía SOLO Anthropic
 *     (_callClaude cronometra desde su propio startTime). Los 4110ms
 *     restantes eran Wix Data y NO aparecían en ninguna métrica: por eso
 *     el P50 de 12.685ms de Site Monitoring parecía "casi dentro" del
 *     techo de 14s cuando en realidad ya lo rebasaba en muchos casos.
 *
 *   1. CATEGORÍAS DESDE COLECCIÓN DEDICADA (-1800ms). _getCategories
 *      paginaba distinct('category') sobre CathoviaKnowledge (5.372 docs)
 *      en 3 vueltas: 1967ms. Ahora un único wixData.get() sobre la
 *      colección CathoviaCategories, fila e2bcd77e-3066-436b-9b85-0835b7bce644,
 *      campo payload (JSON array con las 139 categorías canónicas): ~150ms.
 *
 *      POR QUÉ COLECCIÓN Y NO CONSTANTE EN CÓDIGO: el corpus está vivo.
 *      Isidoro va a curar los 158 documentos sin categoría y puede crear
 *      categorías nuevas. Hardcodear el índice en el backend generaría
 *      deriva silenciosa: el día que Isidoro añada una categoría,
 *      _detectCategories no la vería nunca y nadie se enteraría. Con la
 *      colección, el índice se edita desde el CMS sin tocar código.
 *
 *      MANTENIMIENTO: al curar documentos, si aparecen categorías nuevas,
 *      actualizar el campo payload de esa fila. Nada más.
 *
 *      NOTA: el índice tiene 139 categorías; el CMS reporta 135 distintas
 *      porque 4 no tienen documentos publicados. Inocuo: si una de esas 4
 *      se matchea, _retrieveKnowledge cae al fallback global que ya existía.
 *
 *      DEFENSIVO: si la colección falla o el JSON no parsea, _getCategories
 *      cae al distinct() de v1.5.3 (lento pero funcional). Nunca deja a
 *      Cathovia sin categorías.
 *
 *   2. LECTURAS DE CMS EN PARALELO (-400/600ms). _getAlignmentConfig,
 *      _getResources, _getCatalogInline y _getCategories eran cuatro await
 *      secuenciales de queries independientes. Ahora un solo Promise.all.
 *
 *   3. SESIÓN EN PARALELO CON ANTHROPIC (-250ms). _crearSesion bloqueaba
 *      antes de llamar al modelo. Ahora se lanza sin await junto a la
 *      llamada a Claude y su _id solo se espera al guardar los mensajes,
 *      cuando Anthropic ya ha respondido.
 *
 *   4. RETRIEVAL EN PARALELO (-300/500ms). _queryCandidates ejecutaba las
 *      2 queries .contains() en serie dentro de un for. Ahora Promise.all.
 *
 *   5. LOG DE TIEMPO HONESTO. El OUT ahora desglosa prepMs (todo el trabajo
 *      de Wix Data antes de Anthropic), apiMs (Anthropic) y totalMs (IN→OUT
 *      real). Los tres van también a EgaelLog. Si vuelve a haber 504, el log
 *      dice DÓNDE, no hay que deducirlo de timestamps.
 *
 *   RECORTE ESPERADO: ~3-3.5s. La invocación medida arriba pasaría de
 *   15889ms a ~12400ms.
 *
 *   LO QUE ESTO NO ARREGLA — leer antes de dar nada por cerrado:
 *     · Si Anthropic está degradado y Sonnet tarda 18-20s, se sigue cayendo.
 *       Esto elimina overhead propio; no compra inmunidad.
 *     · El colchón queda en ~1.5-2s sobre una latencia típica de Sonnet de
 *       11-12s. Es estrecho.
 *     · El sitio excede el límite de 4.000 registros del CMS de Wix
 *       (CathoviaKnowledge sola son 5.372). Hay periodo de gracia activo y
 *       las escrituras siguen funcionando, pero si Wix degrada lecturas por
 *       cuota, este recorte se lo come la plataforma. PENDIENTE de verificar
 *       con el aviso literal de Wix.
 *     · Fase II (Voyage+Pinecone) y AI-BOX añaden latencia POR DELANTE de
 *       Anthropic. Consumen el colchón que este release recupera.
 *
 * CAMBIOS v1.5.2 → v1.5.3 — WELCOME SIEMPRE AL ABRIR:
 *   cathoviaAbrir ya NO devuelve la última sesión del usuario. Cada visita
 *   arranca en welcome. El histórico sigue disponible en la sidebar.
 *
 * CAMBIOS v1.5.1 → v1.5.2 — SONNET DE VUELTA A PRIMARIO + REFACTOR HTTP:
 *   1. SONNET 4.6 modelo PRIMARIO. Haiku 4.5 fallback real.
 *   2. askCathoviaCore(params) exportada, llamable desde webMethod y desde
 *      http-functions.js.
 *   3. Timeouts internos: Sonnet 45s, Haiku 25s.
 *
 *   CORRECCIÓN v1.6.0 al punto 3: el comentario de v1.5.2 afirmaba que
 *   http-functions tiene ~5 min de timeout. Es FALSO. Wix corta la CONEXIÓN
 *   al cliente a los ~14s tanto en webMethod como en http-function. El código
 *   backend sí sigue ejecutándose (medido: un stream de prueba llegó a
 *   29077ms sin cancelación del runtime), pero el cliente ya recibió 504.
 *   Los timeouts de 45s/25s solo sirven para que el failover interno pueda
 *   completarse de cara al guardado en EgaelMessages.
 *
 *   TAMBIÉN DESCARTADO EN v1.6.0: streaming SSE desde http-functions.
 *   Medido: wix-http-functions no acepta streams (ni web ReadableStream ni
 *   Node stream.Readable). El helper ok() serializa el objeto con
 *   JSON.stringify y cierra. No hay entrega progresiva posible en Velo.
 *
 * CAMBIOS v1.4.1 → v1.5.0:
 *   1. PROMPT CACHING de Anthropic (bloque STABLE cacheado 5 min).
 *   2. CASCADE FAILOVER Sonnet → Haiku.
 *   3. MAX_TOKENS 1024 → 700.
 *   4. HISTORY_LIMIT 20 → 10.
 *   5. Campo modeloUsado en EgaelLog.
 *
 * COLECCIONES:
 *   CathoviaKnowledge:  title, content, sourceUrl, fileType, charLength,
 *                       sourceId, category, categoryIndex, categorySecondary,
 *                       titleFixed, categorySource
 *   CathoviaCategories: title, payload (JSON array de nombres de categoría)
 *
 * NOTA Fase I vs Fase II:
 *   Retrieval sigue siendo LITERAL (.contains) + filtro por categoría. Para
 *   Fase II (Voyage + Pinecone) solo cambia el cuerpo de _retrieveKnowledge;
 *   la interfaz con askCathoviaCore y _buildSystemBlocks no se toca.
 *
 * DÓNDE VER LOS LOGS:
 *   Wix Dashboard → Developer Tools → Site Monitoring
 *
 * Secret: EGAEL_API_KEY
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { webMethod, Permissions } from 'wix-web-module';
import { fetch } from 'wix-fetch';
import wixData from 'wix-data';
import { getSecret } from 'wix-secrets-backend';
import { mediaManager } from 'wix-media-backend';

const AUTH = { suppressAuth: true };

// ── Modelos y timeouts ──
const CLAUDE_MODEL_PRIMARY  = 'claude-sonnet-4-6';
const CLAUDE_MODEL_FALLBACK = 'claude-haiku-4-5';
const PRIMARY_TIMEOUT_MS    = 45000;
const FALLBACK_TIMEOUT_MS   = 25000;

// ── Generación ──
const MAX_TOKENS     = 700;
const HISTORY_LIMIT  = 10;
const MAX_DOC_CHARS  = 8000;

const V = 'CATHOVIA v1.6.3';

// ── Config RAG (Fase I — palabras clave + filtro por categoría) ──
const KNOWLEDGE_COLLECTION  = 'CathoviaKnowledge';
const KNOWLEDGE_TOP_K       = 4;
const KNOWLEDGE_FRAGMENT    = 1500;
const KNOWLEDGE_QUERY_LIMIT = 40;
const KNOWLEDGE_MIN_KEYWORD = 4;
const KNOWLEDGE_MAX_KEYWORDS = 4;
const CATEGORY_MAX_MATCH    = 2;

// ── Índice de categorías (colección dedicada — v1.6.0) ──
const CATEGORIES_COLLECTION = 'CathoviaCategories';
const CATEGORIES_ROW_ID     = 'e2bcd77e-3066-436b-9b85-0835b7bce644';
const CATEGORIES_FIELD      = 'payload';

// Cache en memoria (se pierde en arranques fríos del contenedor; con la
// colección el coste de repoblarla es ~150ms en vez de ~1967ms)
let _categoriesCache = null;
let _categoriesCacheTs = 0;
const CATEGORIES_TTL_MS = 5 * 60 * 1000;

// Stopwords españolas frecuentes que no aportan a la búsqueda
const STOPWORDS = new Set([
  'para','porque','cuando','donde','como','cual','cuales','quien','quienes',
  'sobre','entre','desde','hasta','hacia','contra','segun','durante','mediante',
  'aunque','pero','sino','tambien','ademas','entonces','mientras',
  'esto','esta','este','estos','estas','eso','esa','ese','esos','esas',
  'algo','alguien','alguno','alguna','mucho','mucha','poco','poca','todo','toda',
  'nada','nadie','ninguno','ninguna','cada','otro','otra','mismo','misma',
  'tener','tiene','tengo','hacer','hace','decir','dice','poder','puede',
  'quiero','quieres','saber','sabes','estar','estoy','siendo','siento',
  'seria','serian','habia','habria','deberia','podria'
]);

// Stopwords específicas de nombres de categoría (palabras genéricas que
// aparecen en muchas categorías y no deben usarse como discriminador)
const CATEGORY_STOPWORDS = new Set([
  'consejos','persona','educacion','nuestros','nuestra','nuestro','rincon',
  'para','los','las','del','sobre','vida','buena'
]);

// ═══════════════════════════════════════════════════════════════════════════
// 1. ABRIR CONSOLA
// ═══════════════════════════════════════════════════════════════════════════

export const cathoviaAbrir = webMethod(
  Permissions.Anyone,
  async ({ cursoId, userId }) => {
    console.log(`[${V}] cathoviaAbrir IN cursoId=${cursoId} userId=${userId || ''}`);
    try {
      if (!cursoId || cursoId.indexOf('PONER_') === 0) {
        console.warn(`[${V}] cathoviaAbrir: cursoId inválido "${cursoId}"`);
        return { ok: false, error: 'cursoId no configurado. Revisa CURSO_ID_DEFAULT en el Page Code.' };
      }

      let curso = null;
      try { curso = await wixData.get('EgaelCourses', cursoId, AUTH); }
      catch (e) { console.error(`[${V}] cathoviaAbrir: EgaelCourses.get falló:`, e.message); }

      if (!curso) {
        console.warn(`[${V}] cathoviaAbrir: proyecto no encontrado ${cursoId}`);
        return { ok: false, error: 'Proyecto no encontrado. Verifica el _id en EgaelCourses.' };
      }

      const config = await _getAlignmentConfig(cursoId);
      console.log(`[${V}] cathoviaAbrir: alignment=${config ? 'v' + config.version : 'NO PUBLICADO'}`);

      // v1.6.2: textos de pantalla desde el alignment publicado.
      // Solo viajan las celdas con contenido; las vacías no pisan el default.
      const brand = {};
      if (config) {
        if (config.welcomeTitle && String(config.welcomeTitle).trim()) brand.welcomeTitle = String(config.welcomeTitle).trim();
        if (config.welcomeText  && String(config.welcomeText).trim())  brand.welcome      = String(config.welcomeText).trim();
        if (config.placeholder  && String(config.placeholder).trim())  brand.placeholder  = String(config.placeholder).trim();
      }
      console.log(`[${V}] cathoviaAbrir brand CMS=[${Object.keys(brand).join(',')}]`);

      // v1.5.3: NO se carga la última sesión del usuario. Cada visita arranca
      // en welcome. El histórico está en la sidebar para reabrir a demanda.
      console.log(`[${V}] cathoviaAbrir OUT sessionId=null (welcome)`);
      return {
        ok: true,
        curso: {
          id: curso._id,
          title: curso.title || '',
          mentorNombre: curso.mentorNombre || '',
          expertoNombre: curso.expertoNombre || ''
        },
        alignment: config ? {
          version: config.version || 1,
          tono: config.tono || 'pedagógico',
          idiomaSalida: config.idiomaSalida || 'es'
        } : null,
        brand,
        sessionId: null
      };
    } catch (err) {
      console.error(`[${V}] cathoviaAbrir EXCEPTION:`, err);
      await _logError('cathoviaAbrir', cursoId, userId, err);
      return { ok: false, error: err.message };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 2. PREGUNTAR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Lógica principal de "preguntar a Cathovia". Función pura async llamable
 * desde webMethod o desde http-functions. Devuelve:
 *   { ok: true, respuesta, sessionId, inlineCatalog }
 * o
 *   { ok: false, error }
 */
export async function askCathoviaCore({ cursoId, sessionId, query, userId, userName }) {
  const tIn = Date.now();
  console.log(`[${V}] askCathoviaCore IN cursoId=${cursoId} sessionId=${sessionId || 'nueva'} query="${(query || '').substring(0, 40)}…"`);
  try {
    if (!cursoId || cursoId.indexOf('PONER_') === 0) {
      return { ok: false, error: 'cursoId no configurado.' };
    }
    if (!query) return { ok: false, error: 'query obligatoria' };

    // ── FASE PREP: todas las lecturas de CMS independientes en paralelo ──
    // v1.6.0: antes eran 4 await secuenciales (alignment → resources →
    // inline → categorías) sumando ~2.2s. Son independientes entre sí.
    const apiKeyPromise = getSecret('EGAEL_API_KEY').catch(e => {
      console.error(`[${V}] EGAEL_API_KEY no accesible:`, e.message);
      return null;
    });

    const [config, resources, inlineCatalog, categories] = await Promise.all([
      _getAlignmentConfig(cursoId),
      _getResources(cursoId),
      _getCatalogInline(cursoId),
      _getCategories()
    ]);

    // Retrieval: depende de categories, va después
    const detectedCats = _detectCategories(query, categories);
    const knowledge = await _retrieveKnowledge(query, detectedCats);

    const prepMs = Date.now() - tIn;
    console.log(`[${V}] askCathoviaCore PREP ${prepMs}ms: config=${config ? 'OK' : 'null'} recursos=${resources.length} inline=${inlineCatalog.length} cats=[${detectedCats.join('|')}] corpus=${knowledge.length}`);

    const apiKey = await apiKeyPromise;
    if (!apiKey) {
      return { ok: false, error: 'Configuración incompleta: EGAEL_API_KEY no encontrado en Wix Secrets.' };
    }

    // System dividido en bloque cacheable + bloque volátil
    const systemBlocks = _buildSystemBlocks(config, resources, inlineCatalog, knowledge);

    // ── SESIÓN E HISTORIAL ──
    // v1.6.0: si la sesión es nueva, _crearSesion se lanza EN PARALELO con
    // la llamada a Anthropic. Antes bloqueaba 251ms antes de llamar al
    // modelo, sin ninguna necesidad: su _id solo hace falta al guardar.
    let messages = [];
    let sessionPromise;

    if (!sessionId) {
      sessionPromise = _crearSesion(cursoId, userId, userName, query);
    } else {
      sessionPromise = Promise.resolve(sessionId);
      messages = await _getConversationHistory(sessionId);
      console.log(`[${V}] askCathoviaCore: historial ${messages.length} mensajes`);
    }

    messages.push({ role: 'user', content: query });

    // ── Llamada con cascade failover (Sonnet → Haiku) ──
    let claudeResult;
    try {
      claudeResult = await _callClaudeWithFallback(apiKey, systemBlocks, messages);
    } catch (err) {
      console.error(`[${V}] askCathoviaCore: ambos modelos fallaron:`, err.message);
      await _logError('askCathoviaCore_api', cursoId, userId, err);
      // La sesión ya pudo crearse: no la dejamos huérfana sin avisar
      try { await sessionPromise; } catch (_) { }
      return { ok: false, error: 'El servicio de IA no responde ahora mismo. Vuelve a intentarlo en unos segundos.' };
    }

    const { respuesta, modeloUsado, timeMs: apiMs, cacheStats } = claudeResult;

    let effectiveSessionId;
    try {
      effectiveSessionId = await sessionPromise;
    } catch (e) {
      console.error(`[${V}] askCathoviaCore: _crearSesion falló:`, e.message);
      await _logError('askCathoviaCore_sesion', cursoId, userId, e);
      return { ok: false, error: 'No he podido abrir la conversación. Reintenta.' };
    }

    if (!respuesta) {
      console.warn(`[${V}] askCathoviaCore: respuesta vacía (modelo=${modeloUsado})`);
      return { ok: false, error: 'No he podido generar respuesta. Reformula.' };
    }

    // Extraer y validar markers [[CARD:id]] insertados por el modelo
    const validIds = inlineCatalog.map(c => c.id);
    const insertedIds = _extractCardMarkers(respuesta).filter(id => validIds.indexOf(id) !== -1);
    if (insertedIds.length > 0) {
      console.log(`[${V}] askCathoviaCore: cards inline insertadas=${insertedIds.join(',')}`);
      _logCardsInserted(cursoId, effectiveSessionId, userId, insertedIds);
    }

    // Log del retrieval (qué documentos del corpus se usaron + categorías)
    if (knowledge.length > 0) {
      _logKnowledge(cursoId, effectiveSessionId, userId, knowledge.map(k => k.sourceId), detectedCats, modeloUsado);
    }

    await _saveMessages(effectiveSessionId, query, respuesta, config);
    await _touchSession(effectiveSessionId);

    const totalMs = Date.now() - tIn;
    await _log({
      cursoId,
      sessionId: effectiveSessionId,
      userId,
      query,
      respuesta,
      timeMs: totalMs,
      prepMs,
      apiMs,
      resourcesCount: resources.length,
      modeloUsado,
      cacheStats
    });

    // v1.6.0: el OUT desglosa el tiempo. prepMs = Wix Data, apiMs = Anthropic,
    // totalMs = IN→OUT real. Antes solo se logueaba apiMs y los ~4s de prep
    // eran invisibles.
    console.log(`[${V}] askCathoviaCore OUT total=${totalMs}ms (prep=${prepMs}ms api=${apiMs}ms) modelo=${modeloUsado} cache=${cacheStats.hit}/${cacheStats.create} respuestaLen=${respuesta.length}`);
    return {
      ok: true,
      respuesta,
      sessionId: effectiveSessionId,
      inlineCatalog
    };

  } catch (err) {
    console.error(`[${V}] askCathoviaCore EXCEPTION:`, err);
    await _logError('askCathoviaCore', cursoId, userId, err);
    return { ok: false, error: 'Error técnico: ' + (err.message || 'desconocido') };
  }
}

// Wrapper webMethod para retro-compatibilidad con cathoviaPage.js (deprecado,
// se elimina en Fase 2 una vez validado que el widget usa el endpoint HTTP).
export const cathoviaPreguntar = webMethod(
  Permissions.Anyone,
  async (params) => askCathoviaCore(params)
);

// ═══════════════════════════════════════════════════════════════════════════
// 3. LISTAR CHATS
// ═══════════════════════════════════════════════════════════════════════════

export const cathoviaListarChats = webMethod(
  Permissions.Anyone,
  async ({ cursoId, userId, limit }) => {
    console.log(`[${V}] cathoviaListarChats IN cursoId=${cursoId} userId=${userId || ''}`);
    try {
      if (!cursoId || !userId) return { ok: true, chats: [] };

      const result = await wixData.query('EgaelSessions')
        .eq('cursoRef', cursoId)
        .eq('usuarioId', userId)
        .descending('fechaActualizacion')
        .limit(limit || 30)
        .find(AUTH);

      const items = result.items || [];
      console.log(`[${V}] cathoviaListarChats: ${items.length} sesiones`);

      const chatsRaw = await Promise.all(items.map(async (s) => {
        let preview = '';
        let hasUserMsg = false;
        try {
          const lastMsg = await wixData.query('EgaelMessages')
            .eq('sesionRef', s._id)
            .eq('rol', 'user')
            .descending('orden')
            .limit(1)
            .find(AUTH);
          if (lastMsg.items.length > 0) {
            preview = (lastMsg.items[0].contenido || '').substring(0, 90);
            hasUserMsg = true;
          }
        } catch (_) { }
        return {
          id: s._id,
          titulo: s.title || 'Conversación',
          fecha: s.fechaActualizacion || s._createdDate,
          preview: preview,
          _hasUserMsg: hasUserMsg
        };
      }));

      const chats = chatsRaw
        .filter(c => c._hasUserMsg)
        .map(c => ({ id: c.id, titulo: c.titulo, fecha: c.fecha, preview: c.preview }));

      return { ok: true, chats };
    } catch (err) {
      console.error(`[${V}] cathoviaListarChats EXCEPTION:`, err);
      await _logError('cathoviaListarChats', cursoId, userId, err);
      return { ok: false, error: err.message, chats: [] };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 4. ABRIR CHAT
// ═══════════════════════════════════════════════════════════════════════════

export const cathoviaAbrirChat = webMethod(
  Permissions.Anyone,
  async ({ sessionId, cursoId }) => {
    console.log(`[${V}] cathoviaAbrirChat IN sessionId=${sessionId} cursoId=${cursoId || ''}`);
    try {
      if (!sessionId) return { ok: false, error: 'sessionId requerido' };

      const result = await wixData.query('EgaelMessages')
        .eq('sesionRef', sessionId)
        .ascending('orden')
        .limit(200)
        .find(AUTH);

      const mensajes = (result.items || []).map(m => ({
        rol: m.rol,
        contenido: m.contenido,
        timestamp: m.timestamp
      }));

      let inlineCatalog = [];
      if (cursoId) {
        try {
          inlineCatalog = await _getCatalogInline(cursoId);
        } catch (_) { inlineCatalog = []; }
      }

      console.log(`[${V}] cathoviaAbrirChat OUT ${mensajes.length} mensajes, ${inlineCatalog.length} inline`);
      return { ok: true, sessionId, mensajes, inlineCatalog };
    } catch (err) {
      console.error(`[${V}] cathoviaAbrirChat EXCEPTION:`, err);
      await _logError('cathoviaAbrirChat', '', '', err);
      return { ok: false, error: err.message };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 5. NUEVO CHAT
// ═══════════════════════════════════════════════════════════════════════════

export const cathoviaNuevoChat = webMethod(
  Permissions.Anyone,
  async ({ cursoId, userId, userName }) => {
    console.log(`[${V}] cathoviaNuevoChat IN cursoId=${cursoId}`);
    try {
      if (!cursoId) return { ok: false, error: 'cursoId requerido' };
      const sessionId = await _crearSesion(cursoId, userId, userName, null);
      console.log(`[${V}] cathoviaNuevoChat OUT sessionId=${sessionId}`);
      return { ok: true, sessionId };
    } catch (err) {
      console.error(`[${V}] cathoviaNuevoChat EXCEPTION:`, err);
      await _logError('cathoviaNuevoChat', cursoId, userId, err);
      return { ok: false, error: err.message };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 6. BORRAR CHAT — sesión + todos sus mensajes
// ═══════════════════════════════════════════════════════════════════════════

export const cathoviaBorrarChat = webMethod(
  Permissions.Anyone,
  async ({ sessionId, userId }) => {
    console.log(`[${V}] cathoviaBorrarChat IN sessionId=${sessionId} userId=${userId || 'anon'}`);
    try {
      if (!sessionId) return { ok: false, error: 'sessionId requerido' };

      let sesion;
      try { sesion = await wixData.get('EgaelSessions', sessionId, AUTH); }
      catch (_) { sesion = null; }

      if (!sesion) {
        console.log(`[${V}] cathoviaBorrarChat: sesión no existía ${sessionId}`);
        return { ok: true, sessionId, alreadyGone: true };
      }

      const owner = sesion.usuarioId || '';
      if (userId && owner && owner !== userId) {
        console.warn(`[${V}] cathoviaBorrarChat: userId=${userId} intentó borrar sesión de ${owner}`);
        return { ok: false, error: 'No tienes permiso para borrar esta conversación.' };
      }

      let deletedMsgs = 0;
      while (true) {
        const batch = await wixData.query('EgaelMessages')
          .eq('sesionRef', sessionId)
          .limit(50)
          .find(AUTH);
        const items = batch.items || [];
        if (items.length === 0) break;
        await Promise.all(items.map(m => wixData.remove('EgaelMessages', m._id, AUTH).catch(() => null)));
        deletedMsgs += items.length;
        if (items.length < 50) break;
      }

      await wixData.remove('EgaelSessions', sessionId, AUTH);

      console.log(`[${V}] cathoviaBorrarChat OUT ${deletedMsgs} mensajes + sesión borrados`);
      return { ok: true, sessionId, deletedMsgs };

    } catch (err) {
      console.error(`[${V}] cathoviaBorrarChat EXCEPTION:`, err);
      await _logError('cathoviaBorrarChat', '', userId, err);
      return { ok: false, error: 'Error técnico: ' + (err.message || 'desconocido') };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// 7. CATÁLOGO
// ═══════════════════════════════════════════════════════════════════════════

export const cathoviaCatalogo = webMethod(
  Permissions.Anyone,
  async ({ cursoId, tipo }) => {
    console.log(`[${V}] cathoviaCatalogo IN cursoId=${cursoId} tipo=${tipo || 'todos'}`);
    try {
      if (!cursoId) return { ok: true, items: [] };

      let q = wixData.query('EgaelCatalog')
        .eq('courseRef', cursoId)
        .eq('active', true)
        .ascending('order')
        .limit(100);

      if (tipo) q = q.eq('type', tipo);

      const result = await q.find(AUTH);
      const rawItems = result.items || [];
      console.log(`[${V}] cathoviaCatalogo: ${rawItems.length} ítems`);

      const items = await Promise.all(rawItems.map(async (it) => {
        const audioUrl = await _resolveAudioUrl(it.audio);
        return {
          id: it._id,
          title: it.title || '',
          type: it.type || '',
          shortDescription: it.shortDescription || '',
          aboutWhat: it.aboutWhat || '',
          price: it.price || '',
          date: it.date || null,
          actionUrl: it.actionUrl || '',
          image: it.image || '',
          audioUrl: audioUrl,
          hasAudio: !!audioUrl,
          order: it.order || 0
        };
      }));

      return { ok: true, items };
    } catch (err) {
      console.error(`[${V}] cathoviaCatalogo EXCEPTION:`, err);
      await _logError('cathoviaCatalogo', cursoId, '', err);
      return { ok: false, error: err.message, items: [] };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS — LLAMADA A ANTHROPIC (con timeout y cascade failover)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Envuelve una promesa con timeout. Si no resuelve en `timeoutMs`, rechaza.
 * Nota: wix-fetch no cancela realmente el request subyacente, pero libera
 * al caller para que probemos el fallback.
 */
function _withTimeout(promise, timeoutMs, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timeout ${timeoutMs}ms`)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Llama al endpoint de Anthropic con un modelo concreto y timeout.
 * Devuelve { respuesta, timeMs, cacheStats } o lanza error.
 */
async function _callClaude(model, apiKey, systemBlocks, messages, timeoutMs, label) {
  const startTime = Date.now();

  const fetchPromise = fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_TOKENS,
      system: systemBlocks,
      messages
    })
  });

  const response = await _withTimeout(fetchPromise, timeoutMs, label);

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status} (${label}): ${errBody.substring(0, 200)}`);
  }

  const data = await response.json();
  const timeMs = Date.now() - startTime;

  const respuesta = (data.content || [])
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n')
    .trim();

  const u = data.usage || {};
  const cacheStats = {
    hit:    u.cache_read_input_tokens    || 0,
    create: u.cache_creation_input_tokens || 0,
    input:  u.input_tokens                || 0,
    output: u.output_tokens               || 0
  };

  return { respuesta, timeMs, cacheStats };
}

/**
 * Intenta primero con Sonnet 4.6; si falla o time-outea, cae a Haiku 4.5.
 * Devuelve { respuesta, modeloUsado, timeMs, cacheStats } o lanza.
 */
async function _callClaudeWithFallback(apiKey, systemBlocks, messages) {
  try {
    const r = await _callClaude(
      CLAUDE_MODEL_PRIMARY, apiKey, systemBlocks, messages,
      PRIMARY_TIMEOUT_MS, CLAUDE_MODEL_PRIMARY
    );
    return { ...r, modeloUsado: CLAUDE_MODEL_PRIMARY };
  } catch (err1) {
    console.warn(`[${V}] Sonnet falló, cayendo a Haiku: ${err1.message}`);
    try {
      const r = await _callClaude(
        CLAUDE_MODEL_FALLBACK, apiKey, systemBlocks, messages,
        FALLBACK_TIMEOUT_MS, CLAUDE_MODEL_FALLBACK
      );
      return { ...r, modeloUsado: CLAUDE_MODEL_FALLBACK };
    } catch (err2) {
      throw new Error(`Sonnet:[${err1.message}] Haiku:[${err2.message}]`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS — ALIGNMENT & RESOURCES
// ═══════════════════════════════════════════════════════════════════════════

async function _getAlignmentConfig(cursoId) {
  const result = await wixData.query('EgaelAlignment')
    .eq('cursoRef', cursoId)
    .eq('estado', 'publicado')
    .descending('fechaPublicacion')
    .limit(1)
    .find(AUTH);
  return result.items.length > 0 ? result.items[0] : null;
}

async function _getResources(cursoId) {
  const result = await wixData.query('EgaelResources')
    .eq('cursoRef', cursoId)
    .eq('activo', true)
    .ascending('orden')
    .find(AUTH);
  return result.items || [];
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS — RAG FASE I (retrieval por palabras clave + filtro por categoría)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Normaliza texto para comparación: minúsculas, sin acentos, sin puntuación.
 */
function _normalize(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extrae las palabras clave más significativas de la pregunta.
 */
function _extractKeywords(query) {
  const words = _normalize(query).split(' ')
    .filter(w => w.length >= KNOWLEDGE_MIN_KEYWORD && !STOPWORDS.has(w));
  const seen = new Set();
  const unique = [];
  for (const w of words) {
    if (!seen.has(w)) { seen.add(w); unique.push(w); }
  }
  unique.sort((a, b) => b.length - a.length);
  return unique.slice(0, KNOWLEDGE_MAX_KEYWORDS);
}

/**
 * v1.6.0: lee el índice de categorías de la colección CathoviaCategories
 * (una fila, campo payload con un JSON array de nombres).
 *
 * Antes (v1.5.3) esto era distinct('category') paginado sobre
 * CathoviaKnowledge: 1967ms medidos. Ahora un wixData.get() por _id: ~150ms.
 *
 * FALLBACK: si la colección falla, no existe, o el JSON no parsea, cae al
 * distinct() original. Lento, pero Cathovia nunca se queda sin categorías.
 *
 * Devuelve [{ name, norm, tokens:[...] }].
 */
async function _getCategories() {
  const now = Date.now();
  if (_categoriesCache && (now - _categoriesCacheTs) < CATEGORIES_TTL_MS) {
    return _categoriesCache;
  }

  let names = null;

  // Vía rápida: colección dedicada
  try {
    const row = await wixData.get(CATEGORIES_COLLECTION, CATEGORIES_ROW_ID, AUTH);
    if (row && row[CATEGORIES_FIELD]) {
      const parsed = JSON.parse(row[CATEGORIES_FIELD]);
      if (Array.isArray(parsed) && parsed.length > 0) {
        names = parsed;
        console.log(`[${V}] _getCategories: ${names.length} desde ${CATEGORIES_COLLECTION}`);
      } else {
        console.warn(`[${V}] _getCategories: payload parseado pero vacío o no-array`);
      }
    } else {
      console.warn(`[${V}] _getCategories: fila ${CATEGORIES_ROW_ID} sin campo ${CATEGORIES_FIELD}`);
    }
  } catch (e) {
    console.warn(`[${V}] _getCategories: colección falló (${e.message}), fallback a distinct()`);
  }

  // Fallback: distinct() sobre el corpus (comportamiento v1.5.3)
  if (!names) {
    try {
      names = [];
      let skip = 0;
      const PAGE = 50;
      for (let guard = 0; guard < 10; guard++) {
        const res = await wixData.query(KNOWLEDGE_COLLECTION)
          .isNotEmpty('category')
          .limit(PAGE)
          .skip(skip)
          .distinct('category', AUTH);
        const page = res.items || [];
        names.push(...page);
        if (page.length < PAGE) break;
        skip += PAGE;
      }
      console.log(`[${V}] _getCategories: ${names.length} vía distinct() (FALLBACK LENTO)`);
    } catch (e) {
      console.warn(`[${V}] _getCategories: distinct() también falló:`, e.message);
      return [];
    }
  }

  const cats = names.map(name => {
    const norm = _normalize(name);
    const tokens = norm.split(' ')
      .filter(t => t.length >= KNOWLEDGE_MIN_KEYWORD && !CATEGORY_STOPWORDS.has(t));
    return { name, norm, tokens };
  });

  _categoriesCache = cats;
  _categoriesCacheTs = now;
  return cats;
}

/**
 * Detecta hasta CATEGORY_MAX_MATCH categorías relevantes a la pregunta,
 * por solapamiento de tokens entre la query y el nombre de cada categoría.
 * Todo en memoria, sin llamada externa.
 *
 * v1.6.0: ahora recibe `cats` como parámetro (ya resueltas en el Promise.all
 * de askCathoviaCore) en vez de llamar a _getCategories() por dentro. Es
 * síncrona.
 */
function _detectCategories(query, cats) {
  try {
    if (!Array.isArray(cats) || cats.length === 0) return [];

    const qnorm = _normalize(query);
    const qtokens = new Set(
      qnorm.split(' ').filter(w => w.length >= KNOWLEDGE_MIN_KEYWORD && !STOPWORDS.has(w))
    );
    if (qtokens.size === 0) return [];

    const scored = [];
    for (const cat of cats) {
      if (cat.tokens.length === 0) continue;
      let hits = 0;
      for (const tok of cat.tokens) {
        if (qtokens.has(tok)) { hits += 2; continue; }
        for (const qt of qtokens) {
          if (qt.length >= 5 && (qt.indexOf(tok) === 0 || tok.indexOf(qt) === 0)) {
            hits += 1; break;
          }
        }
      }
      if (hits > 0) scored.push({ name: cat.name, hits });
    }

    if (scored.length === 0) return [];
    scored.sort((a, b) => b.hits - a.hits);
    const best = scored[0].hits;
    return scored
      .filter(s => s.hits >= Math.max(2, best - 1))
      .slice(0, CATEGORY_MAX_MATCH)
      .map(s => s.name);
  } catch (e) {
    console.warn(`[${V}] _detectCategories fallo:`, e.message);
    return [];
  }
}

/**
 * Extrae un fragmento de ~KNOWLEDGE_FRAGMENT chars alrededor de la primera
 * aparición de cualquier keyword.
 */
function _extractRelevantFragment(content, keywords) {
  const normContent = _normalize(content);
  let pos = -1;
  for (const kw of keywords) {
    const p = normContent.indexOf(kw);
    if (p !== -1 && (pos === -1 || p < pos)) pos = p;
  }
  if (pos === -1) {
    return content.substring(0, KNOWLEDGE_FRAGMENT).trim();
  }
  const start = Math.max(0, pos - Math.floor(KNOWLEDGE_FRAGMENT / 3));
  const fragment = content.substring(start, start + KNOWLEDGE_FRAGMENT).trim();
  return (start > 0 ? '…' : '') + fragment + (start + KNOWLEDGE_FRAGMENT < content.length ? '…' : '');
}

/**
 * RAG Fase I: recupera hasta KNOWLEDGE_TOP_K documentos del corpus relevantes.
 *
 * Estrategia:
 *   - Si `categories` tiene elementos: .contains('content', kw) FILTRADO
 *     a esas categorías (espacio de búsqueda reducido).
 *   - Si `categories` está vacío O el filtro no trae nada: búsqueda GLOBAL.
 *     Nunca empeora.
 */
async function _retrieveKnowledge(query, categories) {
  try {
    const keywords = _extractKeywords(query);
    if (keywords.length === 0) return [];

    const cats = Array.isArray(categories) ? categories : [];
    let candidates = await _queryCandidates(keywords, cats);

    if (candidates.size === 0 && cats.length > 0) {
      console.log(`[${V}] _retrieveKnowledge: filtro por categoría vacío, fallback a global`);
      candidates = await _queryCandidates(keywords, []);
    }

    if (candidates.size === 0) return [];

    const scored = [];
    for (const item of candidates.values()) {
      const hay = _normalize((item.title || '') + ' ' + (item.content || ''));
      let score = 0;
      for (const kw of keywords) {
        if (hay.indexOf(kw) !== -1) score += 1;
        if (_normalize(item.title || '').indexOf(kw) !== -1) score += 2;
      }
      scored.push({ item, score });
    }

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, KNOWLEDGE_TOP_K).filter(s => s.score > 0);

    return top.map(s => ({
      title: s.item.titleFixed || s.item.title || 'Documento',
      sourceId: s.item.sourceId || s.item._id,
      category: s.item.category || '',
      fragment: _extractRelevantFragment(s.item.content || '', keywords)
    }));

  } catch (err) {
    console.warn(`[${V}] _retrieveKnowledge fallo global:`, err.message);
    return [];
  }
}

/**
 * Ejecuta hasta 2 queries .contains() con las keywords más significativas,
 * opcionalmente filtradas a una lista de categorías. Devuelve un Map por _id.
 *
 * v1.6.0: las 2 queries van en PARALELO (antes: for con await dentro).
 */
async function _queryCandidates(keywords, categories) {
  const candidatesById = new Map();
  const queriesToRun = keywords.slice(0, 2);

  const results = await Promise.all(queriesToRun.map(async (kw) => {
    try {
      let q = wixData.query(KNOWLEDGE_COLLECTION).contains('content', kw);
      if (categories && categories.length === 1) {
        q = q.eq('category', categories[0]);
      } else if (categories && categories.length > 1) {
        q = q.hasSome('category', categories);
      }
      const res = await q.limit(KNOWLEDGE_QUERY_LIMIT).find(AUTH);
      return res.items || [];
    } catch (e) {
      console.warn(`[${V}] _queryCandidates "${kw}" cats=[${(categories || []).join('|')}] falló:`, e.message);
      return [];
    }
  }));

  for (const items of results) {
    for (const item of items) {
      if (!candidatesById.has(item._id)) candidatesById.set(item._id, item);
    }
  }
  return candidatesById;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS — CATÁLOGO INLINE
// ═══════════════════════════════════════════════════════════════════════════

async function _getCatalogInline(cursoId) {
  try {
    const result = await wixData.query('EgaelCatalog')
      .eq('courseRef', cursoId)
      .eq('active', true)
      .hasSome('type', ['contenido', 'encuentro'])
      .ascending('order')
      .limit(50)
      .find(AUTH);

    const rawItems = result.items || [];
    const items = await Promise.all(rawItems.map(async (it) => ({
      id: it._id,
      title: it.title || '',
      type: it.type || '',
      shortDescription: it.shortDescription || '',
      aboutWhat: it.aboutWhat || '',
      actionUrl: it.actionUrl || '',
      image: it.image || '',
      audioUrl: await _resolveAudioUrl(it.audio),
      hasAudio: !!it.audio
    })));
    return items;
  } catch (err) {
    console.warn(`[${V}] _getCatalogInline fallo:`, err.message);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS — RESOLVER AUDIO URL
// ═══════════════════════════════════════════════════════════════════════════

async function _resolveAudioUrl(audioField) {
  if (!audioField) return '';
  const raw = typeof audioField === 'string' ? audioField : (audioField.url || audioField.src || '');
  if (!raw) return '';
  if (raw.indexOf('http') === 0) return raw;
  try {
    const url = await mediaManager.getFileUrl(raw);
    return url || '';
  } catch (e) {
    console.warn(`[${V}] _resolveAudioUrl fallo para "${raw.substring(0, 60)}":`, e.message);
    return '';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS — SYSTEM PROMPT (con separación STABLE + VOLATILE para caching)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Construye los bloques del `system` para Anthropic.
 *
 *   [
 *     { type:'text', text: STABLE, cache_control:{type:'ephemeral'} },
 *     { type:'text', text: VOLATILE }   // solo si hay knowledge; sin caché
 *   ]
 *
 * STABLE: todo lo que NO varía por pregunta (identidad, guardrails,
 * resources fijos, catálogo inline, reglas). Cacheado 5 min en Anthropic.
 *
 * VOLATILE: solo el corpus doctrinal (fragmentos del RAG), cambia por
 * pregunta. No se cachea.
 */
function _buildSystemBlocks(config, resources, inlineCatalog, knowledge) {
  const stableParts = [];
  const volatileParts = [];

  // ── IDENTIDAD ──
  if (config && config.promptBase) {
    stableParts.push(config.promptBase);
  } else {
    stableParts.push('Eres Cathovia, la consola de acompañamiento con inteligencia artificial de Veria Humanitas. Acompañas al usuario en cualquier ámbito de la vida desde la mirada y las enseñanzas de la Iglesia Católica. Hablas en español con calidez y claridad.');
  }

  if (config && config.tono) {
    const tones = {
      'formal':      'TONO: Formal y profesional.',
      'pedagógico':  'TONO: Pedagógico, accesible, con ejemplos cuando sea útil.',
      'técnico':     'TONO: Técnico, con terminología especializada consolidada.'
    };
    if (tones[config.tono]) stableParts.push(tones[config.tono]);
  }

  // ── GUARDRAILS + INSTRUCCIONES ADICIONALES ──
  if (config) {
    const guardrails = [];
    if (config.grSinAsesoria) guardrails.push('No des asesoramiento profesional directo. Recomienda consultar con un profesional cualificado.');
    if (config.grCitarFuentes) guardrails.push('Cuando uses información de los documentos, menciona la fuente.');
    if (config.grDisclaimer) guardrails.push('Incluye disclaimer breve en temas sensibles.');
    if (config.grAnonimizar) guardrails.push('No compartas datos personales que aparezcan en los documentos.');
    if (guardrails.length > 0) stableParts.push('--- GUARDRAILS ---\n' + guardrails.join('\n'));
    if (config.instruccionesExtra) stableParts.push('--- INSTRUCCIONES ADICIONALES ---\n' + config.instruccionesExtra);
  }

  // ── RESOURCES FIJOS (EgaelResources) — cacheables ──
  if (resources && resources.length > 0) {
    const resourceBlocks = ['--- DOCUMENTOS DE REFERENCIA ---'];
    resourceBlocks.push('Usa la siguiente información como base. Intégrala de forma natural, no la cites textualmente:');
    let totalChars = 0;
    for (let i = 0; i < resources.length; i++) {
      const r = resources[i];
      const content = r.contenido || '';
      if (totalChars + content.length > MAX_DOC_CHARS) {
        const remaining = MAX_DOC_CHARS - totalChars;
        if (remaining > 200) resourceBlocks.push('[' + (r.title || 'Doc') + ']\n' + content.substring(0, remaining) + '…');
        break;
      }
      resourceBlocks.push('[' + (r.title || 'Doc') + ']\n' + content);
      totalChars += content.length;
    }
    stableParts.push(resourceBlocks.join('\n\n'));
  }

  // ── CATÁLOGO INLINE + REGLAS ──
  if (inlineCatalog && inlineCatalog.length > 0) {
    const catalogBlocks = [
      '--- RECURSOS QUE PUEDES OFRECER EN LA CONVERSACIÓN ---',
      'Estos son los ÚNICOS recursos que puedes recomendar de forma tarjeta. Nunca inventes IDs ni títulos.'
    ];

    const lines = inlineCatalog.map(it => {
      const tipoLabel = it.type === 'encuentro' ? 'encuentro' : 'contenido';
      const formato = it.hasAudio ? ' [formato: audio]' : '';
      const sobre = it.aboutWhat ? `\n    Trata sobre: ${it.aboutWhat}` : '';
      const desc = it.shortDescription ? `\n    ${it.shortDescription}` : '';
      return `[${it.id}]  ${tipoLabel} · "${it.title}"${formato}${sobre}${desc}`;
    });
    catalogBlocks.push(lines.join('\n\n'));

    catalogBlocks.push([
      '--- REGLAS DE INSERCIÓN ---',
      '1. Cuando el usuario expresa dolor personal, sensación de estar perdido, alejamiento de la fe, crisis, discernimiento, conflicto familiar con la fe, o cualquier situación en la que un párroco recomendaría "habla con alguien" — INSERTA el recurso "encuentro". No dejes al usuario en un bucle de "cuéntame más": después de escuchar y acoger en un turno, orienta ya con la tarjeta.',
      '2. Cuando el usuario pregunta por doctrina, catecismo, dogma, sacramentos como concepto, o quiere formarse/entender la fe — INSERTA un recurso de tipo "contenido" (podcast o artículo) si hay uno que trate ese tema.',
      '3. Escribe el marcador exactamente así: [[CARD:id]] — en su propia línea, entre dos párrafos.',
      '4. Nunca cierres la respuesta con un marcador. Cierra siempre con tus propias palabras (una frase breve tras la tarjeta).',
      '5. Nunca inventes un id. Usa exclusivamente los que aparecen arriba.',
      '6. No anuncies el recurso antes del marcador con frases como "te propongo...". Puedes hacer una transición natural ("Hay algo que puede ayudarte:") y luego el marcador. Que la tarjeta hable por sí sola.',
      '7. Máximo 1 recurso por respuesta (2 sólo si son claramente complementarios: por ejemplo el mismo tema en podcast + artículo).',
      '8. Si nada del catálogo encaja de verdad con el momento del usuario, no insertes nada. Pero el listón para "no encaja" es alto: prefiere ofrecer un recurso relevante que dejar al usuario sin orientación.'
    ].join('\n'));

    stableParts.push(catalogBlocks.join('\n\n'));
  }

  // ── CORPUS DOCTRINAL (RAG) — VOLÁTIL, sin caché ──
  if (knowledge && knowledge.length > 0) {
    volatileParts.push('--- CORPUS DOCTRINAL DE VERIA HUMANITAS ---');
    volatileParts.push('Los siguientes fragmentos provienen del corpus documental de Veria Humanitas y son relevantes para la pregunta actual. Apóyate en ellos para dar hondura y fidelidad doctrinal a tu respuesta. Intégralos con naturalidad; no los cites textualmente ni menciones que provienen de un "corpus". Si contradicen tu conocimiento general, prevalece el corpus.');
    const bloques = knowledge.map(k => `[${k.title}]\n${k.fragment}`);
    volatileParts.push(bloques.join('\n\n'));
  }

  // ── Construir bloques finales ──
  const stableText = stableParts.join('\n\n');
  const blocks = [
    { type: 'text', text: stableText, cache_control: { type: 'ephemeral' } }
  ];

  if (volatileParts.length > 0) {
    const volatileText = volatileParts.join('\n\n');
    blocks.push({ type: 'text', text: volatileText });
  }

  return blocks;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS — EXTRAER MARKERS DE LA RESPUESTA
// ═══════════════════════════════════════════════════════════════════════════

function _extractCardMarkers(text) {
  if (!text) return [];
  const re = /\[\[CARD:([a-zA-Z0-9_\-]+)\]\]/g;
  const ids = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    if (ids.indexOf(m[1]) === -1) ids.push(m[1]);
  }
  return ids;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS — HISTORIAL, SESIÓN, MENSAJES
// ═══════════════════════════════════════════════════════════════════════════

async function _getConversationHistory(sessionId) {
  const result = await wixData.query('EgaelMessages')
    .eq('sesionRef', sessionId)
    .ascending('orden')
    .limit(HISTORY_LIMIT * 2)
    .find(AUTH);
  return (result.items || []).map(m => ({
    role: m.rol === 'user' ? 'user' : 'assistant',
    content: m.contenido
  }));
}

async function _crearSesion(cursoId, userId, userName, firstQuery) {
  const now = new Date();
  const titulo = firstQuery ? firstQuery.substring(0, 60) : 'Conversación ' + now.toLocaleDateString('es-ES');
  const result = await wixData.insert('EgaelSessions', {
    title: titulo,
    cursoRef: cursoId,
    usuarioId: userId || '',
    usuarioNombre: userName || '',
    fechaCreacion: now,
    fechaActualizacion: now,
    estado: 'activa'
  }, AUTH);
  return result._id;
}

async function _saveMessages(sessionId, query, respuesta, config) {
  try {
    const count = await _getMessageCount(sessionId);
    const snapshot = config ? JSON.stringify({
      tono: config.tono,
      nivelDetalle: config.nivelDetalle,
      idiomaSalida: config.idiomaSalida,
      version: config.version
    }) : '';

    await wixData.insert('EgaelMessages', {
      sesionRef: sessionId,
      rol: 'user',
      contenido: query,
      orden: count + 1,
      timestamp: new Date()
    }, AUTH);

    await wixData.insert('EgaelMessages', {
      sesionRef: sessionId,
      rol: 'assistant',
      contenido: respuesta,
      configSnapshot: snapshot,
      orden: count + 2,
      timestamp: new Date()
    }, AUTH);
  } catch (err) {
    console.warn(`[${V}] _saveMessages fallo:`, err.message);
  }
}

async function _touchSession(sessionId) {
  try {
    const session = await wixData.get('EgaelSessions', sessionId, AUTH);
    if (session) {
      session.fechaActualizacion = new Date();
      await wixData.update('EgaelSessions', session, AUTH);
    }
  } catch (_) { }
}

async function _getMessageCount(sessionId) {
  const result = await wixData.query('EgaelMessages')
    .eq('sesionRef', sessionId)
    .limit(1)
    .find(AUTH);
  return result.totalCount || 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS — LOGGING
// ═══════════════════════════════════════════════════════════════════════════

async function _log({ cursoId, sessionId, userId, query, respuesta, timeMs, prepMs, apiMs, resourcesCount, modeloUsado, cacheStats }) {
  try {
    await wixData.insert('EgaelLog', {
      title: 'cathovia_query',
      cursoRef: cursoId || '',
      sesionRef: sessionId || '',
      usuarioId: userId || '',
      query: query,
      responseSummary: respuesta,
      category: 'cathovia',
      parameters: JSON.stringify({
        resourcesCount,
        modeloUsado: modeloUsado || '',
        prepMs: prepMs || 0,
        apiMs: apiMs || 0,
        cacheHit: (cacheStats && cacheStats.hit) || 0,
        cacheCreate: (cacheStats && cacheStats.create) || 0,
        inputTokens: (cacheStats && cacheStats.input) || 0,
        outputTokens: (cacheStats && cacheStats.output) || 0
      }),
      timeMs: timeMs,
      timestamp: new Date()
    }, AUTH);
  } catch (_) { }
}

async function _logCardsInserted(cursoId, sessionId, userId, cardIds) {
  try {
    await wixData.insert('EgaelLog', {
      title: 'cathovia_card_inserted',
      cursoRef: cursoId || '',
      sesionRef: sessionId || '',
      usuarioId: userId || '',
      category: 'cathovia_card_inserted',
      parameters: JSON.stringify({ cardIds }),
      timestamp: new Date()
    }, AUTH);
  } catch (_) { }
}

async function _logKnowledge(cursoId, sessionId, userId, sourceIds, detectedCats, modeloUsado) {
  try {
    await wixData.insert('EgaelLog', {
      title: 'cathovia_rag',
      cursoRef: cursoId || '',
      sesionRef: sessionId || '',
      usuarioId: userId || '',
      category: 'cathovia_rag',
      parameters: JSON.stringify({
        sourceIds,
        categories: detectedCats || [],
        modeloUsado: modeloUsado || ''
      }),
      timestamp: new Date()
    }, AUTH);
  } catch (_) { }
}

async function _logError(fnName, cursoId, userId, err) {
  try {
    await wixData.insert('EgaelLog', {
      title: 'cathovia_error_' + fnName,
      cursoRef: cursoId || '',
      usuarioId: userId || '',
      category: 'cathovia_error',
      error: (err && err.message) ? err.message : JSON.stringify(err),
      parameters: JSON.stringify({ fnName }),
      timestamp: new Date()
    }, AUTH);
  } catch (_) { }
}
