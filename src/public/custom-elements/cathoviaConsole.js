/* ═══════════════════════════════════════════════════════════════════════════
 * SABIO VALLEY — CATHOVIA Console (Wix Custom Element)
 * Archivo:  cathoviaConsole.js
 * Tag name: cathovia-console
 * VERSION:  1.6.8
 * FECHA:    18 Julio 2026
 *
 * CAMBIOS v1.6.7 → v1.6.8 — BETA EN WELCOME PARA MOVIL PEQUENO:
 *
 *   En ≤420px la pildora BETA de la topbar se oculta (no cabe entre el
 *   boton ≡, el logo y los dos botones de la derecha). Para que el usuario
 *   movil siga viendo la etiqueta de version, se anade "(Versión BETA en
 *   pruebas)" al final del mensaje de bienvenida (dentro del .welcome-sub),
 *   entre parentesis, en tamano ~0.75em y color muted.
 *
 *   Solo visible en ≤420px (via CSS display:none por defecto + display:inline
 *   en el @media). En desktop y tablet la etiqueta sigue estando arriba, en
 *   la topbar, y NO se duplica en el welcome.
 *
 *   Reutiliza brand.betaLabel — mismo texto en topbar y welcome, sin duplicar
 *   strings.
 *
 * CAMBIOS v1.6.6 → v1.6.7 — INDICADOR BETA + DISCLAIMER IA:
 *
 *   Anadidos dos elementos:
 *     - EN LA TOPBAR: pildora "Versión BETA en pruebas" justo a la derecha
 *       del boton ☰ (toggle historial). Uppercase, tracking, muted, con
 *       borde hairline. En ≤420px se oculta por falta de espacio horizontal.
 *     - DEBAJO DEL .input-box: disclaimer "CATHOVIA es IA y puede cometer
 *       errores" (texto pequeno centrado, patron habitual en consolas de
 *       IA generativa).
 *
 *   Ambos textos son configurables via brand:
 *     - DEFAULT_BRAND.betaLabel:  'Versión BETA en pruebas'
 *     - DEFAULT_BRAND.disclaimer: 'CATHOVIA es IA y puede cometer errores'
 *
 *   Si un vertical distinto no quiere alguno, basta con pasar cadena vacia
 *   en el brand externo — el bloque no se pinta.
 *
 *   Nota sobre el centrado del logo en la topbar: el .tb-brand mantiene
 *   flex:1, asi que al meter la pildora BETA a la izquierda el logo queda
 *   levemente desplazado hacia la derecha del eje visual (unos ~30-40px
 *   en desktop). Es asumible; si molesta se anade un spacer invisible del
 *   mismo ancho a la derecha del boton ◧.
 *
 * CAMBIOS v1.6.5 → v1.6.6 — LOGO EN PANTALLA DE BIENVENIDA:
 *
 *   El welcome pasa de "Bienvenido a Cathovia" (una linea, texto plano)
 *   a dos lineas: "Te damos la bienvenida a" + LOGO en linea propia debajo.
 *
 *   Razones:
 *     - A 46px de titulo desktop + logo inline, el conjunto se comia el
 *       ancho de .welcome-inner (540px) y en mobile (≤420px, titulo 28px)
 *       rompia a dos lineas dejando el logo colgando en la segunda.
 *     - El logo lleva CATHOVIA en versalitas con tracking amplio, disenado
 *       como marca aislada. Mezclado inline con serif corriente el peso
 *       optico no cuadra.
 *
 *   Cambios concretos:
 *     - DEFAULT_BRAND.welcomeTitle: 'Bienvenido a Cathovia' → 'Te damos la bienvenida a'
 *     - _renderWelcome() inserta <img class="welcome-logo"> entre el titulo
 *       y el subtitulo. Solo se pinta si b.logo existe (fallback: sin logo).
 *     - CSS nuevo .welcome-logo: display:block, height:64px desktop,
 *       48px ≤640px, 40px ≤420px. Mismo criterio que .tb-logo del topbar:
 *       height fijo, width:auto para preservar ratio del PNG con alfa.
 *     - .welcome-title: margin-bottom desktop 22px → 14px (el logo abre
 *       el espacio propio y no queremos hueco doble).
 *
 *   Reutiliza b.logo, la misma URL cruda del topbar (~mv2.png sin pipeline
 *   de transformacion), asi no hay riesgo de marco blanco por aplanamiento
 *   del canal alfa.
 *
 * CAMBIOS v1.6.4 → v1.6.5 — LOGO EN TOPBAR:
 *
 *   Sustituido el texto "Cathovia" (.tb-title) por el logo PNG con fondo
 *   transparente alojado en Wix Media Manager. El subtitulo VERIA HUMANITAS
 *   se mantiene debajo.
 *
 *   CLAVE (replica exacta del patron que funciona en EGAEL 1.0):
 *     - URL CRUDA de Media Manager, terminada en ~mv2.png. NUNCA la URL con
 *       segmento de transformacion /v1/fill/w_,h_,al_c,q_85,enc_auto/ porque
 *       ese pipeline reencoda y puede aplanar el canal alfa contra blanco,
 *       que es el origen del "marco" blanco alrededor del logo.
 *     - <img> directo. Nunca background-image sobre un div.
 *     - CSS minimo: solo height / width:auto / display:block. Sin background,
 *       sin border, sin box-shadow, sin filter. El marco lo produce el CSS,
 *       no el PNG.
 *     - El contenedor .tb-brand no lleva background propio: hereda --surface
 *       de la .topbar.
 *
 *   El PNG original es 300x66 (ratio 4.55:1) con alfa real verificado.
 *   A height:30px ocupa ~136px de ancho; 26px en movil, 22px en <=420px.
 *
 * CAMBIOS v1.6.3 → v1.6.4 — FIX REAL DEL LAYOUT (v1.6.3 no bastaba):
 *
 *   v1.6.3 arreglo los min-height:0 del grid (necesarios, se mantienen) pero
 *   NO resolvio el sintoma: el input seguia fuera de pantalla.
 *
 *   DIAGNOSTICO MEDIDO EN PRODUCCION (F12, arbol DOM real):
 *     [0] CATHOVIA-CONSOLE            height=1795.68px  rect=1796px
 *     [1] DIV#comp-mrcg3n71           height=1795.68px  rect=1796px
 *     [2] DIV (grid)                  height=1819.67px  rect=1820px
 *     [4] SECTION#comp-mrcg3n4x       height=1819.67px  rect=1820px
 *     SHADOW .app: height=1795.68px maxH=100% rect=1796px
 *
 *   El CSS de v1.6.3 funcionaba PERFECTAMENTE: .app respetaba max-height:100%
 *   y media 1796px. El problema es que su padre media 1796px.
 *
 *   CAUSA RAIZ: el editor de Wix declara #egaelConsole a 753px, pero el runtime
 *   IGNORA ese valor e infla el wrapper a ~1796px midiendo el contenido inicial
 *   del custom element. Con height:100% la consola hereda esa altura inventada.
 *   La ventana muestra ~950px → el .input-area queda a 1796px, fuera de vista.
 *   Ninguna cantidad de height:100% arregla esto: siempre heredara lo que Wix
 *   decida.
 *
 *   FIX: romper la herencia. `:host` se ancla a la VENTANA (100dvh), no al
 *   contenedor. Es exactamente lo que ya hacia el bloque @media (max-width:900px)
 *   — y por eso en movil nunca hubo este bug. Se usa dvh (dynamic viewport
 *   height) con fallback a vh: respeta las barras del navegador movil.
 *
 *   PRECONDICION: la pagina /cathovia contiene UNICAMENTE el custom element,
 *   sin cabecera ni footer de Wix visibles (verificado en produccion). Si algun
 *   dia se anaden, habra que restar su alto: calc(100dvh - Npx).
 *
 * CAMBIOS v1.6.2 → v1.6.3 — FIX DE LAYOUT EN DESKTOP (solo CSS, cero logica):
 *
 *   SINTOMA: con un historico largo (30 chats), en desktop la consola entera
 *   se estiraba. Habia que hacer scroll de PAGINA para leer la bienvenida y
 *   mas scroll para llegar a la casilla de escritura. La cabecera "HISTORIAL"
 *   y el boton "+ Nuevo" desaparecian por arriba.
 *
 *   CAMBIOS (todos se mantienen en v1.6.4):
 *     1. `.app`      → `max-height: 100%` + `min-height: 0`.
 *     2. `.sidebar`  → `min-height: 0`. Permite que `.chats-list` scrollee
 *                      dentro. "+ Nuevo" y la cabecera siempre visibles.
 *     3. `.main`     → `min-height: 0` + `overflow: hidden`. El `.input-area`
 *                      queda clavado abajo, como en Claude y ChatGPT.
 *     4. `.messages` → `min-height: 0` + `justify-content: flex-start`.
 *     5. `.welcome`  → fuera `margin: auto 0`. Arranca a 48px de la topbar.
 *
 *   En un grid/flex, un hijo con overflow-y:auto NO scrollea si su padre no
 *   tiene min-height:0 — el padre simplemente crece. Faltaba en .sidebar y .main.
 *
 * CAMBIOS v1.6.1 → v1.6.2 — FIX DUPLICACIÓN + POLLING REPETIDO:
 *
 *   1. FIX CRÍTICO — DUPLICACIÓN: v1.6.1 dejaba `emit('cathovia-query')` "por
 *      retro-compat" al mismo tiempo que el nuevo fetch HTTP. Resultado: cada
 *      pregunta viajaba por ambas rutas (widget→PageCode→webMethod + widget→
 *      HTTP), disparando DOS llamadas a Anthropic en paralelo y doble coste.
 *      Log en producción lo confirmó (dos "askCathoviaCore IN" idénticos).
 *      El emit se ELIMINA. La única ruta es fetch a /_functions/cathoviaAsk.
 *      El handler de cathovia-query en cathoviaPage.js queda huérfano pero
 *      inofensivo; Fase 2 lo limpiará.
 *
 *   2. POLLING REPETIDO EN LUGAR DE RECOVERY ÚNICO: los 14s de timeout duro
 *      de Wix Velo aplican a todo el backend (webMethods, http-functions,
 *      backend modules). Pero — según doc oficial y confirmado en producción —
 *      cuando el timeout se cumple, EL CÓDIGO SIGUE EJECUTÁNDOSE aunque la
 *      conexión al cliente se corte. La respuesta de Anthropic (16-22s) se
 *      guarda igual en EgaelMessages vía _saveMessages. Solo hay que ir a
 *      buscarla.
 *
 *      v1.6.0 hacía UN check a los 2.5s (demasiado pronto). v1.6.2 hace
 *      POLLING: cada 3s durante 60s, emite `cathovia-open-chat` y chequea si
 *      el historial devuelto contiene la respuesta esperada. En cuanto aparece,
 *      pinta y detiene el polling. Si a los 60s no ha llegado, muestra error
 *      con "Reintentar".
 *
 *      Nuevas constantes: POLL_INTERVAL_MS=3000, POLL_MAX_ATTEMPTS=20.
 *
 * CAMBIOS v1.6.0 → v1.6.1 — LLAMADA HTTP DIRECTA AL BACKEND:
 *   - `_sendQuery` ahora llama directamente a `/_functions/cathoviaAsk` con
 *     `fetch()` en vez de emitir `cathovia-query` al Page Code. Motivo: el
 *     proxy de webMethods en Wix mata el fetch cliente↔backend a los ~14s,
 *     por debajo del tiempo típico de Sonnet 4.6 (12-20s). http-functions.js
 *     tiene 5 min de timeout y no pasa por ese proxy.
 *
 *   - Beneficios adicionales:
 *     · Elimina el problema del setAttribute truncando payloads grandes en
 *       Page Code (mismo patrón que ya se usaba para TTS con egaelTts).
 *     · Reduce un salto de red (widget → HTTP → backend, sin pasar por
 *       Page Code intermedio).
 *     · Simplifica el ciclo de datos: la respuesta llega directa al fetch
 *       del widget, sin serializar/deserializar via setAttribute.
 *
 *   - El evento `cathovia-query` sigue emitiéndose para retro-compatibilidad
 *     (por si alguien tiene hooks en Page Code), pero la lógica principal
 *     ya no depende de él. En Fase 2 se limpiará cathoviaPage.js.
 *
 *   - El recovery del 504 (v1.6.0) sigue activo como red de seguridad: si
 *     por lo que sea el fetch a /_functions/cathoviaAsk fallara, el widget
 *     hace la misma recuperación via cathovia-open-chat que ya conocemos.
 *
 * CAMBIOS v1.5.1 → v1.6.0 — RECOVERY DE 504:
 *   - Cuando llega un error al widget (fetch cortado por el gateway de Wix
 *     a los 60s, aunque el backend haya terminado y guardado la respuesta
 *     en EgaelMessages), el widget ya NO se queda con la experiencia rota.
 *
 *   - El mensaje de error se pinta ahora con un botón "Reintentar" que
 *     reenvía la última query del usuario.
 *
 *   - Además: a los 2.5s del error, el widget emite `cathovia-open-chat`
 *     con el sessionId actual. El Page Code responde llamando a
 *     cathoviaAbrirChat, que devuelve el historial actualizado. Si el
 *     backend SÍ terminó y guardó la respuesta a la última pregunta, el
 *     historial la contiene → _applyHistory limpia el error y pinta la
 *     respuesta como si nada hubiera pasado. Si el backend NO terminó
 *     (Anthropic caído del todo), el historial no tiene respuesta al
 *     último user → se preserva el mensaje de error con el botón
 *     "Reintentar" para que el usuario decida qué hacer.
 *
 *   - Nuevos estados: _lastQuery, _pendingRecovery, _recoveryTimer,
 *     _lastErrorBlock.
 *   - _applyHistory ahora detecta si es una recuperación en curso y aplica
 *     historial sólo si aporta la respuesta esperada.
 *   - CSS del err-box actualizado para acomodar el botón "Reintentar".
 *
 * CAMBIOS v1.5.0 → v1.5.1:
 *   - Barra superior CONGELADA en móvil: .topbar con position:sticky top:0,
 *     .app acotado a 100dvh (altura dinámica del viewport, respeta las barras
 *     del navegador), y overflow controlado en .app/.layout/.main para que el
 *     scroll ocurra SOLO dentro de .messages. La topbar ya no se desplaza hacia
 *     arriba al alargarse el chat.
 *
 * CAMBIOS v1.4.4 → v1.5.0:
 *   - VOZ (TTS): botón 🔊 "Escuchar" al final de cada respuesta del asistente
 *     que llama a Gemini 3.1 Flash TTS (voz Umbriel por defecto) via el
 *     backend egaelTTS.web.js. Reproduce el WAV inline sin abandonar el chat.
 *   - Toggle global 🔊/🔇 en topbar para activar/desactivar auto-reproducción
 *     de todas las respuestas. Estado persistido en localStorage.
 *   - MICRÓFONO: botón 🎤 en la barra de input. Web Speech API con manejo
 *     robusto de permisos, silencio prolongado, safety timer. Distingue
 *     Android/Desktop/iOS con estrategias diferentes (portado de +50 v1.0).
 *   - Sanitización antes de TTS: elimina [[CARD:id]] y markdown para que
 *     la voz no lea "asterisco asterisco" ni identificadores.
 *   - Nuevo evento cathovia-tts con {texto, messageId} y atributos ttsAudio
 *     y ttsError para recibir el resultado del backend.
 *
 * CAMBIOS v1.4.3 → v1.4.4:
 *   - Borrado de conversaciones del historial. Cada item de la lista tiene
 *     ahora una papelera (visible al hover en desktop, siempre en móvil).
 *     Click en la papelera abre un modal de confirmación con "Cancelar"
 *     y "Borrar" (rojo). Al confirmar, emite cathovia-delete-chat con
 *     sessionId y quita el item del listado optimistamente. Si el chat
 *     borrado era el actual, resetea a nuevo chat.
 *
 * CAMBIOS v1.4.2 → v1.4.3:
 *   - _applyInlineCatalog acepta payload envuelto {_ts, items} además del
 *     array crudo y {inlineCatalog:[]}. Necesario para el fix del bug de
 *     reapertura del Page Code v1.4.3.
 *
 * CAMBIOS v1.4.1 → v1.4.2:
 *   - FIX BUG DE REAPERTURA: eliminado el short-circuit oldVal===newVal en
 *     attributeChangedCallback. Cuando el usuario reabre el mismo chat viejo,
 *     el JSON de history e inlineCatalog llega idéntico y el widget lo
 *     ignoraba silenciosamente. Ahora se re-renderiza siempre que llegue
 *     un atributo (los _apply* limpian y repintan desde cero, es seguro).
 *
 * CAMBIOS v1.4.0 → v1.4.1:
 *   - Botón X de cierre en la cabecera del sidebar y del panel, visible SOLO
 *     en móvil (viewport <900px). Cerrar tocando el backdrop sigue funcionando
 *     como atajo.
 *
 * CAMBIOS v1.3.2 → v1.4.0:
 *   - Panel lateral con dos secciones fijas: CURSOS (arriba) + AGENDA (abajo)
 *     Eliminada la sección "Contenidos" del panel — los contenidos ahora
 *     aparecen inline en la conversación cuando la IA lo justifica.
 *   - Nuevo atributo `courses` (antes `contenidos`).
 *   - Nuevo atributo `inlineCatalog` con los ítems tipo contenido+encuentro
 *     que la IA puede insertar como cards inline mediante [[CARD:id]].
 *   - Nuevos eventos: `cathovia-load-courses` (reemplaza cathovia-load-content),
 *     `cathovia-load-inline` (carga el catálogo inline al iniciar).
 *   - `_appendAssistant` parsea marcadores [[CARD:id]] y los sustituye por
 *     cards renderizadas según el tipo del ítem:
 *       · contenido con audio → título + shortDescription + <audio controls>
 *       · contenido sin audio + actionUrl → título + shortDescription + "Leer"
 *       · encuentro → título + shortDescription + "Solicitar encuentro"
 *   - Cards inline aparecen entre párrafos del asistente (no como parte del
 *     texto editorial), con estilo diferenciado del texto para que se lean
 *     como objetos independientes.
 *   - Nuevo evento `cathovia-inline-action` cuando el usuario pulsa el CTA
 *     de una card inline. { itemId, type, actionUrl }
 *   - Player nativo <audio controls> — cero librerías, funciona en móvil.
 * ═══════════════════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  if (customElements.get('cathovia-console')) {
    console.log('[CATHOVIA v1.6.5] Ya registrado.');
    return;
  }

  const VERSION = '1.6.5';
  const TAG = `[CATHOVIA v${VERSION}]`;

  const LS_SIDEBAR = 'cathovia-sidebar-open';
  const LS_PANEL   = 'cathovia-panel-open';
  const LS_TTS_AUTO = 'cathovia-tts-auto';

  // Polling repetido tras timeout del backend (v1.6.2)
  // Wix Velo corta la conexión cliente↔backend a los 14s. Pero el código
  // backend SIGUE ejecutándose y termina de guardar la respuesta assistant
  // en EgaelMessages (Anthropic tarda 16-22s). El widget hace polling cada
  // 3s durante 60s buscando esa respuesta.
  const POLL_INTERVAL_MS  = 3000;   // Consulta cada 3s
  const POLL_MAX_ATTEMPTS = 20;     // 20 * 3s = 60s de espera total

  // Micrófono — timers portados de EGAEL +50
  const SILENCE_MS = 2200;   // Silencio tras el cual se envía
  const SAFETY_MS  = 12000;  // Timeout total de una sesión de mic

  // Detección de plataforma (Web Speech API se comporta distinto)
  const UA = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
  const IS_IOS = /iPad|iPhone|iPod/.test(UA) && !window.MSStream;
  const IS_ANDROID = /Android/.test(UA);

  const DEFAULT_COLORS = {
    bg:        '#EFE8D5',
    surface:   '#FBF7EC',
    card:      '#FFFFFF',
    ink:       '#1F2430',
    inkSoft:   '#3A3F4B',
    muted:     '#6E6A5F',
    hairline:  '#D9CFB5',
    accent:    '#1E3A5F',
    accentInk: '#FBF7EC'
  };

  const DEFAULT_BRAND = {
    name:         'Cathovia',
    sub:          'Veria Humanitas',
    logo:         'https://static.wixstatic.com/media/420ca1_0d19ac1f375b4228908ecb774581fb30~mv2.png',
    welcomeTitle: 'Te damos la bienvenida a',
    welcome:      'Estoy aquí para acompañarte —en cualquier ámbito de tu vida— desde la mirada y las enseñanzas de la Iglesia Católica. Pregúntame lo que quieras.',
    placeholder:  'Escribe tu pregunta…',
    thinking:     'Buscando la respuesta…',
    betaLabel:    'Versión BETA en pruebas',
    disclaimer:   'CATHOVIA es IA y puede cometer errores',
    fontTitle:    '"Instrument Serif", Georgia, "Times New Roman", serif',
    fontBody:     '"Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  };

  function isMobileViewport() {
    try { return window.matchMedia('(max-width: 900px)').matches; }
    catch (_) { return window.innerWidth < 900; }
  }

  class CathoviaConsole extends HTMLElement {

    static get observedAttributes() {
      return ['config', 'response', 'chats', 'history', 'courses', 'eventos', 'inlineCatalog', 'ttsAudio', 'ttsError', 'systemError'];
    }

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._cursoId       = '';
      this._userId        = '';
      this._userName      = '';
      this._sessionId     = null;
      this._chats         = [];
      this._courses       = [];
      this._eventos       = [];
      this._inlineCatalog = [];
      this._pending       = false;
      this._pendingId     = null;
      this._msgCounter    = 0;
      this._hasMessages   = false;
      this._brand         = { ...DEFAULT_BRAND };
      this._colors        = { ...DEFAULT_COLORS };

      // Polling repetido tras timeout del backend (v1.6.2)
      this._lastQuery         = '';    // última query enviada, para "Reintentar"
      this._polling           = false; // hay polling activo esperando respuesta
      this._pollTimer         = null;  // timer del setTimeout entre intentos
      this._pollAttempts      = 0;     // contador de intentos hechos
      this._lastErrorBlock    = null;  // ref DOM del bloque de error activo (solo si polling agota)

      // TTS state
      this._ttsAutoPlay      = this._readLS(LS_TTS_AUTO, true);
      this._audioEl          = null;   // <audio> reutilizado
      this._playingMessageId = null;   // qué respuesta está sonando

      // Mic state (portado de EGAEL +50)
      this._SR              = null;
      this._recognition     = null;
      this._isListening     = false;
      this._silenceTimer    = null;
      this._safetyTimer     = null;
      this._micStoppingForSend = false;
      this._androidFinalBuffer = '';
      this._lastFinalTranscript = '';

      const mobile = isMobileViewport();
      this._sidebarOpen = mobile ? false : this._readLS(LS_SIDEBAR, true);
      this._panelOpen   = mobile ? false : this._readLS(LS_PANEL, false);
    }

    connectedCallback() {
      this._render();
      this._bindEvents();
      this._renderWelcome();
      this._setupMic();
      this._updateTtsToggleUI();
      setTimeout(() => this._emit('cathovia-ready', {}), 50);
      console.log(`${TAG} Montado. sidebar=${this._sidebarOpen} panel=${this._panelOpen} ttsAuto=${this._ttsAutoPlay}`);
    }

    attributeChangedCallback(name, oldVal, newVal) {
      console.log(`${TAG} attributeChangedCallback name=${name} newValLen=${(newVal || '').length}`);
      if (!newVal) return;
      // NOTA v1.4.2: NO se aplica short-circuit oldVal===newVal.
      // Los atributos como history e inlineCatalog pueden llegar con el
      // MISMO JSON al reabrir un chat, y sin embargo hay que re-renderizar
      // porque el widget necesita reconstruir el DOM desde cero.
      if (name === 'systemError') { this._showSystemError(newVal); return; }
      let payload;
      try { payload = JSON.parse(newVal); } catch (e) { return; }

      if (name === 'config')        this._applyConfig(payload);
      if (name === 'response')      this._handleResponse(payload);
      if (name === 'chats')         this._applyChats(payload);
      if (name === 'history')       this._applyHistory(payload);
      if (name === 'courses')       this._applyCourses(payload);
      if (name === 'eventos')       this._applyEventos(payload);
      if (name === 'inlineCatalog') this._applyInlineCatalog(payload);
      if (name === 'ttsAudio')      this._applyTtsAudio(payload);
      if (name === 'ttsError')      this._applyTtsError(payload);
    }

    _applyConfig(cfg) {
      console.log(`${TAG} applyConfig`, cfg);
      if (cfg.cursoId)   this._cursoId   = cfg.cursoId;
      if (cfg.userId)    this._userId    = cfg.userId;
      if (cfg.userName)  this._userName  = cfg.userName;
      if (cfg.sessionId) this._sessionId = cfg.sessionId;
      if (cfg.brand)     this._brand     = { ...DEFAULT_BRAND, ...cfg.brand };
      if (cfg.colors && Object.keys(cfg.colors).length > 0) {
        this._colors = { ...DEFAULT_COLORS, ...cfg.colors };
      }
      this._render();
      this._bindEvents();
      this._paintExpert(cfg.expert || null);
      if (this._sessionId) {
        this._emit('cathovia-open-chat', { sessionId: this._sessionId });
      } else {
        this._renderWelcome();
      }
      this._emit('cathovia-load-chats',   {});
      this._emit('cathovia-load-courses', {});
      this._emit('cathovia-load-events',  {});
      this._emit('cathovia-load-inline',  {});
    }

    _applyChats(payload) {
      const list = Array.isArray(payload) ? payload : (payload.chats || []);
      this._chats = list;
      this._renderChats();
    }

    _applyHistory(payload) {
      const sessionId = payload.sessionId || null;
      const mensajes  = payload.mensajes || [];
      if (sessionId) this._sessionId = sessionId;

      // ─── LÓGICA DE POLLING (v1.6.2) ───
      // Si estamos en un polling activo esperando respuesta del backend
      // (porque el fetch anterior dio timeout / 504), sólo repintamos si el
      // historial contiene la respuesta esperada. Si no, mantenemos el
      // "pensando…" y programamos el siguiente intento.
      if (this._polling) {
        if (this._historyContainsExpectedAnswer(mensajes)) {
          console.log(`${TAG} polling OK en intento #${this._pollAttempts}: respuesta encontrada`);
          this._stopPolling();
          // Sigue el flujo normal más abajo → limpia thinking, pinta la respuesta
        } else {
          console.log(`${TAG} polling: intento #${this._pollAttempts} sin respuesta aún`);
          this._scheduleNextPoll();
          return; // no repintamos, mantenemos el "pensando…"
        }
      }

      const messagesEl = this.shadowRoot.getElementById('messages');
      messagesEl.innerHTML = '';
      this._hasMessages = false;
      this._lastErrorBlock = null; // se limpia con el innerHTML

      if (mensajes.length === 0) {
        this._renderWelcome();
      } else {
        mensajes.forEach(m => {
          if (m.rol === 'user') this._appendUser(m.contenido, false);
          else this._appendAssistant(m.contenido, false);
        });
        this._hasMessages = true;
        this._scrollBottom();
      }
      this._highlightActiveChat();
    }

    /**
     * True si el historial contiene la respuesta que estábamos esperando:
     * el último mensaje user coincide con this._lastQuery Y hay al menos
     * un assistant después.
     */
    _historyContainsExpectedAnswer(mensajes) {
      if (!Array.isArray(mensajes) || mensajes.length === 0) return false;
      if (!this._lastQuery) return false;

      // Buscar de atrás adelante: el último user debería coincidir con lastQuery
      // y debe tener al menos un assistant DESPUÉS.
      let lastUserIdx = -1;
      for (let i = mensajes.length - 1; i >= 0; i--) {
        if (mensajes[i].rol === 'user') { lastUserIdx = i; break; }
      }
      if (lastUserIdx === -1) return false;

      const lastUserContent = String(mensajes[lastUserIdx].contenido || '').trim();
      const lastQuery = String(this._lastQuery || '').trim();
      if (lastUserContent !== lastQuery) {
        console.log(`${TAG} recovery: último user en historial no coincide con lastQuery`);
        return false;
      }

      // ¿Hay algún assistant después del último user?
      for (let i = lastUserIdx + 1; i < mensajes.length; i++) {
        if (mensajes[i].rol === 'assistant') return true;
      }
      return false;
    }

    _applyCourses(payload) {
      const list = Array.isArray(payload) ? payload : (payload.courses || payload.items || []);
      this._courses = list;
      this._renderCourses();
    }

    _applyEventos(payload) {
      const list = Array.isArray(payload) ? payload : (payload.eventos || payload.items || []);
      this._eventos = list;
      this._renderEventos();
    }

    _applyInlineCatalog(payload) {
      // Acepta array crudo, {inlineCatalog:[]}, {items:[]}, o {_ts, items:[]}
      let list = [];
      if (Array.isArray(payload)) list = payload;
      else if (payload.items) list = payload.items;
      else if (payload.inlineCatalog) list = payload.inlineCatalog;
      this._inlineCatalog = list;
      console.log(`${TAG} inlineCatalog cargado: ${list.length} ítems`);
    }

    _handleResponse(payload) {
      console.log(`${TAG} handleResponse`, payload);
      this._hideThinking();
      this._pending = false;

      if (payload.messageId && this._pendingId && payload.messageId !== this._pendingId) return;
      this._pendingId = null;

      if (payload.sessionId && !this._sessionId) {
        this._sessionId = payload.sessionId;
        this._emit('cathovia-load-chats', {});
      }

      // Actualizar catálogo inline si viene en la respuesta
      if (payload.inlineCatalog && Array.isArray(payload.inlineCatalog)) {
        this._inlineCatalog = payload.inlineCatalog;
      }

      const text = payload.respuesta
                || (typeof payload.error === 'string' ? payload.error : null)
                || (payload.error && payload.error.message) || null;

      if (payload.error && !payload.respuesta) {
        // v1.6.2: el fetch cliente↔backend falló (típicamente 504 tras 14s del
        // proxy de Wix), pero el código backend sigue ejecutándose y guardará
        // la respuesta en EgaelMessages cuando termine. Arrancamos polling
        // en lugar de mostrar error: el "pensando…" se queda visible, cada 3s
        // preguntamos por el historial, y en cuanto aparece la respuesta la
        // pintamos como si nada hubiera pasado.
        if (this._sessionId && this._lastQuery) {
          this._startPolling();
          return; // NO ocultamos thinking, NO mostramos error
        }
        // Sin sessionId no hay nada que buscar → error normal con Reintentar
        this._stopPolling();
        const errBlock = this._appendErrorWithRetry(text || 'Error de conexión.');
        this._lastErrorBlock = errBlock;
      } else if (text) {
        // ── RESPUESTA OK → cualquier polling en curso se detiene ──
        this._stopPolling();
        this._lastErrorBlock = null;
        this._appendAssistant(text, true);
      } else {
        this._appendError('No he recibido respuesta. Inténtalo de nuevo.');
      }
    }

    /**
     * Arranca polling repetido buscando la respuesta assistant esperada.
     * Motivo: Wix Velo tiene timeout duro de 14s en backend, pero el código
     * sigue ejecutándose después. La respuesta de Anthropic (16-22s) queda
     * guardada en EgaelMessages via _saveMessages. Solo hay que ir a buscarla.
     *
     * Emite `cathova-open-chat` cada POLL_INTERVAL_MS. `_applyHistory` con
     * `_polling=true` chequea si el historial contiene la respuesta y, si sí,
     * la pinta y detiene el polling.
     */
    _startPolling() {
      this._stopPolling();
      this._polling = true;
      this._pollAttempts = 0;
      console.log(`${TAG} startPolling: sessionId=${this._sessionId} cada ${POLL_INTERVAL_MS}ms máx ${POLL_MAX_ATTEMPTS} intentos`);
      this._scheduleNextPoll();
    }

    _scheduleNextPoll() {
      if (!this._polling) return;
      this._pollAttempts++;
      if (this._pollAttempts > POLL_MAX_ATTEMPTS) {
        console.log(`${TAG} polling: máx intentos alcanzado, mostrando error`);
        this._stopPolling();
        this._hideThinking();
        this._pending = false;
        const errBlock = this._appendErrorWithRetry(
          'La respuesta está tardando más de lo previsto. Puedes reintentar o esperar unos segundos.'
        );
        this._lastErrorBlock = errBlock;
        return;
      }
      this._pollTimer = setTimeout(() => {
        if (!this._polling) return;
        console.log(`${TAG} polling: intento #${this._pollAttempts}/${POLL_MAX_ATTEMPTS}`);
        this._emit('cathovia-open-chat', { sessionId: this._sessionId });
      }, POLL_INTERVAL_MS);
    }

    _stopPolling() {
      if (this._pollTimer) { clearTimeout(this._pollTimer); this._pollTimer = null; }
      this._polling = false;
      this._pollAttempts = 0;
    }

    _sendQuery(query) {
      if (this._pending || !query.trim()) return;
      this._msgCounter++;
      const messageId = `msg_${this._msgCounter}_${Date.now()}`;
      this._pendingId = messageId;
      this._pending   = true;
      this._lastQuery = query.trim();

      // Nueva petición → cualquier polling en curso se detiene
      this._stopPolling();

      // Si había un mensaje de error activo del intento anterior, lo quitamos
      if (this._lastErrorBlock) {
        try { this._lastErrorBlock.remove(); } catch (_) {}
        this._lastErrorBlock = null;
      }

      this._clearWelcome();
      this._appendUser(query, true);
      this._showThinking();

      console.log(`${TAG} sendQuery "${query.substring(0, 40)}…" via HTTP`);

      // v1.6.2: SOLO ruta HTTP. Se eliminó el emit('cathovia-query') que en
      // v1.6.1 causaba doble llamada a askCathoviaCore (via Page Code + via
      // HTTP function).
      this._fetchCathoviaAsk(query, messageId);
    }

    /**
     * v1.6.1: petición HTTP directa a /_functions/cathoviaAsk.
     * Reemplaza el flujo widget → cathovia-query → Page Code → webMethod
     * que sufría el timeout del proxy Wix a los ~14s. Aquí tenemos 5 min.
     */
    async _fetchCathoviaAsk(query, messageId) {
      try {
        const res = await fetch('/_functions/cathoviaAsk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cursoId:  this._cursoId,
            sessionId: this._sessionId,
            query:    query,
            userId:   this._userId,
            userName: this._userName
          })
        });

        if (!res.ok) {
          console.warn(`${TAG} cathoviaAsk HTTP ${res.status}`);
          this._handleResponse({
            messageId,
            error: `El servicio respondió con error ${res.status}. Reintenta en unos segundos.`
          });
          return;
        }

        const data = await res.json();
        console.log(`${TAG} cathoviaAsk OK respuestaLen=${(data.respuesta || '').length}`);

        // Reutilizamos el mismo pipeline de respuesta que ya existía para
        // la ruta webMethod. Añadimos messageId para el matching.
        this._handleResponse({
          messageId,
          ok: data.ok,
          respuesta: data.respuesta,
          sessionId: data.sessionId,
          inlineCatalog: data.inlineCatalog,
          error: data.ok ? null : (data.error || 'Error desconocido')
        });
      } catch (err) {
        console.error(`${TAG} cathoviaAsk EXCEPTION:`, err.message || err);
        this._handleResponse({
          messageId,
          error: 'No he podido conectar con el servicio. Reintenta en unos segundos.'
        });
      }
    }

    _handleSend() {
      const input = this.shadowRoot.getElementById('chatInput');
      const query = (input.value || '').trim();
      if (!query) return;
      input.value = '';
      input.style.height = 'auto';
      this._sendQuery(query);
      setTimeout(() => input.focus(), 0);
    }

    _bindEvents() {
      const root = this.shadowRoot;
      root.getElementById('sendBtn').addEventListener('click', () => this._handleSend());

      const input = root.getElementById('chatInput');
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this._handleSend(); }
      });
      input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 180) + 'px';
      });

      const inputBox = root.querySelector('.input-box');
      if (inputBox) {
        inputBox.addEventListener('click', (e) => {
          if (e.target !== input && e.target.tagName !== 'BUTTON') {
            input.focus();
          }
        });
      }

      root.getElementById('btnToggleSidebar').addEventListener('click', () => this._toggleSidebar());
      root.getElementById('btnTogglePanel').addEventListener('click',   () => this._togglePanel());
      root.getElementById('btnNewChat').addEventListener('click', () => {
        this._resetToNewChat();
      });
      const refCourses = root.getElementById('btnRefreshCourses');
      if (refCourses) refCourses.addEventListener('click', () => this._emit('cathovia-load-courses', {}));
      const refEvents = root.getElementById('btnRefreshEvents');
      if (refEvents) refEvents.addEventListener('click', () => this._emit('cathovia-load-events', {}));

      const backdrop = root.getElementById('backdrop');
      if (backdrop) backdrop.addEventListener('click', () => this._closeAllPanels());

      const closeSidebar = root.getElementById('btnCloseSidebar');
      if (closeSidebar) closeSidebar.addEventListener('click', () => {
        this._sidebarOpen = false;
        this._writeLS(LS_SIDEBAR, false);
        this._applyLayoutState();
      });

      const closePanel = root.getElementById('btnClosePanel');
      if (closePanel) closePanel.addEventListener('click', () => {
        this._panelOpen = false;
        this._writeLS(LS_PANEL, false);
        this._applyLayoutState();
      });

      const closeErr = root.getElementById('closeErrorBanner');
      if (closeErr) closeErr.addEventListener('click', () => this._hideSystemError());

      const btnToggleTts = root.getElementById('btnToggleTts');
      if (btnToggleTts) btnToggleTts.addEventListener('click', () => this._toggleTtsAutoPlay());

      const micBtn = root.getElementById('micBtn');
      if (micBtn) micBtn.addEventListener('click', () => this._toggleMic());
    }

    _closeAllPanels() {
      this._sidebarOpen = false;
      this._panelOpen   = false;
      this._applyLayoutState();
    }

    _resetToNewChat() {
      this._stopPolling();
      this._sessionId    = null;
      this._hasMessages  = false;
      this._pending      = false;
      this._pendingId    = null;
      this._lastQuery    = '';
      this._lastErrorBlock = null;
      const m = this.shadowRoot.getElementById('messages');
      if (m) m.innerHTML = '';
      this._renderWelcome();
      this._highlightActiveChat();
      const input = this.shadowRoot.getElementById('chatInput');
      if (input) input.focus();
      if (isMobileViewport()) this._closeAllPanels();
    }

    _toggleSidebar() {
      this._sidebarOpen = !this._sidebarOpen;
      if (isMobileViewport() && this._sidebarOpen) this._panelOpen = false;
      this._writeLS(LS_SIDEBAR, this._sidebarOpen);
      this._applyLayoutState();
    }
    _togglePanel() {
      this._panelOpen = !this._panelOpen;
      if (isMobileViewport() && this._panelOpen) this._sidebarOpen = false;
      this._writeLS(LS_PANEL, this._panelOpen);
      this._applyLayoutState();
    }
    _applyLayoutState() {
      const layout = this.shadowRoot.getElementById('layout');
      layout.classList.toggle('sidebar-open', this._sidebarOpen);
      layout.classList.toggle('panel-open',   this._panelOpen);
    }

    _showSystemError(msg) {
      const banner = this.shadowRoot.getElementById('errorBanner');
      const text   = this.shadowRoot.getElementById('errorBannerText');
      if (banner && text) {
        text.textContent = msg;
        banner.style.display = 'flex';
      }
    }
    _hideSystemError() {
      const banner = this.shadowRoot.getElementById('errorBanner');
      if (banner) banner.style.display = 'none';
    }

    _clearWelcome() {
      const w = this.shadowRoot.querySelector('.welcome');
      if (w) w.remove();
    }

    _appendUser(text, scroll) {
      this._clearWelcome();
      this._hasMessages = true;
      const el = document.createElement('div');
      el.className = 'turn turn-user';
      el.innerHTML = `<div class="bubble">${this._escape(text)}</div>`;
      this.shadowRoot.getElementById('messages').appendChild(el);
      if (scroll) this._scrollBottom();
    }

    _appendAssistant(text, scroll) {
      this._clearWelcome();
      this._hasMessages = true;
      this._msgCounter++;
      const messageId = `ai_${this._msgCounter}_${Date.now()}`;
      const el = document.createElement('div');
      el.className = 'turn turn-ai';
      el.dataset.messageId = messageId;
      el.dataset.rawText = text;
      el.innerHTML = this._formatEditorialWithCards(text) + this._renderTtsButton(messageId);
      this.shadowRoot.getElementById('messages').appendChild(el);
      // Attach handlers to inline card CTAs
      el.querySelectorAll('.inline-card-cta').forEach(btn => {
        btn.addEventListener('click', () => {
          const itemId = btn.dataset.itemid;
          const type   = btn.dataset.type;
          const url    = btn.dataset.url;
          this._emit('cathovia-inline-action', { itemId, type, actionUrl: url });
          if (url) {
            try { window.open(url, '_blank', 'noopener'); } catch (_) {}
          }
        });
      });
      // Attach handler to TTS button
      const ttsBtn = el.querySelector('.tts-btn');
      if (ttsBtn) {
        ttsBtn.addEventListener('click', () => this._onTtsButtonClick(messageId, text, ttsBtn));
      }
      if (scroll) this._scrollBottom();
      // Auto-play si toggle global activo (solo para respuestas nuevas, no historial)
      if (scroll && this._ttsAutoPlay) {
        setTimeout(() => this._onTtsButtonClick(messageId, text, ttsBtn), 200);
      }
    }

    _renderTtsButton(messageId) {
      return `<div class="tts-row"><button class="tts-btn" data-mid="${messageId}" data-state="idle" title="Escuchar" aria-label="Escuchar">
        <span class="tts-icon">🔊</span><span class="tts-label">Escuchar</span>
      </button></div>`;
    }

    _appendError(text) {
      const el = document.createElement('div');
      el.className = 'turn turn-error';
      el.innerHTML = `<div class="err-box"><span class="err-icon">!</span><span>${this._escape(text)}</span></div>`;
      this.shadowRoot.getElementById('messages').appendChild(el);
      this._scrollBottom();
      return el;
    }

    /**
     * Variante del error con botón "Reintentar" que reenvía this._lastQuery.
     * Devuelve el DOM element para poder quitarlo cuando llegue la respuesta
     * de una recovery o de un reintento.
     */
    _appendErrorWithRetry(text) {
      const canRetry = !!this._lastQuery;
      const el = document.createElement('div');
      el.className = 'turn turn-error';
      el.innerHTML = `
        <div class="err-box err-box-retry">
          <div class="err-body">
            <span class="err-icon">!</span>
            <span class="err-text">${this._escape(text)}</span>
          </div>
          ${canRetry ? `<button class="err-retry-btn" type="button" aria-label="Reintentar">↻ Reintentar</button>` : ''}
        </div>
      `;
      this.shadowRoot.getElementById('messages').appendChild(el);

      if (canRetry) {
        const btn = el.querySelector('.err-retry-btn');
        if (btn) {
          btn.addEventListener('click', () => {
            const q = this._lastQuery;
            if (!q) return;
            // Quitar este bloque de error antes de reintentar
            try { el.remove(); } catch (_) {}
            if (this._lastErrorBlock === el) this._lastErrorBlock = null;
            this._sendQuery(q);
          });
        }
      }
      this._scrollBottom();
      return el;
    }

    _showThinking() {
      const el = document.createElement('div');
      el.className = 'turn turn-thinking';
      el.id = 'thinkingRow';
      el.innerHTML = `<div class="thinking">
                        <div class="thinking-dots"><span></span><span></span><span></span></div>
                        <div class="thinking-label">${this._escape(this._brand.thinking)}</div>
                      </div>`;
      this.shadowRoot.getElementById('messages').appendChild(el);
      this._scrollBottom();
    }
    _hideThinking() {
      const el = this.shadowRoot.getElementById('thinkingRow');
      if (el) el.remove();
    }

    _scrollBottom() {
      const m = this.shadowRoot.getElementById('messages');
      m.scrollTop = m.scrollHeight;
    }

    // ─────────────────────────────────────────────────────────────────────
    // FORMATO EDITORIAL + PARSEO [[CARD:id]]
    // ─────────────────────────────────────────────────────────────────────

    _formatEditorialWithCards(text) {
      const catalogMap = new Map();
      (this._inlineCatalog || []).forEach(it => catalogMap.set(it.id, it));

      const paragraphs = String(text || '').split(/\n{2,}/);
      const outer = ['<div class="editorial">'];

      const MARKER_RE = /\[\[CARD:([a-zA-Z0-9_\-]+)\]\]/g;

      for (const rawPara of paragraphs) {
        const para = rawPara.trim();
        if (!para) continue;

        // Caso A: párrafo es exclusivamente un marcador
        const onlyMarker = para.match(/^\[\[CARD:([a-zA-Z0-9_\-]+)\]\]$/);
        if (onlyMarker) {
          const item = catalogMap.get(onlyMarker[1]);
          if (item) {
            // Cerrar editorial temporalmente para insertar la card fuera del <div class="editorial">
            outer.push('</div>');
            outer.push(this._renderInlineCard(item));
            outer.push('<div class="editorial">');
          }
          continue;
        }

        // Caso B: marcadores mezclados con texto — extraer marcadores, dejar texto
        const cardsInPara = [];
        const textPart = para.replace(MARKER_RE, (m, id) => {
          const item = catalogMap.get(id);
          if (item) cardsInPara.push(item);
          return ''; // eliminar el marcador del texto
        }).trim();

        if (textPart) {
          const safe = this._escape(textPart).replace(/\n/g, '<br>');
          outer.push(`<p>${safe}</p>`);
        }
        for (const item of cardsInPara) {
          outer.push('</div>');
          outer.push(this._renderInlineCard(item));
          outer.push('<div class="editorial">');
        }
      }

      outer.push('</div>');
      // Limpia editoriales vacías
      return outer.join('').replace(/<div class="editorial"><\/div>/g, '');
    }

    _renderInlineCard(item) {
      const type   = item.type || 'contenido';
      const title  = this._escape(item.title || '');
      const desc   = this._escape(item.shortDescription || '');
      const url    = item.actionUrl || '';
      const audio  = item.audioUrl || '';
      const eyebrow = type === 'encuentro' ? 'Encuentro de acompañamiento' :
                      (audio ? 'Podcast' : 'Contenido');

      let audioBlock = '';
      if (audio) {
        audioBlock = `<audio class="inline-audio" controls preload="metadata" src="${this._escape(audio)}"></audio>`;
      }

      let ctaBlock = '';
      if (type === 'encuentro' && url) {
        ctaBlock = this._ctaButton(item.id, type, url, 'Solicitar encuentro');
      } else if (type === 'contenido' && !audio && url) {
        ctaBlock = this._ctaButton(item.id, type, url, 'Leer contenido');
      } else if (type === 'contenido' && audio && url) {
        ctaBlock = this._ctaButton(item.id, type, url, 'Ver más');
      }

      return `
        <div class="turn-inline">
          <div class="inline-card" data-id="${this._escape(item.id)}">
            <div class="inline-eyebrow">${this._escape(eyebrow)}</div>
            <div class="inline-title">${title}</div>
            ${desc ? `<div class="inline-desc">${desc}</div>` : ''}
            ${audioBlock}
            ${ctaBlock}
          </div>
        </div>
      `;
    }

    _ctaButton(itemId, type, url, label) {
      return `<button class="inline-card-cta"
                      data-itemid="${this._escape(itemId)}"
                      data-type="${this._escape(type)}"
                      data-url="${this._escape(url)}">${this._escape(label)}</button>`;
    }

    _renderWelcome() {
      const messages = this.shadowRoot.getElementById('messages');
      if (!messages) return;
      if (this._hasMessages) return;
      if (messages.querySelector('.welcome')) return;

      const el = document.createElement('div');
      el.className = 'welcome';
      const logoUrl = this._brand.logo || '';
      const logoHtml = logoUrl
        ? `<img class="welcome-logo" src="${logoUrl}" alt="${this._escape(this._brand.name || '')}" />`
        : '';
      const betaHtml = this._brand.betaLabel
        ? ` <span class="welcome-beta">(${this._escape(this._brand.betaLabel)})</span>`
        : '';
      el.innerHTML = `
        <div class="welcome-inner">
          <div class="welcome-ornament">— ✦ —</div>
          <div class="welcome-title">${this._escape(this._brand.welcomeTitle || this._brand.name)}</div>
          ${logoHtml}
          <div class="welcome-sub">${this._escape(this._brand.welcome)}${betaHtml}</div>
        </div>
      `;
      messages.appendChild(el);
    }

    _renderChats() {
      const list = this.shadowRoot.getElementById('chatsList');
      if (!list) return;
      if (this._chats.length === 0) {
        list.innerHTML = `<div class="empty">Sin conversaciones previas</div>`;
        return;
      }
      list.innerHTML = this._chats.map(c => {
        const active = (c.id === this._sessionId) ? ' active' : '';
        return `<div class="chat-item-row${active}" data-id="${this._escape(c.id)}">
                  <button class="chat-item" data-id="${this._escape(c.id)}">
                    <div class="chat-title">${this._escape(c.titulo || 'Conversación')}</div>
                    <div class="chat-preview">${this._escape(c.preview || '')}</div>
                  </button>
                  <button class="chat-delete" data-id="${this._escape(c.id)}" data-title="${this._escape(c.titulo || 'Conversación')}" title="Borrar conversación" aria-label="Borrar conversación">🗑</button>
                </div>`;
      }).join('');

      list.querySelectorAll('.chat-item').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.id;
          this._sessionId = id;
          this._stopPolling(); // cambiar de chat detiene cualquier polling en curso
          this._emit('cathovia-open-chat', { sessionId: id });
          this._highlightActiveChat();
          if (isMobileViewport()) this._closeAllPanels();
        });
      });

      list.querySelectorAll('.chat-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.dataset.id;
          const titulo = btn.dataset.title;
          this._showDeleteConfirm(id, titulo);
        });
      });
    }

    _showDeleteConfirm(sessionId, titulo) {
      // Elimina cualquier modal previo
      const prev = this.shadowRoot.getElementById('deleteModal');
      if (prev) prev.remove();

      const modal = document.createElement('div');
      modal.className = 'modal-backdrop';
      modal.id = 'deleteModal';
      modal.innerHTML = `
        <div class="modal">
          <div class="modal-title">¿Borrar esta conversación?</div>
          <div class="modal-body">
            "${this._escape(titulo)}"
            <div class="modal-note">Esta acción no se puede deshacer.</div>
          </div>
          <div class="modal-actions">
            <button class="modal-btn modal-btn-cancel" id="modalCancel">Cancelar</button>
            <button class="modal-btn modal-btn-danger" id="modalDelete">Borrar</button>
          </div>
        </div>
      `;
      this.shadowRoot.appendChild(modal);

      const cancel = () => modal.remove();
      modal.addEventListener('click', (e) => { if (e.target === modal) cancel(); });
      modal.querySelector('#modalCancel').addEventListener('click', cancel);
      modal.querySelector('#modalDelete').addEventListener('click', () => {
        console.log(`${TAG} borrar chat sessionId=${sessionId}`);
        this._emit('cathovia-delete-chat', { sessionId });
        // Optimista: quitar del listado inmediatamente
        this._chats = this._chats.filter(c => c.id !== sessionId);
        // Si el chat borrado era el actual, resetear a nuevo chat
        if (this._sessionId === sessionId) {
          this._resetToNewChat();
        } else {
          this._renderChats();
        }
        modal.remove();
      });
    }

    _highlightActiveChat() {
      this.shadowRoot.querySelectorAll('.chat-item-row').forEach(el => {
        el.classList.toggle('active', el.dataset.id === this._sessionId);
      });
    }

    _renderCourses() {
      const el = this.shadowRoot.getElementById('coursesList');
      if (!el) return;
      if (this._courses.length === 0) {
        el.innerHTML = `<div class="empty small">Sin cursos disponibles</div>`;
        return;
      }
      el.innerHTML = this._courses.map(c => {
        const price = c.price ? `<div class="card-price">${this._escape(c.price)}</div>` : '';
        return `
          <div class="card course-card" data-id="${this._escape(c.id)}" data-url="${this._escape(c.actionUrl || '')}">
            <div class="card-eyebrow">Curso</div>
            <div class="card-title">${this._escape(c.title || 'Curso')}</div>
            ${c.shortDescription ? `<div class="card-meta">${this._escape(c.shortDescription)}</div>` : ''}
            ${price}
            <button class="card-cta">Ver curso</button>
          </div>
        `;
      }).join('');
      el.querySelectorAll('.course-card').forEach(card => {
        card.querySelector('.card-cta').addEventListener('click', () => {
          const url = card.dataset.url;
          this._emit('cathovia-course-open', { cursoId: card.dataset.id, actionUrl: url });
          if (url) { try { window.open(url, '_blank', 'noopener'); } catch (_) {} }
        });
      });
    }

    _renderEventos() {
      const el = this.shadowRoot.getElementById('eventsList');
      if (!el) return;
      if (this._eventos.length === 0) {
        el.innerHTML = `<div class="empty small">Sin eventos programados</div>`;
        return;
      }
      el.innerHTML = this._eventos.map(e => {
        const fecha = e.date ? this._formatDate(e.date) : '';
        return `
          <div class="card event-card" data-id="${this._escape(e.id)}" data-url="${this._escape(e.actionUrl || '')}">
            <div class="card-eyebrow">Evento</div>
            <div class="card-title">${this._escape(e.title || 'Evento')}</div>
            ${fecha ? `<div class="card-meta">${this._escape(fecha)}</div>` : ''}
            ${e.shortDescription ? `<div class="card-desc">${this._escape(e.shortDescription)}</div>` : ''}
            <button class="card-cta">Reservar</button>
          </div>
        `;
      }).join('');
      el.querySelectorAll('.event-card').forEach(card => {
        card.querySelector('.card-cta').addEventListener('click', () => {
          const url = card.dataset.url;
          this._emit('cathovia-event-open', { eventoId: card.dataset.id, actionUrl: url });
          if (url) { try { window.open(url, '_blank', 'noopener'); } catch (_) {} }
        });
      });
    }

    _formatDate(iso) {
      try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
             + ' · '
             + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      } catch (_) { return ''; }
    }

    _paintExpert(expert) {
      const el = this.shadowRoot.getElementById('expertBox');
      if (!el) return;
      if (!expert) { el.style.display = 'none'; return; }
      el.style.display = '';
      el.innerHTML = `
        <div class="expert-name">${this._escape(expert.nombre || '')}</div>
        ${expert.rol ? `<div class="expert-role">${this._escape(expert.rol)}</div>` : ''}
      `;
    }

    // ═════════════════════════════════════════════════════════════════════
    // TTS — Reproducir audio del backend (Gemini 3.1 Flash TTS)
    // ═════════════════════════════════════════════════════════════════════

    _onTtsButtonClick(messageId, text, btn) {
      if (!btn) btn = this.shadowRoot.querySelector(`.tts-btn[data-mid="${messageId}"]`);
      if (!btn) return;
      const state = btn.dataset.state || 'idle';

      if (state === 'playing' && this._playingMessageId === messageId) {
        this._stopTts();
        return;
      }
      if (this._playingMessageId) this._stopTts();

      this._setTtsBtnState(btn, 'loading');
      this._playingMessageId = messageId;

      const cleanText = this._sanitizeForTts(text);
      if (!cleanText) {
        this._setTtsBtnState(btn, 'idle');
        this._playingMessageId = null;
        return;
      }

      // Llamada directa al backend por HTTP (evita el truncamiento del Page Code)
      this._fetchTts(messageId, cleanText, btn);
    }

    async _fetchTts(messageId, texto, btn) {
      try {
        const res = await fetch('/_functions/egaelTts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texto: texto, cursoId: this._cursoId })
        });
        if (!res.ok) {
          console.warn(`${TAG} egaelTts HTTP ${res.status}`);
          this._applyTtsError({ messageId, error: `HTTP ${res.status}` });
          return;
        }
        const data = await res.json();
        if (!data.ok || !data.audioContent) {
          console.warn(`${TAG} egaelTts respuesta sin audio:`, data.error);
          this._applyTtsError({ messageId, error: data.error || 'sin audio' });
          return;
        }
        console.log(`${TAG} egaelTts OK ${data.timeMs}ms voice=${data.voice} audioLen=${data.audioContent.length}`);
        this._applyTtsAudio({
          messageId,
          audioContent: data.audioContent,
          mimeType: data.mimeType || 'audio/mpeg'
        });
      } catch (err) {
        console.error(`${TAG} egaelTts EXCEPTION:`, err.message || err);
        this._applyTtsError({ messageId, error: err.message || 'error de red' });
      }
    }

    // Método público llamable desde el Page Code (bypass del setAttribute
    // que Wix Velo trunca con payloads grandes).
    receiveTtsAudio(payload) {
      console.log(`${TAG} receiveTtsAudio mid=${payload && payload.messageId} audioLen=${payload && payload.audioContent ? payload.audioContent.length : 0}`);
      this._applyTtsAudio(payload || {});
    }

    receiveTtsError(payload) {
      console.log(`${TAG} receiveTtsError mid=${payload && payload.messageId} error=${payload && payload.error}`);
      this._applyTtsError(payload || {});
    }

    _applyTtsAudio(payload) {
      const { messageId, audioContent, mimeType } = payload || {};
      if (!messageId || !audioContent) return;
      if (messageId !== this._playingMessageId) return; // llegó tarde, ignorar
      this._playAudioBase64(audioContent, mimeType || 'audio/wav', messageId);
    }

    _applyTtsError(payload) {
      const { messageId, error } = payload || {};
      console.warn(`${TAG} TTS error mid=${messageId}: ${error}`);
      if (messageId === this._playingMessageId) {
        const btn = this.shadowRoot.querySelector(`.tts-btn[data-mid="${messageId}"]`);
        if (btn) this._setTtsBtnState(btn, 'idle');
        this._playingMessageId = null;
      }
    }

    _playAudioBase64(base64, mimeType, messageId) {
      // Reutilizar el mismo <audio> para no acumular
      if (!this._audioEl) {
        this._audioEl = new Audio();
      }
      const audio = this._audioEl;
      audio.pause();
      audio.currentTime = 0;

      const dataUri = `data:${mimeType};base64,${base64}`;
      audio.src = dataUri;

      const btn = this.shadowRoot.querySelector(`.tts-btn[data-mid="${messageId}"]`);
      if (btn) this._setTtsBtnState(btn, 'playing');

      audio.onended = () => {
        const b = this.shadowRoot.querySelector(`.tts-btn[data-mid="${messageId}"]`);
        if (b) this._setTtsBtnState(b, 'idle');
        this._playingMessageId = null;
      };
      audio.onerror = () => {
        console.warn(`${TAG} audio playback error`);
        const b = this.shadowRoot.querySelector(`.tts-btn[data-mid="${messageId}"]`);
        if (b) this._setTtsBtnState(b, 'idle');
        this._playingMessageId = null;
      };

      audio.play().catch(err => {
        console.warn(`${TAG} audio.play() rechazado:`, err.message);
        const b = this.shadowRoot.querySelector(`.tts-btn[data-mid="${messageId}"]`);
        if (b) this._setTtsBtnState(b, 'idle');
        this._playingMessageId = null;
      });
    }

    _stopTts() {
      if (this._audioEl) {
        try { this._audioEl.pause(); this._audioEl.currentTime = 0; } catch (_) {}
      }
      if (this._playingMessageId) {
        const btn = this.shadowRoot.querySelector(`.tts-btn[data-mid="${this._playingMessageId}"]`);
        if (btn) this._setTtsBtnState(btn, 'idle');
      }
      this._playingMessageId = null;
    }

    _setTtsBtnState(btn, state) {
      if (!btn) return;
      btn.dataset.state = state;
      const icon = btn.querySelector('.tts-icon');
      const label = btn.querySelector('.tts-label');
      if (state === 'idle')    { if (icon) icon.textContent = '🔊'; if (label) label.textContent = 'Escuchar'; }
      if (state === 'loading') { if (icon) icon.textContent = '⏳'; if (label) label.textContent = 'Preparando'; }
      if (state === 'playing') { if (icon) icon.textContent = '⏸'; if (label) label.textContent = 'Parar'; }
    }

    _sanitizeForTts(text) {
      let t = String(text || '');
      // Quitar marcadores de card
      t = t.replace(/\[\[CARD:[a-zA-Z0-9_\-]+\]\]/g, '');
      // Markdown básico
      t = t.replace(/\*\*(.+?)\*\*/g, '$1');
      t = t.replace(/^#{1,6}\s+/gm, '');
      t = t.replace(/^-{3,}$/gm, '');
      t = t.replace(/\*(.+?)\*/g, '$1');
      t = t.replace(/\n{3,}/g, '\n\n').trim();
      return t;
    }

    _toggleTtsAutoPlay() {
      this._ttsAutoPlay = !this._ttsAutoPlay;
      this._writeLS(LS_TTS_AUTO, this._ttsAutoPlay);
      this._updateTtsToggleUI();
    }

    _updateTtsToggleUI() {
      const btn = this.shadowRoot.getElementById('btnToggleTts');
      if (!btn) return;
      btn.textContent = this._ttsAutoPlay ? '🔊' : '🔇';
      btn.title = this._ttsAutoPlay ? 'Voz automática activada' : 'Voz automática desactivada';
    }

    // ═════════════════════════════════════════════════════════════════════
    // MICRÓFONO (portado de EGAEL +50 v1.0)
    // ═════════════════════════════════════════════════════════════════════

    _setupMic() {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) {
        const b = this.shadowRoot.getElementById('micBtn');
        if (b) b.style.display = 'none';
        console.log(`${TAG} SpeechRecognition no disponible en este navegador`);
        return;
      }
      this._SR = SR;
      console.log(`${TAG} Micrófono disponible (SpeechRecognition)`);
    }

    _clearSilenceTimer() { if (this._silenceTimer) { clearTimeout(this._silenceTimer); this._silenceTimer = null; } }
    _clearSafetyTimer()  { if (this._safetyTimer)  { clearTimeout(this._safetyTimer);  this._safetyTimer  = null; } }
    _armSilenceTimer() {
      this._clearSilenceTimer();
      this._silenceTimer = setTimeout(() => { this._micStoppingForSend = true; this._stopMic(); }, SILENCE_MS);
    }
    _armSafetyTimer() {
      this._clearSafetyTimer();
      this._safetyTimer = setTimeout(() => { this._micStoppingForSend = true; this._stopMic(); }, SAFETY_MS);
    }

    _toggleMic() {
      if (this._isListening) this._stopMic();
      else this._startMic();
    }

    _stopMic() {
      this._clearSilenceTimer();
      this._clearSafetyTimer();
      if (this._recognition) { try { this._recognition.stop(); } catch (_) {} }
    }

    _setMicState(state) {
      const btn = this.shadowRoot.getElementById('micBtn');
      if (!btn) return;
      btn.classList.remove('listening', 'idle', 'preparing');
      btn.classList.add(state);
    }

    _startMic() {
      if (!this._SR || this._pending) return;
      this._stopTts(); // no queremos que el TTS interfiera con el mic
      const input = this.shadowRoot.getElementById('chatInput');
      input.value = '';
      if (IS_ANDROID) {
        this._androidFinalBuffer = '';
        this._startAndroidSession(input);
      } else {
        this._startStandardSession(input);
      }
    }

    _startAndroidSession(input) {
      try { this._recognition = new this._SR(); }
      catch (e) { console.warn(`${TAG} SR init error:`, e.message); return; }
      this._recognition.lang = 'es-ES';
      this._recognition.interimResults = false;
      this._recognition.continuous = false;
      this._recognition.maxAlternatives = 1;

      this._recognition.onstart = () => {
        this._isListening = true;
        this._setMicState('preparing');
        input.placeholder = 'Preparando micrófono…';
        this._armSafetyTimer();
      };
      this._recognition.onaudiostart = () => {
        this._setMicState('listening');
        input.placeholder = this._androidFinalBuffer ? 'Sigue hablando…' : 'Te escucho — habla con normalidad';
        if (navigator.vibrate) { try { navigator.vibrate(50); } catch (_) {} }
      };
      this._recognition.onresult = (event) => {
        this._clearSafetyTimer();
        const result = event.results[0];
        if (result && result.isFinal) {
          const transcript = result[0].transcript.trim();
          if (transcript) {
            this._androidFinalBuffer += (this._androidFinalBuffer ? ' ' : '') + transcript;
            input.value = this._androidFinalBuffer;
            this._armSilenceTimer();
          }
        }
      };
      this._recognition.onerror = (event) => {
        this._clearSilenceTimer(); this._clearSafetyTimer();
        this._isListening = false; this._setMicState('idle');
        input.placeholder = this._brand.placeholder;
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          this._appendError('Permiso de micrófono denegado. Actívalo en los ajustes del navegador.');
        } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.warn(`${TAG} Mic error: ${event.error}`);
        }
      };
      this._recognition.onend = () => {
        this._clearSafetyTimer();
        this._isListening = false; this._setMicState('idle');
        this._micStoppingForSend = false;
        const text = this._androidFinalBuffer.trim();
        this._androidFinalBuffer = '';
        if (!text) { input.placeholder = this._brand.placeholder; return; }
        input.value = text;
        this._sendQuery(text);
        input.value = '';
      };
      try { this._recognition.start(); }
      catch (e) { this._setMicState('idle'); input.placeholder = this._brand.placeholder; }
    }

    _startStandardSession(input) {
      try { this._recognition = new this._SR(); }
      catch (e) { console.warn(`${TAG} SR init error:`, e.message); return; }
      this._recognition.lang = 'es-ES';
      this._recognition.interimResults = true;
      this._recognition.continuous = true;
      this._recognition.maxAlternatives = 1;
      this._lastFinalTranscript = '';

      this._recognition.onstart = () => {
        this._isListening = true; this._setMicState('preparing');
        input.placeholder = 'Preparando micrófono…'; this._armSafetyTimer();
      };
      this._recognition.onaudiostart = () => {
        this._setMicState('listening');
        input.placeholder = 'Te escucho — habla con normalidad';
        if (navigator.vibrate) { try { navigator.vibrate(50); } catch (_) {} }
      };
      this._recognition.onresult = (event) => {
        this._clearSafetyTimer();
        let finalText = '', interimText = '';
        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalText += transcript;
          else interimText += transcript;
        }
        input.value = (finalText + interimText).trim();
        const hadNewFinal = finalText !== this._lastFinalTranscript;
        if (hadNewFinal && finalText) { this._lastFinalTranscript = finalText; this._armSilenceTimer(); }
        else if (!hadNewFinal && interimText) { this._clearSilenceTimer(); }
      };
      this._recognition.onerror = (event) => {
        this._clearSilenceTimer(); this._clearSafetyTimer();
        this._isListening = false; this._setMicState('idle');
        input.placeholder = this._brand.placeholder;
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          this._appendError('Permiso de micrófono denegado. Actívalo en los ajustes del navegador.');
        } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.warn(`${TAG} Mic error: ${event.error}`);
        }
      };
      this._recognition.onend = () => {
        this._clearSafetyTimer();
        this._isListening = false; this._setMicState('idle');
        const text = (input.value || '').trim();
        if (!text) { input.placeholder = this._brand.placeholder; return; }
        this._sendQuery(text);
        input.value = '';
      };
      try { this._recognition.start(); }
      catch (e) { this._setMicState('idle'); input.placeholder = this._brand.placeholder; }
    }

    _emit(name, detail) {
      this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
    }
    _escape(s) {
      return String(s == null ? '' : s)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    }
    _readLS(key, fallback) {
      try { const v = localStorage.getItem(key); if (v === null) return fallback; return v === '1'; }
      catch (_) { return fallback; }
    }
    _writeLS(key, val) { try { localStorage.setItem(key, val ? '1' : '0'); } catch (_) { } }

    _render() {
      const c = this._colors;
      const b = this._brand;
      const sidebarClass = this._sidebarOpen ? ' sidebar-open' : '';
      const panelClass   = this._panelOpen   ? ' panel-open'   : '';

      this.shadowRoot.innerHTML = `
<style>
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Manrope:wght@400;500;600;700&display=swap');

  :host {
    display: block;
    width: 100%;
    /* v1.6.4: NO heredar altura del contenedor de Wix.
       Wix declara #egaelConsole a 753px en el editor pero el runtime infla el
       wrapper (#comp-mrcg3n71) a ~1796px midiendo el contenido inicial. Medido
       en produccion: custom element rect=1796px, section padre=1820px.
       Con height:100% la consola obedecia esos 1796px y el input quedaba fuera
       de pantalla. Anclamos a la ventana: dvh respeta las barras del navegador
       en movil. El bloque @media movil ya hacia esto y por eso alli funcionaba. */
    height: 100vh;
    height: 100dvh;
    max-height: 100vh;
    max-height: 100dvh;
    min-height: 0;
    font-family: ${b.fontBody};
    color: ${c.ink};
    background: ${c.bg};
    --bg: ${c.bg};
    --surface: ${c.surface};
    --card: ${c.card};
    --ink: ${c.ink};
    --ink-soft: ${c.inkSoft};
    --muted: ${c.muted};
    --hairline: ${c.hairline};
    --accent: ${c.accent};
    --accent-ink: ${c.accentInk};
    --font-title: ${b.fontTitle};
    --font-body: ${b.fontBody};
  }
  * { box-sizing: border-box; }
  ::selection { background: var(--accent); color: var(--accent-ink); }

  .app {
    display: flex;
    flex-direction: column;
    height: 100%;
    max-height: 100%;
    min-height: 0;
    background: var(--bg);
    overflow: hidden;
  }

  .layout {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: 0 1fr 0;
    grid-template-rows: auto 1fr;
    grid-template-areas: "topbar topbar topbar" "sidebar main panel";
    background: var(--bg);
    transition: grid-template-columns .22s ease;
    position: relative;
  }
  .layout.sidebar-open { grid-template-columns: 280px 1fr 0; }
  .layout.panel-open   { grid-template-columns: 0 1fr 320px; }
  .layout.sidebar-open.panel-open { grid-template-columns: 280px 1fr 320px; }

  /* TOPBAR */
  .topbar {
    grid-area: topbar;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 18px;
    background: var(--surface);
    border-bottom: 1px solid var(--hairline);
    min-height: 56px;
  }
  .tb-btn {
    display: inline-flex; align-items: center; justify-content: center;
    width: 36px; height: 36px;
    border-radius: 8px;
    border: 1px solid var(--hairline);
    background: var(--surface);
    color: var(--ink);
    cursor: pointer;
    font-size: 16px;
    flex-shrink: 0;
    transition: background .15s, border-color .15s;
  }
  .tb-btn:hover { background: var(--bg); border-color: var(--ink-soft); }
  .tb-beta {
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }
  .tb-beta > span {
    font-family: var(--font-body);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 1.8px;
    text-transform: uppercase;
    color: var(--muted);
    background: var(--bg);
    border: 1px solid var(--hairline);
    padding: 4px 10px 3px;
    border-radius: 999px;
    line-height: 1;
    white-space: nowrap;
  }
  .tb-brand {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    line-height: 1.1;
    min-width: 0;
    text-align: center;
  }
  /* Logo: CSS deliberadamente minimo. Cualquier background/border/filter
     aqui reintroduce el marco blanco que se quiere evitar. */
  .tb-logo {
    height: 30px;
    width: auto;
    display: block;
    background: none;
    border: 0;
    box-shadow: none;
    filter: none;
    max-width: 100%;
    object-fit: contain;
  }
  .tb-title {
    font-family: var(--font-title);
    font-size: 22px;
    font-weight: 400;
    letter-spacing: .3px;
    color: var(--ink);
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .tb-sub {
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: var(--muted);
    margin-top: 2px;
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ERROR BANNER */
  .error-banner {
    display: none;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
    background: #7a1a1a;
    color: #ffe8e8;
    font-size: 13px;
    border-bottom: 1px solid #5a1010;
  }
  .error-banner .eb-icon {
    font-weight: bold;
    background: rgba(255,255,255,.15);
    width: 20px; height: 20px;
    border-radius: 50%;
    display: inline-flex; align-items: center; justify-content: center;
    font-size: 12px;
  }
  .error-banner .eb-text { flex: 1; }
  .error-banner .eb-close {
    background: transparent; border: 1px solid rgba(255,255,255,.3);
    color: #ffe8e8; width: 24px; height: 24px; border-radius: 4px;
    cursor: pointer;
  }

  /* SIDEBAR */
  .sidebar {
    grid-area: sidebar;
    background: var(--bg);
    border-right: 1px solid var(--hairline);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
  }
  .sb-head {
    padding: 16px 16px 12px;
    border-bottom: 1px solid var(--hairline);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .sb-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--muted);
  }
  .sb-head-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .sb-new {
    background: var(--accent);
    color: var(--accent-ink);
    border: none;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    font-family: var(--font-body);
  }
  .sb-new:hover { filter: brightness(1.12); }

  /* Botón X de cerrar overlay móvil — oculto en desktop */
  .mobile-close {
    display: none;
    background: transparent;
    border: 1px solid var(--hairline);
    color: var(--muted);
    width: 32px; height: 32px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    align-items: center;
    justify-content: center;
    line-height: 1;
    padding: 0;
    flex-shrink: 0;
  }
  .mobile-close:hover { background: var(--surface); color: var(--ink); border-color: var(--ink-soft); }
  .panel-close-row {
    display: none;
    justify-content: flex-end;
    padding: 12px 14px 0 14px;
  }
  .chats-list { flex: 1; overflow-y: auto; padding: 8px; }
  .chat-item-row {
    display: flex;
    align-items: stretch;
    gap: 2px;
    border-radius: 8px;
    margin-bottom: 2px;
    transition: background .12s;
  }
  .chat-item-row:hover { background: var(--surface); }
  .chat-item-row.active {
    background: var(--surface);
    border-left: 2px solid var(--accent);
  }
  .chat-item {
    flex: 1;
    min-width: 0;
    text-align: left;
    background: transparent;
    border: none;
    padding: 10px 8px 10px 12px;
    cursor: pointer;
    font-family: var(--font-body);
    color: var(--ink);
    border-radius: 8px 0 0 8px;
  }
  .chat-item-row.active .chat-item { padding-left: 10px; }
  .chat-delete {
    background: transparent;
    border: none;
    color: var(--muted);
    cursor: pointer;
    padding: 0 10px;
    font-size: 14px;
    opacity: 0;
    transition: opacity .12s, color .12s;
    border-radius: 0 8px 8px 0;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }
  .chat-item-row:hover .chat-delete { opacity: 0.7; }
  .chat-delete:hover { opacity: 1 !important; color: #a03030; background: rgba(160,48,48,.08); }
  .chat-title {
    font-size: 13px; font-weight: 500;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .chat-preview {
    font-size: 11px; color: var(--muted);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    margin-top: 2px;
  }

  /* MODAL confirmación */
  .modal-backdrop {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(31, 36, 48, .5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    animation: fadeIn .18s ease;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .modal {
    background: var(--card);
    border-radius: 14px;
    padding: 24px 22px 18px;
    max-width: 380px;
    width: calc(100% - 40px);
    box-shadow: 0 10px 40px rgba(0,0,0,.25);
    font-family: var(--font-body);
    animation: modalRise .22s ease;
  }
  @keyframes modalRise {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .modal-title {
    font-family: var(--font-title);
    font-size: 20px;
    color: var(--ink);
    margin-bottom: 8px;
    font-weight: 400;
  }
  .modal-body {
    font-size: 14px;
    color: var(--ink-soft);
    line-height: 1.5;
    margin-bottom: 20px;
  }
  .modal-note {
    font-size: 12px;
    color: var(--muted);
    margin-top: 8px;
    font-style: italic;
  }
  .modal-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }
  .modal-btn {
    padding: 9px 18px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: var(--font-body);
    border: 1px solid var(--hairline);
    background: transparent;
    color: var(--ink);
    transition: background .15s;
  }
  .modal-btn-cancel:hover { background: var(--surface); }
  .modal-btn-danger {
    background: #a03030;
    color: white;
    border-color: #a03030;
  }
  .modal-btn-danger:hover { background: #8a2525; }
  .empty { padding: 24px 12px; text-align: center; color: var(--muted); font-size: 13px; font-style: italic; }
  .empty.small { padding: 12px 8px; font-size: 12px; }

  /* MAIN CHAT */
  .main {
    grid-area: main;
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    background: var(--surface);
    box-shadow: inset 0 4px 12px -8px rgba(0,0,0,.06);
  }
  .messages {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 40px max(28px, calc((100% - 780px) / 2)) 24px;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    gap: 28px;
    scroll-behavior: smooth;
  }
  .messages::-webkit-scrollbar { width: 8px; }
  .messages::-webkit-scrollbar-thumb { background: var(--hairline); border-radius: 4px; }
  .messages::-webkit-scrollbar-track { background: transparent; }

  .welcome {
    margin: 0;
    padding: 48px 20px 20px;
    text-align: center;
    flex-shrink: 0;
  }
  .welcome-inner { max-width: 540px; margin: 0 auto; }
  .welcome-ornament {
    font-family: var(--font-title);
    color: var(--muted);
    font-size: 18px;
    letter-spacing: 6px;
    margin-bottom: 22px;
  }
  .welcome-title {
    font-family: var(--font-title);
    font-size: 46px;
    line-height: 1.1;
    color: var(--ink);
    margin-bottom: 14px;
    font-weight: 400;
    letter-spacing: -.3px;
  }
  .welcome-logo {
    display: block;
    height: 64px;
    width: auto;
    margin: 0 auto 24px;
    max-width: 90%;
  }
  .welcome-sub {
    font-family: var(--font-title);
    font-style: italic;
    color: var(--ink-soft);
    font-size: 19px;
    line-height: 1.55;
  }
  .welcome-beta {
    display: none;
    color: var(--muted);
    font-size: 0.75em;
    font-style: italic;
    letter-spacing: .3px;
  }

  .turn { display: flex; animation: fadeUp .35s ease both; }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .turn-user { justify-content: flex-end; }
  .turn-user .bubble {
    max-width: 78%;
    background: var(--accent);
    color: var(--accent-ink);
    padding: 12px 16px;
    border-radius: 16px 16px 4px 16px;
    font-family: var(--font-body);
    font-size: 15px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-wrap: break-word;
    box-shadow: 0 1px 2px rgba(0,0,0,.08);
  }

  .turn-ai { justify-content: flex-start; flex-direction: column; }
  .turn-ai .editorial {
    max-width: 100%;
    font-family: var(--font-title);
    font-size: 19px;
    line-height: 1.7;
    color: var(--ink);
    letter-spacing: .1px;
    padding-left: 4px;
  }
  .turn-ai .editorial p { margin: 0 0 14px 0; }
  .turn-ai .editorial p:last-child { margin-bottom: 0; }
  .turn-ai .editorial p:first-child::first-letter {
    font-size: 1.1em;
    font-weight: 500;
  }

  /* ═══ INLINE CARDS ═══ */
  .turn-inline {
    display: flex;
    justify-content: flex-start;
    margin: 6px 0 6px 0;
    animation: fadeUp .35s ease both;
  }
  .inline-card {
    max-width: 92%;
    background: var(--card);
    border: 1px solid var(--hairline);
    border-radius: 14px;
    padding: 16px 18px;
    box-shadow: 0 2px 10px rgba(31,36,48,.05);
    font-family: var(--font-body);
  }
  .inline-eyebrow {
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--accent);
    margin-bottom: 6px;
    font-weight: 600;
  }
  .inline-title {
    font-family: var(--font-title);
    font-size: 21px;
    line-height: 1.25;
    color: var(--ink);
    margin-bottom: 6px;
    font-weight: 400;
  }
  .inline-desc {
    font-size: 13.5px;
    line-height: 1.55;
    color: var(--ink-soft);
    margin-bottom: 12px;
  }
  .inline-audio {
    width: 100%;
    margin: 4px 0 10px 0;
    display: block;
    border-radius: 8px;
    outline: none;
  }
  .inline-card-cta {
    background: var(--accent);
    color: var(--accent-ink);
    border: none;
    padding: 9px 16px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: var(--font-body);
    letter-spacing: .2px;
    transition: filter .15s, transform .1s;
  }
  .inline-card-cta:hover { filter: brightness(1.12); }
  .inline-card-cta:active { transform: scale(.97); }

  .turn-error { justify-content: center; }
  .turn-error .err-box {
    display: flex; align-items: center; gap: 10px;
    background: #fdecec; color: #7a1a1a;
    padding: 10px 14px; border-radius: 10px;
    font-size: 13px; max-width: 90%;
    border: 1px solid #f5c8c8;
  }
  /* Variante con botón Reintentar (v1.6.0) */
  .turn-error .err-box-retry {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    padding: 12px 14px;
    max-width: 92%;
  }
  .turn-error .err-box-retry .err-body {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .turn-error .err-box-retry .err-text {
    flex: 1;
    line-height: 1.4;
  }
  .turn-error .err-retry-btn {
    align-self: flex-end;
    background: #7a1a1a;
    color: #ffe8e8;
    border: none;
    padding: 7px 14px;
    border-radius: 6px;
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    font-family: var(--font-body);
    letter-spacing: .2px;
    transition: background .15s, transform .1s;
  }
  .turn-error .err-retry-btn:hover { background: #5a1010; }
  .turn-error .err-retry-btn:active { transform: scale(.97); }
  .turn-error .err-icon {
    display: inline-flex; align-items: center; justify-content: center;
    width: 20px; height: 20px;
    background: #7a1a1a; color: white;
    border-radius: 50%; font-weight: bold; font-size: 12px;
    flex-shrink: 0;
  }

  .turn-thinking .thinking {
    display: flex; align-items: center; gap: 12px;
    padding-left: 4px;
    color: var(--muted);
    font-family: var(--font-title);
    font-style: italic;
    font-size: 16px;
  }
  .thinking-dots { display: inline-flex; gap: 5px; }
  .thinking-dots span {
    width: 7px; height: 7px;
    background: var(--muted); border-radius: 50%;
    animation: pulse 1.3s infinite ease-in-out;
  }
  .thinking-dots span:nth-child(2) { animation-delay: .2s; }
  .thinking-dots span:nth-child(3) { animation-delay: .4s; }
  @keyframes pulse {
    0%, 80%, 100% { opacity: .25; transform: scale(.85); }
    40% { opacity: 1; transform: scale(1); }
  }

  /* INPUT AREA */
  .input-area {
    padding: 14px max(28px, calc((100% - 780px) / 2)) 22px;
    background: var(--surface);
    border-top: 1px solid var(--hairline);
  }
  .input-disclaimer {
    font-family: var(--font-body);
    font-size: 11px;
    color: var(--muted);
    text-align: center;
    margin-top: 10px;
    line-height: 1.4;
    letter-spacing: .1px;
  }
  .input-box {
    background: #FFFFFF;
    border: 1px solid var(--hairline);
    border-radius: 16px;
    padding: 10px 10px 10px 18px;
    display: flex;
    align-items: flex-end;
    gap: 10px;
    transition: border-color .15s, box-shadow .15s;
    box-shadow: 0 2px 8px rgba(31, 36, 48, .04);
  }
  .input-box:focus-within {
    border-color: var(--ink-soft);
    box-shadow: 0 4px 16px rgba(31, 36, 48, .08);
  }
  .input-ta {
    flex: 1;
    border: none; outline: none; resize: none;
    background: transparent;
    color: var(--ink);
    font-family: var(--font-body);
    font-size: 15px;
    line-height: 1.55;
    padding: 9px 4px;
    max-height: 180px;
    min-height: 24px;
    overflow-y: auto;
  }
  .input-ta::placeholder {
    color: var(--muted);
    font-style: italic;
    font-family: var(--font-title);
    font-size: 16px;
  }
  .send-btn {
    background: var(--accent);
    color: var(--accent-ink);
    border: none;
    width: 40px; height: 40px;
    border-radius: 12px;
    cursor: pointer;
    font-size: 17px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    transition: transform .1s, filter .15s;
  }
  .send-btn:hover { filter: brightness(1.12); }
  .send-btn:active { transform: scale(.95); }

  /* ═══ BOTÓN MICRÓFONO ═══ */
  .mic-btn {
    background: transparent;
    color: var(--muted);
    border: 1px solid var(--hairline);
    width: 40px; height: 40px;
    border-radius: 12px;
    cursor: pointer;
    font-size: 17px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    transition: background .15s, color .15s, border-color .15s, transform .1s;
  }
  .mic-btn:hover { background: var(--bg); color: var(--ink); border-color: var(--ink-soft); }
  .mic-btn.preparing {
    background: #fef3c7;
    color: #92400e;
    border-color: #fbbf24;
    animation: micPulse 1s ease-in-out infinite;
  }
  .mic-btn.listening {
    background: #dc2626;
    color: white;
    border-color: #dc2626;
    animation: micPulse .8s ease-in-out infinite;
  }
  @keyframes micPulse {
    0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(220, 38, 38, .4); }
    50% { transform: scale(1.05); box-shadow: 0 0 0 6px rgba(220, 38, 38, 0); }
  }

  /* ═══ BOTÓN ESCUCHAR (TTS) ═══ */
  .tts-row {
    display: flex;
    justify-content: flex-start;
    margin-top: 8px;
    padding-left: 4px;
  }
  .tts-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: transparent;
    color: var(--muted);
    border: 1px solid var(--hairline);
    padding: 5px 12px;
    border-radius: 20px;
    cursor: pointer;
    font-size: 12px;
    font-family: var(--font-body);
    transition: background .15s, color .15s, border-color .15s;
  }
  .tts-btn:hover {
    background: var(--surface);
    color: var(--ink);
    border-color: var(--ink-soft);
  }
  .tts-btn[data-state="loading"] {
    color: var(--ink-soft);
    cursor: default;
  }
  .tts-btn[data-state="playing"] {
    background: var(--accent);
    color: var(--accent-ink);
    border-color: var(--accent);
  }
  .tts-btn[data-state="playing"]:hover {
    filter: brightness(1.12);
  }
  .tts-icon { font-size: 13px; }
  .tts-label { font-weight: 500; letter-spacing: .1px; }

  /* PANEL DERECHA */
  .panel {
    grid-area: panel;
    background: var(--bg);
    border-left: 1px solid var(--hairline);
    overflow-y: auto;
    min-width: 0;
  }
  .panel-section {
    padding: 18px 16px;
    border-bottom: 1px solid var(--hairline);
  }
  .panel-section:last-child { border-bottom: none; }
  .panel-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
  .panel-title {
    font-family: var(--font-title);
    font-size: 17px;
    font-weight: 400;
    letter-spacing: .3px;
  }
  .panel-refresh {
    background: transparent; border: none;
    color: var(--muted);
    cursor: pointer;
    font-size: 14px;
    padding: 4px 6px;
    border-radius: 4px;
  }
  .panel-refresh:hover { background: var(--surface); color: var(--ink); }
  #expertBox {
    padding: 18px 16px;
    border-bottom: 1px solid var(--hairline);
  }
  .expert-name {
    font-family: var(--font-title);
    font-size: 17px;
    font-weight: 400;
    margin-bottom: 2px;
  }
  .expert-role { font-size: 12px; color: var(--muted); }
  .card {
    background: var(--card);
    border: 1px solid var(--hairline);
    border-radius: 10px;
    padding: 12px 13px;
    margin-bottom: 10px;
  }
  .card:last-child { margin-bottom: 0; }
  .card-eyebrow {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    color: var(--muted);
    margin-bottom: 4px;
  }
  .card-title {
    font-family: var(--font-title);
    font-size: 15px;
    font-weight: 400;
    margin-bottom: 4px;
    color: var(--ink);
    line-height: 1.3;
  }
  .card-meta { font-size: 12px; color: var(--muted); margin-bottom: 6px; line-height: 1.4; }
  .card-desc { font-size: 12px; color: var(--ink-soft); margin-bottom: 8px; line-height: 1.45; }
  .card-price { font-size: 13px; color: var(--ink); margin-bottom: 8px; font-weight: 500; }
  .card-cta {
    background: transparent;
    color: var(--accent);
    border: 1px solid var(--accent);
    padding: 6px 14px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    font-family: var(--font-body);
  }
  .card-cta:hover { background: var(--accent); color: var(--accent-ink); }

  .backdrop {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(31, 36, 48, .35);
    z-index: 9;
    opacity: 0;
    pointer-events: none;
    transition: opacity .22s ease;
  }

  /* MÓVIL */
  @media (max-width: 900px) {
    .app {
      height: 100vh;
      height: 100dvh;
      max-height: 100vh;
      max-height: 100dvh;
    }
    .layout {
      grid-template-columns: 1fr !important;
      grid-template-areas: "topbar" "main" !important;
      grid-template-rows: auto 1fr;
      min-height: 0;
      overflow: hidden;
    }
    .topbar {
      position: sticky;
      top: 0;
      z-index: 20;
      padding: 8px 12px;
      min-height: 52px;
      gap: 8px;
    }
    .tb-logo { height: 26px; }
    .main { min-height: 0; overflow: hidden; }
    .messages { -webkit-overflow-scrolling: touch; }
    .tb-btn { width: 34px; height: 34px; font-size: 15px; }
    .tb-title { font-size: 19px; }
    .tb-sub { font-size: 9.5px; letter-spacing: 1.5px; margin-top: 1px; }
    .tb-beta > span { font-size: 9px; letter-spacing: 1.4px; padding: 3px 8px 2px; }

    .sidebar, .panel {
      position: fixed;
      top: 52px;
      bottom: 0;
      z-index: 10;
      width: 88%;
      max-width: 320px;
      transform: translateX(-100%);
      transition: transform .25s ease;
      box-shadow: 0 0 40px rgba(0,0,0,.18);
    }
    .sidebar { left: 0; border-right: 1px solid var(--hairline); }
    .panel   {
      right: 0;
      transform: translateX(100%);
      border-left: 1px solid var(--hairline);
      border-right: none;
    }
    .layout.sidebar-open .sidebar { transform: translateX(0); }
    .layout.panel-open   .panel   { transform: translateX(0); }

    .layout.sidebar-open .backdrop,
    .layout.panel-open   .backdrop {
      opacity: 1;
      pointer-events: auto;
    }

    .mobile-close { display: inline-flex; }
    .panel-close-row { display: flex; }

    /* Papelera siempre visible en móvil (no hay hover) */
    .chat-delete { opacity: 0.6; padding: 0 14px; font-size: 15px; }
    .chat-item-row .chat-delete { opacity: 0.6; }

    /* Modal responsive */
    .modal { padding: 22px 20px 16px; max-width: 340px; }
    .modal-title { font-size: 19px; }

    .main { grid-area: main; box-shadow: none; }
    .messages { padding: 24px 18px; gap: 22px; }
    .input-area { padding: 12px 14px 16px; }
    .input-disclaimer { font-size: 10.5px; margin-top: 8px; }
    .input-box { padding: 8px 8px 8px 14px; border-radius: 14px; }
    .send-btn { width: 38px; height: 38px; }
    .mic-btn { width: 38px; height: 38px; font-size: 16px; }
    .input-ta { font-size: 16px; padding: 8px 4px; }
    .input-ta::placeholder { font-size: 15px; }

    .tts-btn { font-size: 11.5px; padding: 4px 10px; }

    .turn-user .bubble { max-width: 85%; font-size: 15px; padding: 11px 14px; }
    .turn-ai .editorial { font-size: 17px; line-height: 1.65; }

    .inline-card { max-width: 100%; padding: 14px 15px; border-radius: 12px; }
    .inline-title { font-size: 19px; }
    .inline-desc { font-size: 13px; }
    .inline-audio { margin: 4px 0 12px 0; }

    /* Error box en móvil: retry-btn a ancho completo */
    .turn-error .err-box-retry { max-width: 96%; padding: 11px 12px; }
    .turn-error .err-retry-btn { align-self: stretch; padding: 9px 14px; font-size: 13px; }

    .welcome { padding: 40px 16px; }
    .welcome-ornament { font-size: 15px; letter-spacing: 5px; margin-bottom: 16px; }
    .welcome-title { font-size: 34px; margin-bottom: 10px; }
    .welcome-logo { height: 48px; margin: 0 auto 18px; }
    .welcome-sub { font-size: 17px; line-height: 1.5; }
  }

  @media (max-width: 420px) {
    .topbar { padding: 8px 10px; gap: 6px; }
    .tb-logo { height: 22px; }
    .tb-title { font-size: 17px; }
    .tb-sub { font-size: 9px; }
    .messages { padding: 20px 14px; gap: 18px; }
    .input-area { padding: 10px 12px 14px; }
    .input-disclaimer { font-size: 10px; margin-top: 7px; }
    .tb-beta { display: none; }
    .welcome-beta { display: inline; }
    .welcome { padding: 32px 12px; }
    .welcome-title { font-size: 28px; margin-bottom: 8px; }
    .welcome-logo { height: 40px; margin: 0 auto 14px; }
    .welcome-sub { font-size: 15.5px; }
    .turn-ai .editorial { font-size: 16px; }
    .turn-user .bubble { font-size: 14.5px; }
    .inline-title { font-size: 18px; }
    .sidebar, .panel { width: 92%; }
  }
</style>

<div class="app">

  <div class="error-banner" id="errorBanner">
    <span class="eb-icon">!</span>
    <span class="eb-text" id="errorBannerText"></span>
    <button class="eb-close" id="closeErrorBanner">✕</button>
  </div>

  <div class="layout${sidebarClass}${panelClass}" id="layout">

    <div class="topbar">
      <button class="tb-btn" id="btnToggleSidebar" title="Historial">☰</button>
      ${b.betaLabel ? `<div class="tb-beta" title="${this._escape(b.betaLabel)}"><span>${this._escape(b.betaLabel)}</span></div>` : ''}
      <div class="tb-brand">
        ${b.logo
          ? `<img class="tb-logo" src="${b.logo}" alt="${this._escape(b.name)}" />`
          : `<div class="tb-title">${this._escape(b.name)}</div>`}
        ${b.sub ? `<div class="tb-sub">${this._escape(b.sub)}</div>` : ''}
      </div>
      <button class="tb-btn" id="btnToggleTts" title="Voz automática">🔇</button>
      <button class="tb-btn" id="btnTogglePanel" title="Cursos y agenda">◧</button>
    </div>

    <aside class="sidebar">
      <div class="sb-head">
        <div class="sb-label">Historial</div>
        <div class="sb-head-actions">
          <button class="sb-new" id="btnNewChat">+ Nuevo</button>
          <button class="mobile-close" id="btnCloseSidebar" title="Cerrar" aria-label="Cerrar">✕</button>
        </div>
      </div>
      <div class="chats-list" id="chatsList">
        <div class="empty">Sin conversaciones previas</div>
      </div>
    </aside>

    <main class="main">
      <div class="messages" id="messages"></div>
      <div class="input-area">
        <div class="input-box">
          <textarea class="input-ta" id="chatInput" rows="1" placeholder="${this._escape(b.placeholder)}"></textarea>
          <button class="mic-btn idle" id="micBtn" title="Hablar" aria-label="Hablar">🎤</button>
          <button class="send-btn" id="sendBtn" title="Enviar">↑</button>
        </div>
        ${b.disclaimer ? `<div class="input-disclaimer">${this._escape(b.disclaimer)}</div>` : ''}
      </div>
    </main>

    <aside class="panel">
      <div id="expertBox" style="display:none"></div>
      <div class="panel-close-row">
        <button class="mobile-close" id="btnClosePanel" title="Cerrar" aria-label="Cerrar">✕</button>
      </div>
      <div class="panel-section">
        <div class="panel-head">
          <div class="panel-title">Cursos</div>
          <button class="panel-refresh" id="btnRefreshCourses" title="Actualizar">↻</button>
        </div>
        <div id="coursesList">
          <div class="empty small">Sin cursos disponibles</div>
        </div>
      </div>
      <div class="panel-section">
        <div class="panel-head">
          <div class="panel-title">Agenda</div>
          <button class="panel-refresh" id="btnRefreshEvents" title="Actualizar">↻</button>
        </div>
        <div id="eventsList">
          <div class="empty small">Sin eventos programados</div>
        </div>
      </div>
    </aside>

    <div class="backdrop" id="backdrop"></div>

  </div>

</div>
      `;
    }
  }

  customElements.define('cathovia-console', CathoviaConsole);
  console.log(`${TAG} Registrado.`);

})();
/* ═══════════════════════════════════════════════════════════════════════════
 * SABIO VALLEY — CATHOVIA Console (Wix Custom Element)
 * Archivo:  cathoviaConsole.js
 * Tag name: cathovia-console
 * VERSION:  1.6.8
 * FECHA:    18 Julio 2026
 *
 * CAMBIOS v1.6.7 → v1.6.8 — BETA EN WELCOME PARA MOVIL PEQUENO:
 *
 *   En ≤420px la pildora BETA de la topbar se oculta (no cabe entre el
 *   boton ≡, el logo y los dos botones de la derecha). Para que el usuario
 *   movil siga viendo la etiqueta de version, se anade "(Versión BETA en
 *   pruebas)" al final del mensaje de bienvenida (dentro del .welcome-sub),
 *   entre parentesis, en tamano ~0.75em y color muted.
 *
 *   Solo visible en ≤420px (via CSS display:none por defecto + display:inline
 *   en el @media). En desktop y tablet la etiqueta sigue estando arriba, en
 *   la topbar, y NO se duplica en el welcome.
 *
 *   Reutiliza brand.betaLabel — mismo texto en topbar y welcome, sin duplicar
 *   strings.
 *
 * CAMBIOS v1.6.6 → v1.6.7 — INDICADOR BETA + DISCLAIMER IA:
 *
 *   Anadidos dos elementos:
 *     - EN LA TOPBAR: pildora "Versión BETA en pruebas" justo a la derecha
 *       del boton ☰ (toggle historial). Uppercase, tracking, muted, con
 *       borde hairline. En ≤420px se oculta por falta de espacio horizontal.
 *     - DEBAJO DEL .input-box: disclaimer "CATHOVIA es IA y puede cometer
 *       errores" (texto pequeno centrado, patron habitual en consolas de
 *       IA generativa).
 *
 *   Ambos textos son configurables via brand:
 *     - DEFAULT_BRAND.betaLabel:  'Versión BETA en pruebas'
 *     - DEFAULT_BRAND.disclaimer: 'CATHOVIA es IA y puede cometer errores'
 *
 *   Si un vertical distinto no quiere alguno, basta con pasar cadena vacia
 *   en el brand externo — el bloque no se pinta.
 *
 *   Nota sobre el centrado del logo en la topbar: el .tb-brand mantiene
 *   flex:1, asi que al meter la pildora BETA a la izquierda el logo queda
 *   levemente desplazado hacia la derecha del eje visual (unos ~30-40px
 *   en desktop). Es asumible; si molesta se anade un spacer invisible del
 *   mismo ancho a la derecha del boton ◧.
 *
 * CAMBIOS v1.6.5 → v1.6.6 — LOGO EN PANTALLA DE BIENVENIDA:
 *
 *   El welcome pasa de "Bienvenido a Cathovia" (una linea, texto plano)
 *   a dos lineas: "Te damos la bienvenida a" + LOGO en linea propia debajo.
 *
 *   Razones:
 *     - A 46px de titulo desktop + logo inline, el conjunto se comia el
 *       ancho de .welcome-inner (540px) y en mobile (≤420px, titulo 28px)
 *       rompia a dos lineas dejando el logo colgando en la segunda.
 *     - El logo lleva CATHOVIA en versalitas con tracking amplio, disenado
 *       como marca aislada. Mezclado inline con serif corriente el peso
 *       optico no cuadra.
 *
 *   Cambios concretos:
 *     - DEFAULT_BRAND.welcomeTitle: 'Bienvenido a Cathovia' → 'Te damos la bienvenida a'
 *     - _renderWelcome() inserta <img class="welcome-logo"> entre el titulo
 *       y el subtitulo. Solo se pinta si b.logo existe (fallback: sin logo).
 *     - CSS nuevo .welcome-logo: display:block, height:64px desktop,
 *       48px ≤640px, 40px ≤420px. Mismo criterio que .tb-logo del topbar:
 *       height fijo, width:auto para preservar ratio del PNG con alfa.
 *     - .welcome-title: margin-bottom desktop 22px → 14px (el logo abre
 *       el espacio propio y no queremos hueco doble).
 *
 *   Reutiliza b.logo, la misma URL cruda del topbar (~mv2.png sin pipeline
 *   de transformacion), asi no hay riesgo de marco blanco por aplanamiento
 *   del canal alfa.
 *
 * CAMBIOS v1.6.4 → v1.6.5 — LOGO EN TOPBAR:
 *
 *   Sustituido el texto "Cathovia" (.tb-title) por el logo PNG con fondo
 *   transparente alojado en Wix Media Manager. El subtitulo VERIA HUMANITAS
 *   se mantiene debajo.
 *
 *   CLAVE (replica exacta del patron que funciona en EGAEL 1.0):
 *     - URL CRUDA de Media Manager, terminada en ~mv2.png. NUNCA la URL con
 *       segmento de transformacion /v1/fill/w_,h_,al_c,q_85,enc_auto/ porque
 *       ese pipeline reencoda y puede aplanar el canal alfa contra blanco,
 *       que es el origen del "marco" blanco alrededor del logo.
 *     - <img> directo. Nunca background-image sobre un div.
 *     - CSS minimo: solo height / width:auto / display:block. Sin background,
 *       sin border, sin box-shadow, sin filter. El marco lo produce el CSS,
 *       no el PNG.
 *     - El contenedor .tb-brand no lleva background propio: hereda --surface
 *       de la .topbar.
 *
 *   El PNG original es 300x66 (ratio 4.55:1) con alfa real verificado.
 *   A height:30px ocupa ~136px de ancho; 26px en movil, 22px en <=420px.
 *
 * CAMBIOS v1.6.3 → v1.6.4 — FIX REAL DEL LAYOUT (v1.6.3 no bastaba):
 *
 *   v1.6.3 arreglo los min-height:0 del grid (necesarios, se mantienen) pero
 *   NO resolvio el sintoma: el input seguia fuera de pantalla.
 *
 *   DIAGNOSTICO MEDIDO EN PRODUCCION (F12, arbol DOM real):
 *     [0] CATHOVIA-CONSOLE            height=1795.68px  rect=1796px
 *     [1] DIV#comp-mrcg3n71           height=1795.68px  rect=1796px
 *     [2] DIV (grid)                  height=1819.67px  rect=1820px
 *     [4] SECTION#comp-mrcg3n4x       height=1819.67px  rect=1820px
 *     SHADOW .app: height=1795.68px maxH=100% rect=1796px
 *
 *   El CSS de v1.6.3 funcionaba PERFECTAMENTE: .app respetaba max-height:100%
 *   y media 1796px. El problema es que su padre media 1796px.
 *
 *   CAUSA RAIZ: el editor de Wix declara #egaelConsole a 753px, pero el runtime
 *   IGNORA ese valor e infla el wrapper a ~1796px midiendo el contenido inicial
 *   del custom element. Con height:100% la consola hereda esa altura inventada.
 *   La ventana muestra ~950px → el .input-area queda a 1796px, fuera de vista.
 *   Ninguna cantidad de height:100% arregla esto: siempre heredara lo que Wix
 *   decida.
 *
 *   FIX: romper la herencia. `:host` se ancla a la VENTANA (100dvh), no al
 *   contenedor. Es exactamente lo que ya hacia el bloque @media (max-width:900px)
 *   — y por eso en movil nunca hubo este bug. Se usa dvh (dynamic viewport
 *   height) con fallback a vh: respeta las barras del navegador movil.
 *
 *   PRECONDICION: la pagina /cathovia contiene UNICAMENTE el custom element,
 *   sin cabecera ni footer de Wix visibles (verificado en produccion). Si algun
 *   dia se anaden, habra que restar su alto: calc(100dvh - Npx).
 *
 * CAMBIOS v1.6.2 → v1.6.3 — FIX DE LAYOUT EN DESKTOP (solo CSS, cero logica):
 *
 *   SINTOMA: con un historico largo (30 chats), en desktop la consola entera
 *   se estiraba. Habia que hacer scroll de PAGINA para leer la bienvenida y
 *   mas scroll para llegar a la casilla de escritura. La cabecera "HISTORIAL"
 *   y el boton "+ Nuevo" desaparecian por arriba.
 *
 *   CAMBIOS (todos se mantienen en v1.6.4):
 *     1. `.app`      → `max-height: 100%` + `min-height: 0`.
 *     2. `.sidebar`  → `min-height: 0`. Permite que `.chats-list` scrollee
 *                      dentro. "+ Nuevo" y la cabecera siempre visibles.
 *     3. `.main`     → `min-height: 0` + `overflow: hidden`. El `.input-area`
 *                      queda clavado abajo, como en Claude y ChatGPT.
 *     4. `.messages` → `min-height: 0` + `justify-content: flex-start`.
 *     5. `.welcome`  → fuera `margin: auto 0`. Arranca a 48px de la topbar.
 *
 *   En un grid/flex, un hijo con overflow-y:auto NO scrollea si su padre no
 *   tiene min-height:0 — el padre simplemente crece. Faltaba en .sidebar y .main.
 *
 * CAMBIOS v1.6.1 → v1.6.2 — FIX DUPLICACIÓN + POLLING REPETIDO:
 *
 *   1. FIX CRÍTICO — DUPLICACIÓN: v1.6.1 dejaba `emit('cathovia-query')` "por
 *      retro-compat" al mismo tiempo que el nuevo fetch HTTP. Resultado: cada
 *      pregunta viajaba por ambas rutas (widget→PageCode→webMethod + widget→
 *      HTTP), disparando DOS llamadas a Anthropic en paralelo y doble coste.
 *      Log en producción lo confirmó (dos "askCathoviaCore IN" idénticos).
 *      El emit se ELIMINA. La única ruta es fetch a /_functions/cathoviaAsk.
 *      El handler de cathovia-query en cathoviaPage.js queda huérfano pero
 *      inofensivo; Fase 2 lo limpiará.
 *
 *   2. POLLING REPETIDO EN LUGAR DE RECOVERY ÚNICO: los 14s de timeout duro
 *      de Wix Velo aplican a todo el backend (webMethods, http-functions,
 *      backend modules). Pero — según doc oficial y confirmado en producción —
 *      cuando el timeout se cumple, EL CÓDIGO SIGUE EJECUTÁNDOSE aunque la
 *      conexión al cliente se corte. La respuesta de Anthropic (16-22s) se
 *      guarda igual en EgaelMessages vía _saveMessages. Solo hay que ir a
 *      buscarla.
 *
 *      v1.6.0 hacía UN check a los 2.5s (demasiado pronto). v1.6.2 hace
 *      POLLING: cada 3s durante 60s, emite `cathovia-open-chat` y chequea si
 *      el historial devuelto contiene la respuesta esperada. En cuanto aparece,
 *      pinta y detiene el polling. Si a los 60s no ha llegado, muestra error
 *      con "Reintentar".
 *
 *      Nuevas constantes: POLL_INTERVAL_MS=3000, POLL_MAX_ATTEMPTS=20.
 *
 * CAMBIOS v1.6.0 → v1.6.1 — LLAMADA HTTP DIRECTA AL BACKEND:
 *   - `_sendQuery` ahora llama directamente a `/_functions/cathoviaAsk` con
 *     `fetch()` en vez de emitir `cathovia-query` al Page Code. Motivo: el
 *     proxy de webMethods en Wix mata el fetch cliente↔backend a los ~14s,
 *     por debajo del tiempo típico de Sonnet 4.6 (12-20s). http-functions.js
 *     tiene 5 min de timeout y no pasa por ese proxy.
 *
 *   - Beneficios adicionales:
 *     · Elimina el problema del setAttribute truncando payloads grandes en
 *       Page Code (mismo patrón que ya se usaba para TTS con egaelTts).
 *     · Reduce un salto de red (widget → HTTP → backend, sin pasar por
 *       Page Code intermedio).
 *     · Simplifica el ciclo de datos: la respuesta llega directa al fetch
 *       del widget, sin serializar/deserializar via setAttribute.
 *
 *   - El evento `cathovia-query` sigue emitiéndose para retro-compatibilidad
 *     (por si alguien tiene hooks en Page Code), pero la lógica principal
 *     ya no depende de él. En Fase 2 se limpiará cathoviaPage.js.
 *
 *   - El recovery del 504 (v1.6.0) sigue activo como red de seguridad: si
 *     por lo que sea el fetch a /_functions/cathoviaAsk fallara, el widget
 *     hace la misma recuperación via cathovia-open-chat que ya conocemos.
 *
 * CAMBIOS v1.5.1 → v1.6.0 — RECOVERY DE 504:
 *   - Cuando llega un error al widget (fetch cortado por el gateway de Wix
 *     a los 60s, aunque el backend haya terminado y guardado la respuesta
 *     en EgaelMessages), el widget ya NO se queda con la experiencia rota.
 *
 *   - El mensaje de error se pinta ahora con un botón "Reintentar" que
 *     reenvía la última query del usuario.
 *
 *   - Además: a los 2.5s del error, el widget emite `cathovia-open-chat`
 *     con el sessionId actual. El Page Code responde llamando a
 *     cathoviaAbrirChat, que devuelve el historial actualizado. Si el
 *     backend SÍ terminó y guardó la respuesta a la última pregunta, el
 *     historial la contiene → _applyHistory limpia el error y pinta la
 *     respuesta como si nada hubiera pasado. Si el backend NO terminó
 *     (Anthropic caído del todo), el historial no tiene respuesta al
 *     último user → se preserva el mensaje de error con el botón
 *     "Reintentar" para que el usuario decida qué hacer.
 *
 *   - Nuevos estados: _lastQuery, _pendingRecovery, _recoveryTimer,
 *     _lastErrorBlock.
 *   - _applyHistory ahora detecta si es una recuperación en curso y aplica
 *     historial sólo si aporta la respuesta esperada.
 *   - CSS del err-box actualizado para acomodar el botón "Reintentar".
 *
 * CAMBIOS v1.5.0 → v1.5.1:
 *   - Barra superior CONGELADA en móvil: .topbar con position:sticky top:0,
 *     .app acotado a 100dvh (altura dinámica del viewport, respeta las barras
 *     del navegador), y overflow controlado en .app/.layout/.main para que el
 *     scroll ocurra SOLO dentro de .messages. La topbar ya no se desplaza hacia
 *     arriba al alargarse el chat.
 *
 * CAMBIOS v1.4.4 → v1.5.0:
 *   - VOZ (TTS): botón 🔊 "Escuchar" al final de cada respuesta del asistente
 *     que llama a Gemini 3.1 Flash TTS (voz Umbriel por defecto) via el
 *     backend egaelTTS.web.js. Reproduce el WAV inline sin abandonar el chat.
 *   - Toggle global 🔊/🔇 en topbar para activar/desactivar auto-reproducción
 *     de todas las respuestas. Estado persistido en localStorage.
 *   - MICRÓFONO: botón 🎤 en la barra de input. Web Speech API con manejo
 *     robusto de permisos, silencio prolongado, safety timer. Distingue
 *     Android/Desktop/iOS con estrategias diferentes (portado de +50 v1.0).
 *   - Sanitización antes de TTS: elimina [[CARD:id]] y markdown para que
 *     la voz no lea "asterisco asterisco" ni identificadores.
 *   - Nuevo evento cathovia-tts con {texto, messageId} y atributos ttsAudio
 *     y ttsError para recibir el resultado del backend.
 *
 * CAMBIOS v1.4.3 → v1.4.4:
 *   - Borrado de conversaciones del historial. Cada item de la lista tiene
 *     ahora una papelera (visible al hover en desktop, siempre en móvil).
 *     Click en la papelera abre un modal de confirmación con "Cancelar"
 *     y "Borrar" (rojo). Al confirmar, emite cathovia-delete-chat con
 *     sessionId y quita el item del listado optimistamente. Si el chat
 *     borrado era el actual, resetea a nuevo chat.
 *
 * CAMBIOS v1.4.2 → v1.4.3:
 *   - _applyInlineCatalog acepta payload envuelto {_ts, items} además del
 *     array crudo y {inlineCatalog:[]}. Necesario para el fix del bug de
 *     reapertura del Page Code v1.4.3.
 *
 * CAMBIOS v1.4.1 → v1.4.2:
 *   - FIX BUG DE REAPERTURA: eliminado el short-circuit oldVal===newVal en
 *     attributeChangedCallback. Cuando el usuario reabre el mismo chat viejo,
 *     el JSON de history e inlineCatalog llega idéntico y el widget lo
 *     ignoraba silenciosamente. Ahora se re-renderiza siempre que llegue
 *     un atributo (los _apply* limpian y repintan desde cero, es seguro).
 *
 * CAMBIOS v1.4.0 → v1.4.1:
 *   - Botón X de cierre en la cabecera del sidebar y del panel, visible SOLO
 *     en móvil (viewport <900px). Cerrar tocando el backdrop sigue funcionando
 *     como atajo.
 *
 * CAMBIOS v1.3.2 → v1.4.0:
 *   - Panel lateral con dos secciones fijas: CURSOS (arriba) + AGENDA (abajo)
 *     Eliminada la sección "Contenidos" del panel — los contenidos ahora
 *     aparecen inline en la conversación cuando la IA lo justifica.
 *   - Nuevo atributo `courses` (antes `contenidos`).
 *   - Nuevo atributo `inlineCatalog` con los ítems tipo contenido+encuentro
 *     que la IA puede insertar como cards inline mediante [[CARD:id]].
 *   - Nuevos eventos: `cathovia-load-courses` (reemplaza cathovia-load-content),
 *     `cathovia-load-inline` (carga el catálogo inline al iniciar).
 *   - `_appendAssistant` parsea marcadores [[CARD:id]] y los sustituye por
 *     cards renderizadas según el tipo del ítem:
 *       · contenido con audio → título + shortDescription + <audio controls>
 *       · contenido sin audio + actionUrl → título + shortDescription + "Leer"
 *       · encuentro → título + shortDescription + "Solicitar encuentro"
 *   - Cards inline aparecen entre párrafos del asistente (no como parte del
 *     texto editorial), con estilo diferenciado del texto para que se lean
 *     como objetos independientes.
 *   - Nuevo evento `cathovia-inline-action` cuando el usuario pulsa el CTA
 *     de una card inline. { itemId, type, actionUrl }
 *   - Player nativo <audio controls> — cero librerías, funciona en móvil.
 * ═══════════════════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  if (customElements.get('cathovia-console')) {
    console.log('[CATHOVIA v1.6.5] Ya registrado.');
    return;
  }

  const VERSION = '1.6.5';
  const TAG = `[CATHOVIA v${VERSION}]`;

  const LS_SIDEBAR = 'cathovia-sidebar-open';
  const LS_PANEL   = 'cathovia-panel-open';
  const LS_TTS_AUTO = 'cathovia-tts-auto';

  // Polling repetido tras timeout del backend (v1.6.2)
  // Wix Velo corta la conexión cliente↔backend a los 14s. Pero el código
  // backend SIGUE ejecutándose y termina de guardar la respuesta assistant
  // en EgaelMessages (Anthropic tarda 16-22s). El widget hace polling cada
  // 3s durante 60s buscando esa respuesta.
  const POLL_INTERVAL_MS  = 3000;   // Consulta cada 3s
  const POLL_MAX_ATTEMPTS = 20;     // 20 * 3s = 60s de espera total

  // Micrófono — timers portados de EGAEL +50
  const SILENCE_MS = 2200;   // Silencio tras el cual se envía
  const SAFETY_MS  = 12000;  // Timeout total de una sesión de mic

  // Detección de plataforma (Web Speech API se comporta distinto)
  const UA = (typeof navigator !== 'undefined' && navigator.userAgent) || '';
  const IS_IOS = /iPad|iPhone|iPod/.test(UA) && !window.MSStream;
  const IS_ANDROID = /Android/.test(UA);

  const DEFAULT_COLORS = {
    bg:        '#EFE8D5',
    surface:   '#FBF7EC',
    card:      '#FFFFFF',
    ink:       '#1F2430',
    inkSoft:   '#3A3F4B',
    muted:     '#6E6A5F',
    hairline:  '#D9CFB5',
    accent:    '#1E3A5F',
    accentInk: '#FBF7EC'
  };

  const DEFAULT_BRAND = {
    name:         'Cathovia',
    sub:          'Veria Humanitas',
    logo:         'https://static.wixstatic.com/media/420ca1_0d19ac1f375b4228908ecb774581fb30~mv2.png',
    welcomeTitle: 'Te damos la bienvenida a',
    welcome:      'Estoy aquí para acompañarte —en cualquier ámbito de tu vida— desde la mirada y las enseñanzas de la Iglesia Católica. Pregúntame lo que quieras.',
    placeholder:  'Escribe tu pregunta…',
    thinking:     'Buscando la respuesta…',
    betaLabel:    'Versión BETA en pruebas',
    disclaimer:   'CATHOVIA es IA y puede cometer errores',
    fontTitle:    '"Instrument Serif", Georgia, "Times New Roman", serif',
    fontBody:     '"Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  };

  function isMobileViewport() {
    try { return window.matchMedia('(max-width: 900px)').matches; }
    catch (_) { return window.innerWidth < 900; }
  }

  class CathoviaConsole extends HTMLElement {

    static get observedAttributes() {
      return ['config', 'response', 'chats', 'history', 'courses', 'eventos', 'inlineCatalog', 'ttsAudio', 'ttsError', 'systemError'];
    }

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._cursoId       = '';
      this._userId        = '';
      this._userName      = '';
      this._sessionId     = null;
      this._chats         = [];
      this._courses       = [];
      this._eventos       = [];
      this._inlineCatalog = [];
      this._pending       = false;
      this._pendingId     = null;
      this._msgCounter    = 0;
      this._hasMessages   = false;
      this._brand         = { ...DEFAULT_BRAND };
      this._colors        = { ...DEFAULT_COLORS };

      // Polling repetido tras timeout del backend (v1.6.2)
      this._lastQuery         = '';    // última query enviada, para "Reintentar"
      this._polling           = false; // hay polling activo esperando respuesta
      this._pollTimer         = null;  // timer del setTimeout entre intentos
      this._pollAttempts      = 0;     // contador de intentos hechos
      this._lastErrorBlock    = null;  // ref DOM del bloque de error activo (solo si polling agota)

      // TTS state
      this._ttsAutoPlay      = this._readLS(LS_TTS_AUTO, true);
      this._audioEl          = null;   // <audio> reutilizado
      this._playingMessageId = null;   // qué respuesta está sonando

      // Mic state (portado de EGAEL +50)
      this._SR              = null;
      this._recognition     = null;
      this._isListening     = false;
      this._silenceTimer    = null;
      this._safetyTimer     = null;
      this._micStoppingForSend = false;
      this._androidFinalBuffer = '';
      this._lastFinalTranscript = '';

      const mobile = isMobileViewport();
      this._sidebarOpen = mobile ? false : this._readLS(LS_SIDEBAR, true);
      this._panelOpen   = mobile ? false : this._readLS(LS_PANEL, false);
    }

    connectedCallback() {
      this._render();
      this._bindEvents();
      this._renderWelcome();
      this._setupMic();
      this._updateTtsToggleUI();
      setTimeout(() => this._emit('cathovia-ready', {}), 50);
      console.log(`${TAG} Montado. sidebar=${this._sidebarOpen} panel=${this._panelOpen} ttsAuto=${this._ttsAutoPlay}`);
    }

    attributeChangedCallback(name, oldVal, newVal) {
      console.log(`${TAG} attributeChangedCallback name=${name} newValLen=${(newVal || '').length}`);
      if (!newVal) return;
      // NOTA v1.4.2: NO se aplica short-circuit oldVal===newVal.
      // Los atributos como history e inlineCatalog pueden llegar con el
      // MISMO JSON al reabrir un chat, y sin embargo hay que re-renderizar
      // porque el widget necesita reconstruir el DOM desde cero.
      if (name === 'systemError') { this._showSystemError(newVal); return; }
      let payload;
      try { payload = JSON.parse(newVal); } catch (e) { return; }

      if (name === 'config')        this._applyConfig(payload);
      if (name === 'response')      this._handleResponse(payload);
      if (name === 'chats')         this._applyChats(payload);
      if (name === 'history')       this._applyHistory(payload);
      if (name === 'courses')       this._applyCourses(payload);
      if (name === 'eventos')       this._applyEventos(payload);
      if (name === 'inlineCatalog') this._applyInlineCatalog(payload);
      if (name === 'ttsAudio')      this._applyTtsAudio(payload);
      if (name === 'ttsError')      this._applyTtsError(payload);
    }

    _applyConfig(cfg) {
      console.log(`${TAG} applyConfig`, cfg);
      if (cfg.cursoId)   this._cursoId   = cfg.cursoId;
      if (cfg.userId)    this._userId    = cfg.userId;
      if (cfg.userName)  this._userName  = cfg.userName;
      if (cfg.sessionId) this._sessionId = cfg.sessionId;
      if (cfg.brand)     this._brand     = { ...DEFAULT_BRAND, ...cfg.brand };
      if (cfg.colors && Object.keys(cfg.colors).length > 0) {
        this._colors = { ...DEFAULT_COLORS, ...cfg.colors };
      }
      this._render();
      this._bindEvents();
      this._paintExpert(cfg.expert || null);
      if (this._sessionId) {
        this._emit('cathovia-open-chat', { sessionId: this._sessionId });
      } else {
        this._renderWelcome();
      }
      this._emit('cathovia-load-chats',   {});
      this._emit('cathovia-load-courses', {});
      this._emit('cathovia-load-events',  {});
      this._emit('cathovia-load-inline',  {});
    }

    _applyChats(payload) {
      const list = Array.isArray(payload) ? payload : (payload.chats || []);
      this._chats = list;
      this._renderChats();
    }

    _applyHistory(payload) {
      const sessionId = payload.sessionId || null;
      const mensajes  = payload.mensajes || [];
      if (sessionId) this._sessionId = sessionId;

      // ─── LÓGICA DE POLLING (v1.6.2) ───
      // Si estamos en un polling activo esperando respuesta del backend
      // (porque el fetch anterior dio timeout / 504), sólo repintamos si el
      // historial contiene la respuesta esperada. Si no, mantenemos el
      // "pensando…" y programamos el siguiente intento.
      if (this._polling) {
        if (this._historyContainsExpectedAnswer(mensajes)) {
          console.log(`${TAG} polling OK en intento #${this._pollAttempts}: respuesta encontrada`);
          this._stopPolling();
          // Sigue el flujo normal más abajo → limpia thinking, pinta la respuesta
        } else {
          console.log(`${TAG} polling: intento #${this._pollAttempts} sin respuesta aún`);
          this._scheduleNextPoll();
          return; // no repintamos, mantenemos el "pensando…"
        }
      }

      const messagesEl = this.shadowRoot.getElementById('messages');
      messagesEl.innerHTML = '';
      this._hasMessages = false;
      this._lastErrorBlock = null; // se limpia con el innerHTML

      if (mensajes.length === 0) {
        this._renderWelcome();
      } else {
        mensajes.forEach(m => {
          if (m.rol === 'user') this._appendUser(m.contenido, false);
          else this._appendAssistant(m.contenido, false);
        });
        this._hasMessages = true;
        this._scrollBottom();
      }
      this._highlightActiveChat();
    }

    /**
     * True si el historial contiene la respuesta que estábamos esperando:
     * el último mensaje user coincide con this._lastQuery Y hay al menos
     * un assistant después.
     */
    _historyContainsExpectedAnswer(mensajes) {
      if (!Array.isArray(mensajes) || mensajes.length === 0) return false;
      if (!this._lastQuery) return false;

      // Buscar de atrás adelante: el último user debería coincidir con lastQuery
      // y debe tener al menos un assistant DESPUÉS.
      let lastUserIdx = -1;
      for (let i = mensajes.length - 1; i >= 0; i--) {
        if (mensajes[i].rol === 'user') { lastUserIdx = i; break; }
      }
      if (lastUserIdx === -1) return false;

      const lastUserContent = String(mensajes[lastUserIdx].contenido || '').trim();
      const lastQuery = String(this._lastQuery || '').trim();
      if (lastUserContent !== lastQuery) {
        console.log(`${TAG} recovery: último user en historial no coincide con lastQuery`);
        return false;
      }

      // ¿Hay algún assistant después del último user?
      for (let i = lastUserIdx + 1; i < mensajes.length; i++) {
        if (mensajes[i].rol === 'assistant') return true;
      }
      return false;
    }

    _applyCourses(payload) {
      const list = Array.isArray(payload) ? payload : (payload.courses || payload.items || []);
      this._courses = list;
      this._renderCourses();
    }

    _applyEventos(payload) {
      const list = Array.isArray(payload) ? payload : (payload.eventos || payload.items || []);
      this._eventos = list;
      this._renderEventos();
    }

    _applyInlineCatalog(payload) {
      // Acepta array crudo, {inlineCatalog:[]}, {items:[]}, o {_ts, items:[]}
      let list = [];
      if (Array.isArray(payload)) list = payload;
      else if (payload.items) list = payload.items;
      else if (payload.inlineCatalog) list = payload.inlineCatalog;
      this._inlineCatalog = list;
      console.log(`${TAG} inlineCatalog cargado: ${list.length} ítems`);
    }

    _handleResponse(payload) {
      console.log(`${TAG} handleResponse`, payload);
      this._hideThinking();
      this._pending = false;

      if (payload.messageId && this._pendingId && payload.messageId !== this._pendingId) return;
      this._pendingId = null;

      if (payload.sessionId && !this._sessionId) {
        this._sessionId = payload.sessionId;
        this._emit('cathovia-load-chats', {});
      }

      // Actualizar catálogo inline si viene en la respuesta
      if (payload.inlineCatalog && Array.isArray(payload.inlineCatalog)) {
        this._inlineCatalog = payload.inlineCatalog;
      }

      const text = payload.respuesta
                || (typeof payload.error === 'string' ? payload.error : null)
                || (payload.error && payload.error.message) || null;

      if (payload.error && !payload.respuesta) {
        // v1.6.2: el fetch cliente↔backend falló (típicamente 504 tras 14s del
        // proxy de Wix), pero el código backend sigue ejecutándose y guardará
        // la respuesta en EgaelMessages cuando termine. Arrancamos polling
        // en lugar de mostrar error: el "pensando…" se queda visible, cada 3s
        // preguntamos por el historial, y en cuanto aparece la respuesta la
        // pintamos como si nada hubiera pasado.
        if (this._sessionId && this._lastQuery) {
          this._startPolling();
          return; // NO ocultamos thinking, NO mostramos error
        }
        // Sin sessionId no hay nada que buscar → error normal con Reintentar
        this._stopPolling();
        const errBlock = this._appendErrorWithRetry(text || 'Error de conexión.');
        this._lastErrorBlock = errBlock;
      } else if (text) {
        // ── RESPUESTA OK → cualquier polling en curso se detiene ──
        this._stopPolling();
        this._lastErrorBlock = null;
        this._appendAssistant(text, true);
      } else {
        this._appendError('No he recibido respuesta. Inténtalo de nuevo.');
      }
    }

    /**
     * Arranca polling repetido buscando la respuesta assistant esperada.
     * Motivo: Wix Velo tiene timeout duro de 14s en backend, pero el código
     * sigue ejecutándose después. La respuesta de Anthropic (16-22s) queda
     * guardada en EgaelMessages via _saveMessages. Solo hay que ir a buscarla.
     *
     * Emite `cathova-open-chat` cada POLL_INTERVAL_MS. `_applyHistory` con
     * `_polling=true` chequea si el historial contiene la respuesta y, si sí,
     * la pinta y detiene el polling.
     */
    _startPolling() {
      this._stopPolling();
      this._polling = true;
      this._pollAttempts = 0;
      console.log(`${TAG} startPolling: sessionId=${this._sessionId} cada ${POLL_INTERVAL_MS}ms máx ${POLL_MAX_ATTEMPTS} intentos`);
      this._scheduleNextPoll();
    }

    _scheduleNextPoll() {
      if (!this._polling) return;
      this._pollAttempts++;
      if (this._pollAttempts > POLL_MAX_ATTEMPTS) {
        console.log(`${TAG} polling: máx intentos alcanzado, mostrando error`);
        this._stopPolling();
        this._hideThinking();
        this._pending = false;
        const errBlock = this._appendErrorWithRetry(
          'La respuesta está tardando más de lo previsto. Puedes reintentar o esperar unos segundos.'
        );
        this._lastErrorBlock = errBlock;
        return;
      }
      this._pollTimer = setTimeout(() => {
        if (!this._polling) return;
        console.log(`${TAG} polling: intento #${this._pollAttempts}/${POLL_MAX_ATTEMPTS}`);
        this._emit('cathovia-open-chat', { sessionId: this._sessionId });
      }, POLL_INTERVAL_MS);
    }

    _stopPolling() {
      if (this._pollTimer) { clearTimeout(this._pollTimer); this._pollTimer = null; }
      this._polling = false;
      this._pollAttempts = 0;
    }

    _sendQuery(query) {
      if (this._pending || !query.trim()) return;
      this._msgCounter++;
      const messageId = `msg_${this._msgCounter}_${Date.now()}`;
      this._pendingId = messageId;
      this._pending   = true;
      this._lastQuery = query.trim();

      // Nueva petición → cualquier polling en curso se detiene
      this._stopPolling();

      // Si había un mensaje de error activo del intento anterior, lo quitamos
      if (this._lastErrorBlock) {
        try { this._lastErrorBlock.remove(); } catch (_) {}
        this._lastErrorBlock = null;
      }

      this._clearWelcome();
      this._appendUser(query, true);
      this._showThinking();

      console.log(`${TAG} sendQuery "${query.substring(0, 40)}…" via HTTP`);

      // v1.6.2: SOLO ruta HTTP. Se eliminó el emit('cathovia-query') que en
      // v1.6.1 causaba doble llamada a askCathoviaCore (via Page Code + via
      // HTTP function).
      this._fetchCathoviaAsk(query, messageId);
    }

    /**
     * v1.6.1: petición HTTP directa a /_functions/cathoviaAsk.
     * Reemplaza el flujo widget → cathovia-query → Page Code → webMethod
     * que sufría el timeout del proxy Wix a los ~14s. Aquí tenemos 5 min.
     */
    async _fetchCathoviaAsk(query, messageId) {
      try {
        const res = await fetch('/_functions/cathoviaAsk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cursoId:  this._cursoId,
            sessionId: this._sessionId,
            query:    query,
            userId:   this._userId,
            userName: this._userName
          })
        });

        if (!res.ok) {
          console.warn(`${TAG} cathoviaAsk HTTP ${res.status}`);
          this._handleResponse({
            messageId,
            error: `El servicio respondió con error ${res.status}. Reintenta en unos segundos.`
          });
          return;
        }

        const data = await res.json();
        console.log(`${TAG} cathoviaAsk OK respuestaLen=${(data.respuesta || '').length}`);

        // Reutilizamos el mismo pipeline de respuesta que ya existía para
        // la ruta webMethod. Añadimos messageId para el matching.
        this._handleResponse({
          messageId,
          ok: data.ok,
          respuesta: data.respuesta,
          sessionId: data.sessionId,
          inlineCatalog: data.inlineCatalog,
          error: data.ok ? null : (data.error || 'Error desconocido')
        });
      } catch (err) {
        console.error(`${TAG} cathoviaAsk EXCEPTION:`, err.message || err);
        this._handleResponse({
          messageId,
          error: 'No he podido conectar con el servicio. Reintenta en unos segundos.'
        });
      }
    }

    _handleSend() {
      const input = this.shadowRoot.getElementById('chatInput');
      const query = (input.value || '').trim();
      if (!query) return;
      input.value = '';
      input.style.height = 'auto';
      this._sendQuery(query);
      setTimeout(() => input.focus(), 0);
    }

    _bindEvents() {
      const root = this.shadowRoot;
      root.getElementById('sendBtn').addEventListener('click', () => this._handleSend());

      const input = root.getElementById('chatInput');
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this._handleSend(); }
      });
      input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 180) + 'px';
      });

      const inputBox = root.querySelector('.input-box');
      if (inputBox) {
        inputBox.addEventListener('click', (e) => {
          if (e.target !== input && e.target.tagName !== 'BUTTON') {
            input.focus();
          }
        });
      }

      root.getElementById('btnToggleSidebar').addEventListener('click', () => this._toggleSidebar());
      root.getElementById('btnTogglePanel').addEventListener('click',   () => this._togglePanel());
      root.getElementById('btnNewChat').addEventListener('click', () => {
        this._resetToNewChat();
      });
      const refCourses = root.getElementById('btnRefreshCourses');
      if (refCourses) refCourses.addEventListener('click', () => this._emit('cathovia-load-courses', {}));
      const refEvents = root.getElementById('btnRefreshEvents');
      if (refEvents) refEvents.addEventListener('click', () => this._emit('cathovia-load-events', {}));

      const backdrop = root.getElementById('backdrop');
      if (backdrop) backdrop.addEventListener('click', () => this._closeAllPanels());

      const closeSidebar = root.getElementById('btnCloseSidebar');
      if (closeSidebar) closeSidebar.addEventListener('click', () => {
        this._sidebarOpen = false;
        this._writeLS(LS_SIDEBAR, false);
        this._applyLayoutState();
      });

      const closePanel = root.getElementById('btnClosePanel');
      if (closePanel) closePanel.addEventListener('click', () => {
        this._panelOpen = false;
        this._writeLS(LS_PANEL, false);
        this._applyLayoutState();
      });

      const closeErr = root.getElementById('closeErrorBanner');
      if (closeErr) closeErr.addEventListener('click', () => this._hideSystemError());

      const btnToggleTts = root.getElementById('btnToggleTts');
      if (btnToggleTts) btnToggleTts.addEventListener('click', () => this._toggleTtsAutoPlay());

      const micBtn = root.getElementById('micBtn');
      if (micBtn) micBtn.addEventListener('click', () => this._toggleMic());
    }

    _closeAllPanels() {
      this._sidebarOpen = false;
      this._panelOpen   = false;
      this._applyLayoutState();
    }

    _resetToNewChat() {
      this._stopPolling();
      this._sessionId    = null;
      this._hasMessages  = false;
      this._pending      = false;
      this._pendingId    = null;
      this._lastQuery    = '';
      this._lastErrorBlock = null;
      const m = this.shadowRoot.getElementById('messages');
      if (m) m.innerHTML = '';
      this._renderWelcome();
      this._highlightActiveChat();
      const input = this.shadowRoot.getElementById('chatInput');
      if (input) input.focus();
      if (isMobileViewport()) this._closeAllPanels();
    }

    _toggleSidebar() {
      this._sidebarOpen = !this._sidebarOpen;
      if (isMobileViewport() && this._sidebarOpen) this._panelOpen = false;
      this._writeLS(LS_SIDEBAR, this._sidebarOpen);
      this._applyLayoutState();
    }
    _togglePanel() {
      this._panelOpen = !this._panelOpen;
      if (isMobileViewport() && this._panelOpen) this._sidebarOpen = false;
      this._writeLS(LS_PANEL, this._panelOpen);
      this._applyLayoutState();
    }
    _applyLayoutState() {
      const layout = this.shadowRoot.getElementById('layout');
      layout.classList.toggle('sidebar-open', this._sidebarOpen);
      layout.classList.toggle('panel-open',   this._panelOpen);
    }

    _showSystemError(msg) {
      const banner = this.shadowRoot.getElementById('errorBanner');
      const text   = this.shadowRoot.getElementById('errorBannerText');
      if (banner && text) {
        text.textContent = msg;
        banner.style.display = 'flex';
      }
    }
    _hideSystemError() {
      const banner = this.shadowRoot.getElementById('errorBanner');
      if (banner) banner.style.display = 'none';
    }

    _clearWelcome() {
      const w = this.shadowRoot.querySelector('.welcome');
      if (w) w.remove();
    }

    _appendUser(text, scroll) {
      this._clearWelcome();
      this._hasMessages = true;
      const el = document.createElement('div');
      el.className = 'turn turn-user';
      el.innerHTML = `<div class="bubble">${this._escape(text)}</div>`;
      this.shadowRoot.getElementById('messages').appendChild(el);
      if (scroll) this._scrollBottom();
    }

    _appendAssistant(text, scroll) {
      this._clearWelcome();
      this._hasMessages = true;
      this._msgCounter++;
      const messageId = `ai_${this._msgCounter}_${Date.now()}`;
      const el = document.createElement('div');
      el.className = 'turn turn-ai';
      el.dataset.messageId = messageId;
      el.dataset.rawText = text;
      el.innerHTML = this._formatEditorialWithCards(text) + this._renderTtsButton(messageId);
      this.shadowRoot.getElementById('messages').appendChild(el);
      // Attach handlers to inline card CTAs
      el.querySelectorAll('.inline-card-cta').forEach(btn => {
        btn.addEventListener('click', () => {
          const itemId = btn.dataset.itemid;
          const type   = btn.dataset.type;
          const url    = btn.dataset.url;
          this._emit('cathovia-inline-action', { itemId, type, actionUrl: url });
          if (url) {
            try { window.open(url, '_blank', 'noopener'); } catch (_) {}
          }
        });
      });
      // Attach handler to TTS button
      const ttsBtn = el.querySelector('.tts-btn');
      if (ttsBtn) {
        ttsBtn.addEventListener('click', () => this._onTtsButtonClick(messageId, text, ttsBtn));
      }
      if (scroll) this._scrollBottom();
      // Auto-play si toggle global activo (solo para respuestas nuevas, no historial)
      if (scroll && this._ttsAutoPlay) {
        setTimeout(() => this._onTtsButtonClick(messageId, text, ttsBtn), 200);
      }
    }

    _renderTtsButton(messageId) {
      return `<div class="tts-row"><button class="tts-btn" data-mid="${messageId}" data-state="idle" title="Escuchar" aria-label="Escuchar">
        <span class="tts-icon">🔊</span><span class="tts-label">Escuchar</span>
      </button></div>`;
    }

    _appendError(text) {
      const el = document.createElement('div');
      el.className = 'turn turn-error';
      el.innerHTML = `<div class="err-box"><span class="err-icon">!</span><span>${this._escape(text)}</span></div>`;
      this.shadowRoot.getElementById('messages').appendChild(el);
      this._scrollBottom();
      return el;
    }

    /**
     * Variante del error con botón "Reintentar" que reenvía this._lastQuery.
     * Devuelve el DOM element para poder quitarlo cuando llegue la respuesta
     * de una recovery o de un reintento.
     */
    _appendErrorWithRetry(text) {
      const canRetry = !!this._lastQuery;
      const el = document.createElement('div');
      el.className = 'turn turn-error';
      el.innerHTML = `
        <div class="err-box err-box-retry">
          <div class="err-body">
            <span class="err-icon">!</span>
            <span class="err-text">${this._escape(text)}</span>
          </div>
          ${canRetry ? `<button class="err-retry-btn" type="button" aria-label="Reintentar">↻ Reintentar</button>` : ''}
        </div>
      `;
      this.shadowRoot.getElementById('messages').appendChild(el);

      if (canRetry) {
        const btn = el.querySelector('.err-retry-btn');
        if (btn) {
          btn.addEventListener('click', () => {
            const q = this._lastQuery;
            if (!q) return;
            // Quitar este bloque de error antes de reintentar
            try { el.remove(); } catch (_) {}
            if (this._lastErrorBlock === el) this._lastErrorBlock = null;
            this._sendQuery(q);
          });
        }
      }
      this._scrollBottom();
      return el;
    }

    _showThinking() {
      const el = document.createElement('div');
      el.className = 'turn turn-thinking';
      el.id = 'thinkingRow';
      el.innerHTML = `<div class="thinking">
                        <div class="thinking-dots"><span></span><span></span><span></span></div>
                        <div class="thinking-label">${this._escape(this._brand.thinking)}</div>
                      </div>`;
      this.shadowRoot.getElementById('messages').appendChild(el);
      this._scrollBottom();
    }
    _hideThinking() {
      const el = this.shadowRoot.getElementById('thinkingRow');
      if (el) el.remove();
    }

    _scrollBottom() {
      const m = this.shadowRoot.getElementById('messages');
      m.scrollTop = m.scrollHeight;
    }

    // ─────────────────────────────────────────────────────────────────────
    // FORMATO EDITORIAL + PARSEO [[CARD:id]]
    // ─────────────────────────────────────────────────────────────────────

    _formatEditorialWithCards(text) {
      const catalogMap = new Map();
      (this._inlineCatalog || []).forEach(it => catalogMap.set(it.id, it));

      const paragraphs = String(text || '').split(/\n{2,}/);
      const outer = ['<div class="editorial">'];

      const MARKER_RE = /\[\[CARD:([a-zA-Z0-9_\-]+)\]\]/g;

      for (const rawPara of paragraphs) {
        const para = rawPara.trim();
        if (!para) continue;

        // Caso A: párrafo es exclusivamente un marcador
        const onlyMarker = para.match(/^\[\[CARD:([a-zA-Z0-9_\-]+)\]\]$/);
        if (onlyMarker) {
          const item = catalogMap.get(onlyMarker[1]);
          if (item) {
            // Cerrar editorial temporalmente para insertar la card fuera del <div class="editorial">
            outer.push('</div>');
            outer.push(this._renderInlineCard(item));
            outer.push('<div class="editorial">');
          }
          continue;
        }

        // Caso B: marcadores mezclados con texto — extraer marcadores, dejar texto
        const cardsInPara = [];
        const textPart = para.replace(MARKER_RE, (m, id) => {
          const item = catalogMap.get(id);
          if (item) cardsInPara.push(item);
          return ''; // eliminar el marcador del texto
        }).trim();

        if (textPart) {
          const safe = this._escape(textPart).replace(/\n/g, '<br>');
          outer.push(`<p>${safe}</p>`);
        }
        for (const item of cardsInPara) {
          outer.push('</div>');
          outer.push(this._renderInlineCard(item));
          outer.push('<div class="editorial">');
        }
      }

      outer.push('</div>');
      // Limpia editoriales vacías
      return outer.join('').replace(/<div class="editorial"><\/div>/g, '');
    }

    _renderInlineCard(item) {
      const type   = item.type || 'contenido';
      const title  = this._escape(item.title || '');
      const desc   = this._escape(item.shortDescription || '');
      const url    = item.actionUrl || '';
      const audio  = item.audioUrl || '';
      const eyebrow = type === 'encuentro' ? 'Encuentro de acompañamiento' :
                      (audio ? 'Podcast' : 'Contenido');

      let audioBlock = '';
      if (audio) {
        audioBlock = `<audio class="inline-audio" controls preload="metadata" src="${this._escape(audio)}"></audio>`;
      }

      let ctaBlock = '';
      if (type === 'encuentro' && url) {
        ctaBlock = this._ctaButton(item.id, type, url, 'Solicitar encuentro');
      } else if (type === 'contenido' && !audio && url) {
        ctaBlock = this._ctaButton(item.id, type, url, 'Leer contenido');
      } else if (type === 'contenido' && audio && url) {
        ctaBlock = this._ctaButton(item.id, type, url, 'Ver más');
      }

      return `
        <div class="turn-inline">
          <div class="inline-card" data-id="${this._escape(item.id)}">
            <div class="inline-eyebrow">${this._escape(eyebrow)}</div>
            <div class="inline-title">${title}</div>
            ${desc ? `<div class="inline-desc">${desc}</div>` : ''}
            ${audioBlock}
            ${ctaBlock}
          </div>
        </div>
      `;
    }

    _ctaButton(itemId, type, url, label) {
      return `<button class="inline-card-cta"
                      data-itemid="${this._escape(itemId)}"
                      data-type="${this._escape(type)}"
                      data-url="${this._escape(url)}">${this._escape(label)}</button>`;
    }

    _renderWelcome() {
      const messages = this.shadowRoot.getElementById('messages');
      if (!messages) return;
      if (this._hasMessages) return;
      if (messages.querySelector('.welcome')) return;

      const el = document.createElement('div');
      el.className = 'welcome';
      const logoUrl = this._brand.logo || '';
      const logoHtml = logoUrl
        ? `<img class="welcome-logo" src="${logoUrl}" alt="${this._escape(this._brand.name || '')}" />`
        : '';
      const betaHtml = this._brand.betaLabel
        ? ` <span class="welcome-beta">(${this._escape(this._brand.betaLabel)})</span>`
        : '';
      el.innerHTML = `
        <div class="welcome-inner">
          <div class="welcome-ornament">— ✦ —</div>
          <div class="welcome-title">${this._escape(this._brand.welcomeTitle || this._brand.name)}</div>
          ${logoHtml}
          <div class="welcome-sub">${this._escape(this._brand.welcome)}${betaHtml}</div>
        </div>
      `;
      messages.appendChild(el);
    }

    _renderChats() {
      const list = this.shadowRoot.getElementById('chatsList');
      if (!list) return;
      if (this._chats.length === 0) {
        list.innerHTML = `<div class="empty">Sin conversaciones previas</div>`;
        return;
      }
      list.innerHTML = this._chats.map(c => {
        const active = (c.id === this._sessionId) ? ' active' : '';
        return `<div class="chat-item-row${active}" data-id="${this._escape(c.id)}">
                  <button class="chat-item" data-id="${this._escape(c.id)}">
                    <div class="chat-title">${this._escape(c.titulo || 'Conversación')}</div>
                    <div class="chat-preview">${this._escape(c.preview || '')}</div>
                  </button>
                  <button class="chat-delete" data-id="${this._escape(c.id)}" data-title="${this._escape(c.titulo || 'Conversación')}" title="Borrar conversación" aria-label="Borrar conversación">🗑</button>
                </div>`;
      }).join('');

      list.querySelectorAll('.chat-item').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.id;
          this._sessionId = id;
          this._stopPolling(); // cambiar de chat detiene cualquier polling en curso
          this._emit('cathovia-open-chat', { sessionId: id });
          this._highlightActiveChat();
          if (isMobileViewport()) this._closeAllPanels();
        });
      });

      list.querySelectorAll('.chat-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.dataset.id;
          const titulo = btn.dataset.title;
          this._showDeleteConfirm(id, titulo);
        });
      });
    }

    _showDeleteConfirm(sessionId, titulo) {
      // Elimina cualquier modal previo
      const prev = this.shadowRoot.getElementById('deleteModal');
      if (prev) prev.remove();

      const modal = document.createElement('div');
      modal.className = 'modal-backdrop';
      modal.id = 'deleteModal';
      modal.innerHTML = `
        <div class="modal">
          <div class="modal-title">¿Borrar esta conversación?</div>
          <div class="modal-body">
            "${this._escape(titulo)}"
            <div class="modal-note">Esta acción no se puede deshacer.</div>
          </div>
          <div class="modal-actions">
            <button class="modal-btn modal-btn-cancel" id="modalCancel">Cancelar</button>
            <button class="modal-btn modal-btn-danger" id="modalDelete">Borrar</button>
          </div>
        </div>
      `;
      this.shadowRoot.appendChild(modal);

      const cancel = () => modal.remove();
      modal.addEventListener('click', (e) => { if (e.target === modal) cancel(); });
      modal.querySelector('#modalCancel').addEventListener('click', cancel);
      modal.querySelector('#modalDelete').addEventListener('click', () => {
        console.log(`${TAG} borrar chat sessionId=${sessionId}`);
        this._emit('cathovia-delete-chat', { sessionId });
        // Optimista: quitar del listado inmediatamente
        this._chats = this._chats.filter(c => c.id !== sessionId);
        // Si el chat borrado era el actual, resetear a nuevo chat
        if (this._sessionId === sessionId) {
          this._resetToNewChat();
        } else {
          this._renderChats();
        }
        modal.remove();
      });
    }

    _highlightActiveChat() {
      this.shadowRoot.querySelectorAll('.chat-item-row').forEach(el => {
        el.classList.toggle('active', el.dataset.id === this._sessionId);
      });
    }

    _renderCourses() {
      const el = this.shadowRoot.getElementById('coursesList');
      if (!el) return;
      if (this._courses.length === 0) {
        el.innerHTML = `<div class="empty small">Sin cursos disponibles</div>`;
        return;
      }
      el.innerHTML = this._courses.map(c => {
        const price = c.price ? `<div class="card-price">${this._escape(c.price)}</div>` : '';
        return `
          <div class="card course-card" data-id="${this._escape(c.id)}" data-url="${this._escape(c.actionUrl || '')}">
            <div class="card-eyebrow">Curso</div>
            <div class="card-title">${this._escape(c.title || 'Curso')}</div>
            ${c.shortDescription ? `<div class="card-meta">${this._escape(c.shortDescription)}</div>` : ''}
            ${price}
            <button class="card-cta">Ver curso</button>
          </div>
        `;
      }).join('');
      el.querySelectorAll('.course-card').forEach(card => {
        card.querySelector('.card-cta').addEventListener('click', () => {
          const url = card.dataset.url;
          this._emit('cathovia-course-open', { cursoId: card.dataset.id, actionUrl: url });
          if (url) { try { window.open(url, '_blank', 'noopener'); } catch (_) {} }
        });
      });
    }

    _renderEventos() {
      const el = this.shadowRoot.getElementById('eventsList');
      if (!el) return;
      if (this._eventos.length === 0) {
        el.innerHTML = `<div class="empty small">Sin eventos programados</div>`;
        return;
      }
      el.innerHTML = this._eventos.map(e => {
        const fecha = e.date ? this._formatDate(e.date) : '';
        return `
          <div class="card event-card" data-id="${this._escape(e.id)}" data-url="${this._escape(e.actionUrl || '')}">
            <div class="card-eyebrow">Evento</div>
            <div class="card-title">${this._escape(e.title || 'Evento')}</div>
            ${fecha ? `<div class="card-meta">${this._escape(fecha)}</div>` : ''}
            ${e.shortDescription ? `<div class="card-desc">${this._escape(e.shortDescription)}</div>` : ''}
            <button class="card-cta">Reservar</button>
          </div>
        `;
      }).join('');
      el.querySelectorAll('.event-card').forEach(card => {
        card.querySelector('.card-cta').addEventListener('click', () => {
          const url = card.dataset.url;
          this._emit('cathovia-event-open', { eventoId: card.dataset.id, actionUrl: url });
          if (url) { try { window.open(url, '_blank', 'noopener'); } catch (_) {} }
        });
      });
    }

    _formatDate(iso) {
      try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
             + ' · '
             + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      } catch (_) { return ''; }
    }

    _paintExpert(expert) {
      const el = this.shadowRoot.getElementById('expertBox');
      if (!el) return;
      if (!expert) { el.style.display = 'none'; return; }
      el.style.display = '';
      el.innerHTML = `
        <div class="expert-name">${this._escape(expert.nombre || '')}</div>
        ${expert.rol ? `<div class="expert-role">${this._escape(expert.rol)}</div>` : ''}
      `;
    }

    // ═════════════════════════════════════════════════════════════════════
    // TTS — Reproducir audio del backend (Gemini 3.1 Flash TTS)
    // ═════════════════════════════════════════════════════════════════════

    _onTtsButtonClick(messageId, text, btn) {
      if (!btn) btn = this.shadowRoot.querySelector(`.tts-btn[data-mid="${messageId}"]`);
      if (!btn) return;
      const state = btn.dataset.state || 'idle';

      if (state === 'playing' && this._playingMessageId === messageId) {
        this._stopTts();
        return;
      }
      if (this._playingMessageId) this._stopTts();

      this._setTtsBtnState(btn, 'loading');
      this._playingMessageId = messageId;

      const cleanText = this._sanitizeForTts(text);
      if (!cleanText) {
        this._setTtsBtnState(btn, 'idle');
        this._playingMessageId = null;
        return;
      }

      // Llamada directa al backend por HTTP (evita el truncamiento del Page Code)
      this._fetchTts(messageId, cleanText, btn);
    }

    async _fetchTts(messageId, texto, btn) {
      try {
        const res = await fetch('/_functions/egaelTts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texto: texto, cursoId: this._cursoId })
        });
        if (!res.ok) {
          console.warn(`${TAG} egaelTts HTTP ${res.status}`);
          this._applyTtsError({ messageId, error: `HTTP ${res.status}` });
          return;
        }
        const data = await res.json();
        if (!data.ok || !data.audioContent) {
          console.warn(`${TAG} egaelTts respuesta sin audio:`, data.error);
          this._applyTtsError({ messageId, error: data.error || 'sin audio' });
          return;
        }
        console.log(`${TAG} egaelTts OK ${data.timeMs}ms voice=${data.voice} audioLen=${data.audioContent.length}`);
        this._applyTtsAudio({
          messageId,
          audioContent: data.audioContent,
          mimeType: data.mimeType || 'audio/mpeg'
        });
      } catch (err) {
        console.error(`${TAG} egaelTts EXCEPTION:`, err.message || err);
        this._applyTtsError({ messageId, error: err.message || 'error de red' });
      }
    }

    // Método público llamable desde el Page Code (bypass del setAttribute
    // que Wix Velo trunca con payloads grandes).
    receiveTtsAudio(payload) {
      console.log(`${TAG} receiveTtsAudio mid=${payload && payload.messageId} audioLen=${payload && payload.audioContent ? payload.audioContent.length : 0}`);
      this._applyTtsAudio(payload || {});
    }

    receiveTtsError(payload) {
      console.log(`${TAG} receiveTtsError mid=${payload && payload.messageId} error=${payload && payload.error}`);
      this._applyTtsError(payload || {});
    }

    _applyTtsAudio(payload) {
      const { messageId, audioContent, mimeType } = payload || {};
      if (!messageId || !audioContent) return;
      if (messageId !== this._playingMessageId) return; // llegó tarde, ignorar
      this._playAudioBase64(audioContent, mimeType || 'audio/wav', messageId);
    }

    _applyTtsError(payload) {
      const { messageId, error } = payload || {};
      console.warn(`${TAG} TTS error mid=${messageId}: ${error}`);
      if (messageId === this._playingMessageId) {
        const btn = this.shadowRoot.querySelector(`.tts-btn[data-mid="${messageId}"]`);
        if (btn) this._setTtsBtnState(btn, 'idle');
        this._playingMessageId = null;
      }
    }

    _playAudioBase64(base64, mimeType, messageId) {
      // Reutilizar el mismo <audio> para no acumular
      if (!this._audioEl) {
        this._audioEl = new Audio();
      }
      const audio = this._audioEl;
      audio.pause();
      audio.currentTime = 0;

      const dataUri = `data:${mimeType};base64,${base64}`;
      audio.src = dataUri;

      const btn = this.shadowRoot.querySelector(`.tts-btn[data-mid="${messageId}"]`);
      if (btn) this._setTtsBtnState(btn, 'playing');

      audio.onended = () => {
        const b = this.shadowRoot.querySelector(`.tts-btn[data-mid="${messageId}"]`);
        if (b) this._setTtsBtnState(b, 'idle');
        this._playingMessageId = null;
      };
      audio.onerror = () => {
        console.warn(`${TAG} audio playback error`);
        const b = this.shadowRoot.querySelector(`.tts-btn[data-mid="${messageId}"]`);
        if (b) this._setTtsBtnState(b, 'idle');
        this._playingMessageId = null;
      };

      audio.play().catch(err => {
        console.warn(`${TAG} audio.play() rechazado:`, err.message);
        const b = this.shadowRoot.querySelector(`.tts-btn[data-mid="${messageId}"]`);
        if (b) this._setTtsBtnState(b, 'idle');
        this._playingMessageId = null;
      });
    }

    _stopTts() {
      if (this._audioEl) {
        try { this._audioEl.pause(); this._audioEl.currentTime = 0; } catch (_) {}
      }
      if (this._playingMessageId) {
        const btn = this.shadowRoot.querySelector(`.tts-btn[data-mid="${this._playingMessageId}"]`);
        if (btn) this._setTtsBtnState(btn, 'idle');
      }
      this._playingMessageId = null;
    }

    _setTtsBtnState(btn, state) {
      if (!btn) return;
      btn.dataset.state = state;
      const icon = btn.querySelector('.tts-icon');
      const label = btn.querySelector('.tts-label');
      if (state === 'idle')    { if (icon) icon.textContent = '🔊'; if (label) label.textContent = 'Escuchar'; }
      if (state === 'loading') { if (icon) icon.textContent = '⏳'; if (label) label.textContent = 'Preparando'; }
      if (state === 'playing') { if (icon) icon.textContent = '⏸'; if (label) label.textContent = 'Parar'; }
    }

    _sanitizeForTts(text) {
      let t = String(text || '');
      // Quitar marcadores de card
      t = t.replace(/\[\[CARD:[a-zA-Z0-9_\-]+\]\]/g, '');
      // Markdown básico
      t = t.replace(/\*\*(.+?)\*\*/g, '$1');
      t = t.replace(/^#{1,6}\s+/gm, '');
      t = t.replace(/^-{3,}$/gm, '');
      t = t.replace(/\*(.+?)\*/g, '$1');
      t = t.replace(/\n{3,}/g, '\n\n').trim();
      return t;
    }

    _toggleTtsAutoPlay() {
      this._ttsAutoPlay = !this._ttsAutoPlay;
      this._writeLS(LS_TTS_AUTO, this._ttsAutoPlay);
      this._updateTtsToggleUI();
    }

    _updateTtsToggleUI() {
      const btn = this.shadowRoot.getElementById('btnToggleTts');
      if (!btn) return;
      btn.textContent = this._ttsAutoPlay ? '🔊' : '🔇';
      btn.title = this._ttsAutoPlay ? 'Voz automática activada' : 'Voz automática desactivada';
    }

    // ═════════════════════════════════════════════════════════════════════
    // MICRÓFONO (portado de EGAEL +50 v1.0)
    // ═════════════════════════════════════════════════════════════════════

    _setupMic() {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) {
        const b = this.shadowRoot.getElementById('micBtn');
        if (b) b.style.display = 'none';
        console.log(`${TAG} SpeechRecognition no disponible en este navegador`);
        return;
      }
      this._SR = SR;
      console.log(`${TAG} Micrófono disponible (SpeechRecognition)`);
    }

    _clearSilenceTimer() { if (this._silenceTimer) { clearTimeout(this._silenceTimer); this._silenceTimer = null; } }
    _clearSafetyTimer()  { if (this._safetyTimer)  { clearTimeout(this._safetyTimer);  this._safetyTimer  = null; } }
    _armSilenceTimer() {
      this._clearSilenceTimer();
      this._silenceTimer = setTimeout(() => { this._micStoppingForSend = true; this._stopMic(); }, SILENCE_MS);
    }
    _armSafetyTimer() {
      this._clearSafetyTimer();
      this._safetyTimer = setTimeout(() => { this._micStoppingForSend = true; this._stopMic(); }, SAFETY_MS);
    }

    _toggleMic() {
      if (this._isListening) this._stopMic();
      else this._startMic();
    }

    _stopMic() {
      this._clearSilenceTimer();
      this._clearSafetyTimer();
      if (this._recognition) { try { this._recognition.stop(); } catch (_) {} }
    }

    _setMicState(state) {
      const btn = this.shadowRoot.getElementById('micBtn');
      if (!btn) return;
      btn.classList.remove('listening', 'idle', 'preparing');
      btn.classList.add(state);
    }

    _startMic() {
      if (!this._SR || this._pending) return;
      this._stopTts(); // no queremos que el TTS interfiera con el mic
      const input = this.shadowRoot.getElementById('chatInput');
      input.value = '';
      if (IS_ANDROID) {
        this._androidFinalBuffer = '';
        this._startAndroidSession(input);
      } else {
        this._startStandardSession(input);
      }
    }

    _startAndroidSession(input) {
      try { this._recognition = new this._SR(); }
      catch (e) { console.warn(`${TAG} SR init error:`, e.message); return; }
      this._recognition.lang = 'es-ES';
      this._recognition.interimResults = false;
      this._recognition.continuous = false;
      this._recognition.maxAlternatives = 1;

      this._recognition.onstart = () => {
        this._isListening = true;
        this._setMicState('preparing');
        input.placeholder = 'Preparando micrófono…';
        this._armSafetyTimer();
      };
      this._recognition.onaudiostart = () => {
        this._setMicState('listening');
        input.placeholder = this._androidFinalBuffer ? 'Sigue hablando…' : 'Te escucho — habla con normalidad';
        if (navigator.vibrate) { try { navigator.vibrate(50); } catch (_) {} }
      };
      this._recognition.onresult = (event) => {
        this._clearSafetyTimer();
        const result = event.results[0];
        if (result && result.isFinal) {
          const transcript = result[0].transcript.trim();
          if (transcript) {
            this._androidFinalBuffer += (this._androidFinalBuffer ? ' ' : '') + transcript;
            input.value = this._androidFinalBuffer;
            this._armSilenceTimer();
          }
        }
      };
      this._recognition.onerror = (event) => {
        this._clearSilenceTimer(); this._clearSafetyTimer();
        this._isListening = false; this._setMicState('idle');
        input.placeholder = this._brand.placeholder;
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          this._appendError('Permiso de micrófono denegado. Actívalo en los ajustes del navegador.');
        } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.warn(`${TAG} Mic error: ${event.error}`);
        }
      };
      this._recognition.onend = () => {
        this._clearSafetyTimer();
        this._isListening = false; this._setMicState('idle');
        this._micStoppingForSend = false;
        const text = this._androidFinalBuffer.trim();
        this._androidFinalBuffer = '';
        if (!text) { input.placeholder = this._brand.placeholder; return; }
        input.value = text;
        this._sendQuery(text);
        input.value = '';
      };
      try { this._recognition.start(); }
      catch (e) { this._setMicState('idle'); input.placeholder = this._brand.placeholder; }
    }

    _startStandardSession(input) {
      try { this._recognition = new this._SR(); }
      catch (e) { console.warn(`${TAG} SR init error:`, e.message); return; }
      this._recognition.lang = 'es-ES';
      this._recognition.interimResults = true;
      this._recognition.continuous = true;
      this._recognition.maxAlternatives = 1;
      this._lastFinalTranscript = '';

      this._recognition.onstart = () => {
        this._isListening = true; this._setMicState('preparing');
        input.placeholder = 'Preparando micrófono…'; this._armSafetyTimer();
      };
      this._recognition.onaudiostart = () => {
        this._setMicState('listening');
        input.placeholder = 'Te escucho — habla con normalidad';
        if (navigator.vibrate) { try { navigator.vibrate(50); } catch (_) {} }
      };
      this._recognition.onresult = (event) => {
        this._clearSafetyTimer();
        let finalText = '', interimText = '';
        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalText += transcript;
          else interimText += transcript;
        }
        input.value = (finalText + interimText).trim();
        const hadNewFinal = finalText !== this._lastFinalTranscript;
        if (hadNewFinal && finalText) { this._lastFinalTranscript = finalText; this._armSilenceTimer(); }
        else if (!hadNewFinal && interimText) { this._clearSilenceTimer(); }
      };
      this._recognition.onerror = (event) => {
        this._clearSilenceTimer(); this._clearSafetyTimer();
        this._isListening = false; this._setMicState('idle');
        input.placeholder = this._brand.placeholder;
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          this._appendError('Permiso de micrófono denegado. Actívalo en los ajustes del navegador.');
        } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.warn(`${TAG} Mic error: ${event.error}`);
        }
      };
      this._recognition.onend = () => {
        this._clearSafetyTimer();
        this._isListening = false; this._setMicState('idle');
        const text = (input.value || '').trim();
        if (!text) { input.placeholder = this._brand.placeholder; return; }
        this._sendQuery(text);
        input.value = '';
      };
      try { this._recognition.start(); }
      catch (e) { this._setMicState('idle'); input.placeholder = this._brand.placeholder; }
    }

    _emit(name, detail) {
      this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
    }
    _escape(s) {
      return String(s == null ? '' : s)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    }
    _readLS(key, fallback) {
      try { const v = localStorage.getItem(key); if (v === null) return fallback; return v === '1'; }
      catch (_) { return fallback; }
    }
    _writeLS(key, val) { try { localStorage.setItem(key, val ? '1' : '0'); } catch (_) { } }

    _render() {
      const c = this._colors;
      const b = this._brand;
      const sidebarClass = this._sidebarOpen ? ' sidebar-open' : '';
      const panelClass   = this._panelOpen   ? ' panel-open'   : '';

      this.shadowRoot.innerHTML = `
<style>
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Manrope:wght@400;500;600;700&display=swap');

  :host {
    display: block;
    width: 100%;
    /* v1.6.4: NO heredar altura del contenedor de Wix.
       Wix declara #egaelConsole a 753px en el editor pero el runtime infla el
       wrapper (#comp-mrcg3n71) a ~1796px midiendo el contenido inicial. Medido
       en produccion: custom element rect=1796px, section padre=1820px.
       Con height:100% la consola obedecia esos 1796px y el input quedaba fuera
       de pantalla. Anclamos a la ventana: dvh respeta las barras del navegador
       en movil. El bloque @media movil ya hacia esto y por eso alli funcionaba. */
    height: 100vh;
    height: 100dvh;
    max-height: 100vh;
    max-height: 100dvh;
    min-height: 0;
    font-family: ${b.fontBody};
    color: ${c.ink};
    background: ${c.bg};
    --bg: ${c.bg};
    --surface: ${c.surface};
    --card: ${c.card};
    --ink: ${c.ink};
    --ink-soft: ${c.inkSoft};
    --muted: ${c.muted};
    --hairline: ${c.hairline};
    --accent: ${c.accent};
    --accent-ink: ${c.accentInk};
    --font-title: ${b.fontTitle};
    --font-body: ${b.fontBody};
  }
  * { box-sizing: border-box; }
  ::selection { background: var(--accent); color: var(--accent-ink); }

  .app {
    display: flex;
    flex-direction: column;
    height: 100%;
    max-height: 100%;
    min-height: 0;
    background: var(--bg);
    overflow: hidden;
  }

  .layout {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: 0 1fr 0;
    grid-template-rows: auto 1fr;
    grid-template-areas: "topbar topbar topbar" "sidebar main panel";
    background: var(--bg);
    transition: grid-template-columns .22s ease;
    position: relative;
  }
  .layout.sidebar-open { grid-template-columns: 280px 1fr 0; }
  .layout.panel-open   { grid-template-columns: 0 1fr 320px; }
  .layout.sidebar-open.panel-open { grid-template-columns: 280px 1fr 320px; }

  /* TOPBAR */
  .topbar {
    grid-area: topbar;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 18px;
    background: var(--surface);
    border-bottom: 1px solid var(--hairline);
    min-height: 56px;
  }
  .tb-btn {
    display: inline-flex; align-items: center; justify-content: center;
    width: 36px; height: 36px;
    border-radius: 8px;
    border: 1px solid var(--hairline);
    background: var(--surface);
    color: var(--ink);
    cursor: pointer;
    font-size: 16px;
    flex-shrink: 0;
    transition: background .15s, border-color .15s;
  }
  .tb-btn:hover { background: var(--bg); border-color: var(--ink-soft); }
  .tb-beta {
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }
  .tb-beta > span {
    font-family: var(--font-body);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 1.8px;
    text-transform: uppercase;
    color: var(--muted);
    background: var(--bg);
    border: 1px solid var(--hairline);
    padding: 4px 10px 3px;
    border-radius: 999px;
    line-height: 1;
    white-space: nowrap;
  }
  .tb-brand {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    line-height: 1.1;
    min-width: 0;
    text-align: center;
  }
  /* Logo: CSS deliberadamente minimo. Cualquier background/border/filter
     aqui reintroduce el marco blanco que se quiere evitar. */
  .tb-logo {
    height: 30px;
    width: auto;
    display: block;
    background: none;
    border: 0;
    box-shadow: none;
    filter: none;
    max-width: 100%;
    object-fit: contain;
  }
  .tb-title {
    font-family: var(--font-title);
    font-size: 22px;
    font-weight: 400;
    letter-spacing: .3px;
    color: var(--ink);
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .tb-sub {
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: var(--muted);
    margin-top: 2px;
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ERROR BANNER */
  .error-banner {
    display: none;
    align-items: center;
    gap: 10px;
    padding: 10px 16px;
    background: #7a1a1a;
    color: #ffe8e8;
    font-size: 13px;
    border-bottom: 1px solid #5a1010;
  }
  .error-banner .eb-icon {
    font-weight: bold;
    background: rgba(255,255,255,.15);
    width: 20px; height: 20px;
    border-radius: 50%;
    display: inline-flex; align-items: center; justify-content: center;
    font-size: 12px;
  }
  .error-banner .eb-text { flex: 1; }
  .error-banner .eb-close {
    background: transparent; border: 1px solid rgba(255,255,255,.3);
    color: #ffe8e8; width: 24px; height: 24px; border-radius: 4px;
    cursor: pointer;
  }

  /* SIDEBAR */
  .sidebar {
    grid-area: sidebar;
    background: var(--bg);
    border-right: 1px solid var(--hairline);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
  }
  .sb-head {
    padding: 16px 16px 12px;
    border-bottom: 1px solid var(--hairline);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .sb-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--muted);
  }
  .sb-head-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .sb-new {
    background: var(--accent);
    color: var(--accent-ink);
    border: none;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    font-family: var(--font-body);
  }
  .sb-new:hover { filter: brightness(1.12); }

  /* Botón X de cerrar overlay móvil — oculto en desktop */
  .mobile-close {
    display: none;
    background: transparent;
    border: 1px solid var(--hairline);
    color: var(--muted);
    width: 32px; height: 32px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    align-items: center;
    justify-content: center;
    line-height: 1;
    padding: 0;
    flex-shrink: 0;
  }
  .mobile-close:hover { background: var(--surface); color: var(--ink); border-color: var(--ink-soft); }
  .panel-close-row {
    display: none;
    justify-content: flex-end;
    padding: 12px 14px 0 14px;
  }
  .chats-list { flex: 1; overflow-y: auto; padding: 8px; }
  .chat-item-row {
    display: flex;
    align-items: stretch;
    gap: 2px;
    border-radius: 8px;
    margin-bottom: 2px;
    transition: background .12s;
  }
  .chat-item-row:hover { background: var(--surface); }
  .chat-item-row.active {
    background: var(--surface);
    border-left: 2px solid var(--accent);
  }
  .chat-item {
    flex: 1;
    min-width: 0;
    text-align: left;
    background: transparent;
    border: none;
    padding: 10px 8px 10px 12px;
    cursor: pointer;
    font-family: var(--font-body);
    color: var(--ink);
    border-radius: 8px 0 0 8px;
  }
  .chat-item-row.active .chat-item { padding-left: 10px; }
  .chat-delete {
    background: transparent;
    border: none;
    color: var(--muted);
    cursor: pointer;
    padding: 0 10px;
    font-size: 14px;
    opacity: 0;
    transition: opacity .12s, color .12s;
    border-radius: 0 8px 8px 0;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }
  .chat-item-row:hover .chat-delete { opacity: 0.7; }
  .chat-delete:hover { opacity: 1 !important; color: #a03030; background: rgba(160,48,48,.08); }
  .chat-title {
    font-size: 13px; font-weight: 500;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .chat-preview {
    font-size: 11px; color: var(--muted);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    margin-top: 2px;
  }

  /* MODAL confirmación */
  .modal-backdrop {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(31, 36, 48, .5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    animation: fadeIn .18s ease;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .modal {
    background: var(--card);
    border-radius: 14px;
    padding: 24px 22px 18px;
    max-width: 380px;
    width: calc(100% - 40px);
    box-shadow: 0 10px 40px rgba(0,0,0,.25);
    font-family: var(--font-body);
    animation: modalRise .22s ease;
  }
  @keyframes modalRise {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .modal-title {
    font-family: var(--font-title);
    font-size: 20px;
    color: var(--ink);
    margin-bottom: 8px;
    font-weight: 400;
  }
  .modal-body {
    font-size: 14px;
    color: var(--ink-soft);
    line-height: 1.5;
    margin-bottom: 20px;
  }
  .modal-note {
    font-size: 12px;
    color: var(--muted);
    margin-top: 8px;
    font-style: italic;
  }
  .modal-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }
  .modal-btn {
    padding: 9px 18px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: var(--font-body);
    border: 1px solid var(--hairline);
    background: transparent;
    color: var(--ink);
    transition: background .15s;
  }
  .modal-btn-cancel:hover { background: var(--surface); }
  .modal-btn-danger {
    background: #a03030;
    color: white;
    border-color: #a03030;
  }
  .modal-btn-danger:hover { background: #8a2525; }
  .empty { padding: 24px 12px; text-align: center; color: var(--muted); font-size: 13px; font-style: italic; }
  .empty.small { padding: 12px 8px; font-size: 12px; }

  /* MAIN CHAT */
  .main {
    grid-area: main;
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    background: var(--surface);
    box-shadow: inset 0 4px 12px -8px rgba(0,0,0,.06);
  }
  .messages {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 40px max(28px, calc((100% - 780px) / 2)) 24px;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    gap: 28px;
    scroll-behavior: smooth;
  }
  .messages::-webkit-scrollbar { width: 8px; }
  .messages::-webkit-scrollbar-thumb { background: var(--hairline); border-radius: 4px; }
  .messages::-webkit-scrollbar-track { background: transparent; }

  .welcome {
    margin: 0;
    padding: 48px 20px 20px;
    text-align: center;
    flex-shrink: 0;
  }
  .welcome-inner { max-width: 540px; margin: 0 auto; }
  .welcome-ornament {
    font-family: var(--font-title);
    color: var(--muted);
    font-size: 18px;
    letter-spacing: 6px;
    margin-bottom: 22px;
  }
  .welcome-title {
    font-family: var(--font-title);
    font-size: 46px;
    line-height: 1.1;
    color: var(--ink);
    margin-bottom: 14px;
    font-weight: 400;
    letter-spacing: -.3px;
  }
  .welcome-logo {
    display: block;
    height: 64px;
    width: auto;
    margin: 0 auto 24px;
    max-width: 90%;
  }
  .welcome-sub {
    font-family: var(--font-title);
    font-style: italic;
    color: var(--ink-soft);
    font-size: 19px;
    line-height: 1.55;
  }
  .welcome-beta {
    display: none;
    color: var(--muted);
    font-size: 0.75em;
    font-style: italic;
    letter-spacing: .3px;
  }

  .turn { display: flex; animation: fadeUp .35s ease both; }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .turn-user { justify-content: flex-end; }
  .turn-user .bubble {
    max-width: 78%;
    background: var(--accent);
    color: var(--accent-ink);
    padding: 12px 16px;
    border-radius: 16px 16px 4px 16px;
    font-family: var(--font-body);
    font-size: 15px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-wrap: break-word;
    box-shadow: 0 1px 2px rgba(0,0,0,.08);
  }

  .turn-ai { justify-content: flex-start; flex-direction: column; }
  .turn-ai .editorial {
    max-width: 100%;
    font-family: var(--font-title);
    font-size: 19px;
    line-height: 1.7;
    color: var(--ink);
    letter-spacing: .1px;
    padding-left: 4px;
  }
  .turn-ai .editorial p { margin: 0 0 14px 0; }
  .turn-ai .editorial p:last-child { margin-bottom: 0; }
  .turn-ai .editorial p:first-child::first-letter {
    font-size: 1.1em;
    font-weight: 500;
  }

  /* ═══ INLINE CARDS ═══ */
  .turn-inline {
    display: flex;
    justify-content: flex-start;
    margin: 6px 0 6px 0;
    animation: fadeUp .35s ease both;
  }
  .inline-card {
    max-width: 92%;
    background: var(--card);
    border: 1px solid var(--hairline);
    border-radius: 14px;
    padding: 16px 18px;
    box-shadow: 0 2px 10px rgba(31,36,48,.05);
    font-family: var(--font-body);
  }
  .inline-eyebrow {
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--accent);
    margin-bottom: 6px;
    font-weight: 600;
  }
  .inline-title {
    font-family: var(--font-title);
    font-size: 21px;
    line-height: 1.25;
    color: var(--ink);
    margin-bottom: 6px;
    font-weight: 400;
  }
  .inline-desc {
    font-size: 13.5px;
    line-height: 1.55;
    color: var(--ink-soft);
    margin-bottom: 12px;
  }
  .inline-audio {
    width: 100%;
    margin: 4px 0 10px 0;
    display: block;
    border-radius: 8px;
    outline: none;
  }
  .inline-card-cta {
    background: var(--accent);
    color: var(--accent-ink);
    border: none;
    padding: 9px 16px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: var(--font-body);
    letter-spacing: .2px;
    transition: filter .15s, transform .1s;
  }
  .inline-card-cta:hover { filter: brightness(1.12); }
  .inline-card-cta:active { transform: scale(.97); }

  .turn-error { justify-content: center; }
  .turn-error .err-box {
    display: flex; align-items: center; gap: 10px;
    background: #fdecec; color: #7a1a1a;
    padding: 10px 14px; border-radius: 10px;
    font-size: 13px; max-width: 90%;
    border: 1px solid #f5c8c8;
  }
  /* Variante con botón Reintentar (v1.6.0) */
  .turn-error .err-box-retry {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    padding: 12px 14px;
    max-width: 92%;
  }
  .turn-error .err-box-retry .err-body {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .turn-error .err-box-retry .err-text {
    flex: 1;
    line-height: 1.4;
  }
  .turn-error .err-retry-btn {
    align-self: flex-end;
    background: #7a1a1a;
    color: #ffe8e8;
    border: none;
    padding: 7px 14px;
    border-radius: 6px;
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    font-family: var(--font-body);
    letter-spacing: .2px;
    transition: background .15s, transform .1s;
  }
  .turn-error .err-retry-btn:hover { background: #5a1010; }
  .turn-error .err-retry-btn:active { transform: scale(.97); }
  .turn-error .err-icon {
    display: inline-flex; align-items: center; justify-content: center;
    width: 20px; height: 20px;
    background: #7a1a1a; color: white;
    border-radius: 50%; font-weight: bold; font-size: 12px;
    flex-shrink: 0;
  }

  .turn-thinking .thinking {
    display: flex; align-items: center; gap: 12px;
    padding-left: 4px;
    color: var(--muted);
    font-family: var(--font-title);
    font-style: italic;
    font-size: 16px;
  }
  .thinking-dots { display: inline-flex; gap: 5px; }
  .thinking-dots span {
    width: 7px; height: 7px;
    background: var(--muted); border-radius: 50%;
    animation: pulse 1.3s infinite ease-in-out;
  }
  .thinking-dots span:nth-child(2) { animation-delay: .2s; }
  .thinking-dots span:nth-child(3) { animation-delay: .4s; }
  @keyframes pulse {
    0%, 80%, 100% { opacity: .25; transform: scale(.85); }
    40% { opacity: 1; transform: scale(1); }
  }

  /* INPUT AREA */
  .input-area {
    padding: 14px max(28px, calc((100% - 780px) / 2)) 22px;
    background: var(--surface);
    border-top: 1px solid var(--hairline);
  }
  .input-disclaimer {
    font-family: var(--font-body);
    font-size: 11px;
    color: var(--muted);
    text-align: center;
    margin-top: 10px;
    line-height: 1.4;
    letter-spacing: .1px;
  }
  .input-box {
    background: #FFFFFF;
    border: 1px solid var(--hairline);
    border-radius: 16px;
    padding: 10px 10px 10px 18px;
    display: flex;
    align-items: flex-end;
    gap: 10px;
    transition: border-color .15s, box-shadow .15s;
    box-shadow: 0 2px 8px rgba(31, 36, 48, .04);
  }
  .input-box:focus-within {
    border-color: var(--ink-soft);
    box-shadow: 0 4px 16px rgba(31, 36, 48, .08);
  }
  .input-ta {
    flex: 1;
    border: none; outline: none; resize: none;
    background: transparent;
    color: var(--ink);
    font-family: var(--font-body);
    font-size: 15px;
    line-height: 1.55;
    padding: 9px 4px;
    max-height: 180px;
    min-height: 24px;
    overflow-y: auto;
  }
  .input-ta::placeholder {
    color: var(--muted);
    font-style: italic;
    font-family: var(--font-title);
    font-size: 16px;
  }
  .send-btn {
    background: var(--accent);
    color: var(--accent-ink);
    border: none;
    width: 40px; height: 40px;
    border-radius: 12px;
    cursor: pointer;
    font-size: 17px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    transition: transform .1s, filter .15s;
  }
  .send-btn:hover { filter: brightness(1.12); }
  .send-btn:active { transform: scale(.95); }

  /* ═══ BOTÓN MICRÓFONO ═══ */
  .mic-btn {
    background: transparent;
    color: var(--muted);
    border: 1px solid var(--hairline);
    width: 40px; height: 40px;
    border-radius: 12px;
    cursor: pointer;
    font-size: 17px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    transition: background .15s, color .15s, border-color .15s, transform .1s;
  }
  .mic-btn:hover { background: var(--bg); color: var(--ink); border-color: var(--ink-soft); }
  .mic-btn.preparing {
    background: #fef3c7;
    color: #92400e;
    border-color: #fbbf24;
    animation: micPulse 1s ease-in-out infinite;
  }
  .mic-btn.listening {
    background: #dc2626;
    color: white;
    border-color: #dc2626;
    animation: micPulse .8s ease-in-out infinite;
  }
  @keyframes micPulse {
    0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(220, 38, 38, .4); }
    50% { transform: scale(1.05); box-shadow: 0 0 0 6px rgba(220, 38, 38, 0); }
  }

  /* ═══ BOTÓN ESCUCHAR (TTS) ═══ */
  .tts-row {
    display: flex;
    justify-content: flex-start;
    margin-top: 8px;
    padding-left: 4px;
  }
  .tts-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: transparent;
    color: var(--muted);
    border: 1px solid var(--hairline);
    padding: 5px 12px;
    border-radius: 20px;
    cursor: pointer;
    font-size: 12px;
    font-family: var(--font-body);
    transition: background .15s, color .15s, border-color .15s;
  }
  .tts-btn:hover {
    background: var(--surface);
    color: var(--ink);
    border-color: var(--ink-soft);
  }
  .tts-btn[data-state="loading"] {
    color: var(--ink-soft);
    cursor: default;
  }
  .tts-btn[data-state="playing"] {
    background: var(--accent);
    color: var(--accent-ink);
    border-color: var(--accent);
  }
  .tts-btn[data-state="playing"]:hover {
    filter: brightness(1.12);
  }
  .tts-icon { font-size: 13px; }
  .tts-label { font-weight: 500; letter-spacing: .1px; }

  /* PANEL DERECHA */
  .panel {
    grid-area: panel;
    background: var(--bg);
    border-left: 1px solid var(--hairline);
    overflow-y: auto;
    min-width: 0;
  }
  .panel-section {
    padding: 18px 16px;
    border-bottom: 1px solid var(--hairline);
  }
  .panel-section:last-child { border-bottom: none; }
  .panel-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
  .panel-title {
    font-family: var(--font-title);
    font-size: 17px;
    font-weight: 400;
    letter-spacing: .3px;
  }
  .panel-refresh {
    background: transparent; border: none;
    color: var(--muted);
    cursor: pointer;
    font-size: 14px;
    padding: 4px 6px;
    border-radius: 4px;
  }
  .panel-refresh:hover { background: var(--surface); color: var(--ink); }
  #expertBox {
    padding: 18px 16px;
    border-bottom: 1px solid var(--hairline);
  }
  .expert-name {
    font-family: var(--font-title);
    font-size: 17px;
    font-weight: 400;
    margin-bottom: 2px;
  }
  .expert-role { font-size: 12px; color: var(--muted); }
  .card {
    background: var(--card);
    border: 1px solid var(--hairline);
    border-radius: 10px;
    padding: 12px 13px;
    margin-bottom: 10px;
  }
  .card:last-child { margin-bottom: 0; }
  .card-eyebrow {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    color: var(--muted);
    margin-bottom: 4px;
  }
  .card-title {
    font-family: var(--font-title);
    font-size: 15px;
    font-weight: 400;
    margin-bottom: 4px;
    color: var(--ink);
    line-height: 1.3;
  }
  .card-meta { font-size: 12px; color: var(--muted); margin-bottom: 6px; line-height: 1.4; }
  .card-desc { font-size: 12px; color: var(--ink-soft); margin-bottom: 8px; line-height: 1.45; }
  .card-price { font-size: 13px; color: var(--ink); margin-bottom: 8px; font-weight: 500; }
  .card-cta {
    background: transparent;
    color: var(--accent);
    border: 1px solid var(--accent);
    padding: 6px 14px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    font-family: var(--font-body);
  }
  .card-cta:hover { background: var(--accent); color: var(--accent-ink); }

  .backdrop {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(31, 36, 48, .35);
    z-index: 9;
    opacity: 0;
    pointer-events: none;
    transition: opacity .22s ease;
  }

  /* MÓVIL */
  @media (max-width: 900px) {
    .app {
      height: 100vh;
      height: 100dvh;
      max-height: 100vh;
      max-height: 100dvh;
    }
    .layout {
      grid-template-columns: 1fr !important;
      grid-template-areas: "topbar" "main" !important;
      grid-template-rows: auto 1fr;
      min-height: 0;
      overflow: hidden;
    }
    .topbar {
      position: sticky;
      top: 0;
      z-index: 20;
      padding: 8px 12px;
      min-height: 52px;
      gap: 8px;
    }
    .tb-logo { height: 26px; }
    .main { min-height: 0; overflow: hidden; }
    .messages { -webkit-overflow-scrolling: touch; }
    .tb-btn { width: 34px; height: 34px; font-size: 15px; }
    .tb-title { font-size: 19px; }
    .tb-sub { font-size: 9.5px; letter-spacing: 1.5px; margin-top: 1px; }
    .tb-beta > span { font-size: 9px; letter-spacing: 1.4px; padding: 3px 8px 2px; }

    .sidebar, .panel {
      position: fixed;
      top: 52px;
      bottom: 0;
      z-index: 10;
      width: 88%;
      max-width: 320px;
      transform: translateX(-100%);
      transition: transform .25s ease;
      box-shadow: 0 0 40px rgba(0,0,0,.18);
    }
    .sidebar { left: 0; border-right: 1px solid var(--hairline); }
    .panel   {
      right: 0;
      transform: translateX(100%);
      border-left: 1px solid var(--hairline);
      border-right: none;
    }
    .layout.sidebar-open .sidebar { transform: translateX(0); }
    .layout.panel-open   .panel   { transform: translateX(0); }

    .layout.sidebar-open .backdrop,
    .layout.panel-open   .backdrop {
      opacity: 1;
      pointer-events: auto;
    }

    .mobile-close { display: inline-flex; }
    .panel-close-row { display: flex; }

    /* Papelera siempre visible en móvil (no hay hover) */
    .chat-delete { opacity: 0.6; padding: 0 14px; font-size: 15px; }
    .chat-item-row .chat-delete { opacity: 0.6; }

    /* Modal responsive */
    .modal { padding: 22px 20px 16px; max-width: 340px; }
    .modal-title { font-size: 19px; }

    .main { grid-area: main; box-shadow: none; }
    .messages { padding: 24px 18px; gap: 22px; }
    .input-area { padding: 12px 14px 16px; }
    .input-disclaimer { font-size: 10.5px; margin-top: 8px; }
    .input-box { padding: 8px 8px 8px 14px; border-radius: 14px; }
    .send-btn { width: 38px; height: 38px; }
    .mic-btn { width: 38px; height: 38px; font-size: 16px; }
    .input-ta { font-size: 16px; padding: 8px 4px; }
    .input-ta::placeholder { font-size: 15px; }

    .tts-btn { font-size: 11.5px; padding: 4px 10px; }

    .turn-user .bubble { max-width: 85%; font-size: 15px; padding: 11px 14px; }
    .turn-ai .editorial { font-size: 17px; line-height: 1.65; }

    .inline-card { max-width: 100%; padding: 14px 15px; border-radius: 12px; }
    .inline-title { font-size: 19px; }
    .inline-desc { font-size: 13px; }
    .inline-audio { margin: 4px 0 12px 0; }

    /* Error box en móvil: retry-btn a ancho completo */
    .turn-error .err-box-retry { max-width: 96%; padding: 11px 12px; }
    .turn-error .err-retry-btn { align-self: stretch; padding: 9px 14px; font-size: 13px; }

    .welcome { padding: 40px 16px; }
    .welcome-ornament { font-size: 15px; letter-spacing: 5px; margin-bottom: 16px; }
    .welcome-title { font-size: 34px; margin-bottom: 10px; }
    .welcome-logo { height: 48px; margin: 0 auto 18px; }
    .welcome-sub { font-size: 17px; line-height: 1.5; }
  }

  @media (max-width: 420px) {
    .topbar { padding: 8px 10px; gap: 6px; }
    .tb-logo { height: 22px; }
    .tb-title { font-size: 17px; }
    .tb-sub { font-size: 9px; }
    .messages { padding: 20px 14px; gap: 18px; }
    .input-area { padding: 10px 12px 14px; }
    .input-disclaimer { font-size: 10px; margin-top: 7px; }
    .tb-beta { display: none; }
    .welcome-beta { display: inline; }
    .welcome { padding: 32px 12px; }
    .welcome-title { font-size: 28px; margin-bottom: 8px; }
    .welcome-logo { height: 40px; margin: 0 auto 14px; }
    .welcome-sub { font-size: 15.5px; }
    .turn-ai .editorial { font-size: 16px; }
    .turn-user .bubble { font-size: 14.5px; }
    .inline-title { font-size: 18px; }
    .sidebar, .panel { width: 92%; }
  }
</style>

<div class="app">

  <div class="error-banner" id="errorBanner">
    <span class="eb-icon">!</span>
    <span class="eb-text" id="errorBannerText"></span>
    <button class="eb-close" id="closeErrorBanner">✕</button>
  </div>

  <div class="layout${sidebarClass}${panelClass}" id="layout">

    <div class="topbar">
      <button class="tb-btn" id="btnToggleSidebar" title="Historial">☰</button>
      ${b.betaLabel ? `<div class="tb-beta" title="${this._escape(b.betaLabel)}"><span>${this._escape(b.betaLabel)}</span></div>` : ''}
      <div class="tb-brand">
        ${b.logo
          ? `<img class="tb-logo" src="${b.logo}" alt="${this._escape(b.name)}" />`
          : `<div class="tb-title">${this._escape(b.name)}</div>`}
        ${b.sub ? `<div class="tb-sub">${this._escape(b.sub)}</div>` : ''}
      </div>
      <button class="tb-btn" id="btnToggleTts" title="Voz automática">🔇</button>
      <button class="tb-btn" id="btnTogglePanel" title="Cursos y agenda">◧</button>
    </div>

    <aside class="sidebar">
      <div class="sb-head">
        <div class="sb-label">Historial</div>
        <div class="sb-head-actions">
          <button class="sb-new" id="btnNewChat">+ Nuevo</button>
          <button class="mobile-close" id="btnCloseSidebar" title="Cerrar" aria-label="Cerrar">✕</button>
        </div>
      </div>
      <div class="chats-list" id="chatsList">
        <div class="empty">Sin conversaciones previas</div>
      </div>
    </aside>

    <main class="main">
      <div class="messages" id="messages"></div>
      <div class="input-area">
        <div class="input-box">
          <textarea class="input-ta" id="chatInput" rows="1" placeholder="${this._escape(b.placeholder)}"></textarea>
          <button class="mic-btn idle" id="micBtn" title="Hablar" aria-label="Hablar">🎤</button>
          <button class="send-btn" id="sendBtn" title="Enviar">↑</button>
        </div>
        ${b.disclaimer ? `<div class="input-disclaimer">${this._escape(b.disclaimer)}</div>` : ''}
      </div>
    </main>

    <aside class="panel">
      <div id="expertBox" style="display:none"></div>
      <div class="panel-close-row">
        <button class="mobile-close" id="btnClosePanel" title="Cerrar" aria-label="Cerrar">✕</button>
      </div>
      <div class="panel-section">
        <div class="panel-head">
          <div class="panel-title">Cursos</div>
          <button class="panel-refresh" id="btnRefreshCourses" title="Actualizar">↻</button>
        </div>
        <div id="coursesList">
          <div class="empty small">Sin cursos disponibles</div>
        </div>
      </div>
      <div class="panel-section">
        <div class="panel-head">
          <div class="panel-title">Agenda</div>
          <button class="panel-refresh" id="btnRefreshEvents" title="Actualizar">↻</button>
        </div>
        <div id="eventsList">
          <div class="empty small">Sin eventos programados</div>
        </div>
      </div>
    </aside>

    <div class="backdrop" id="backdrop"></div>

  </div>

</div>
      `;
    }
  }

  customElements.define('cathovia-console', CathoviaConsole);
  console.log(`${TAG} Registrado.`);

})();
