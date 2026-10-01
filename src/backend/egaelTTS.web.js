/* ═══════════════════════════════════════════════════════════════════════════
 * SABIO VALLEY — EGAEL TTS Backend (Wix Velo)
 * Archivo:  egaelTTS.web.js
 * VERSION:  1.3.0
 * FECHA:    11 Julio 2026
 *
 * Backend compartido de Text-to-Speech para toda la familia EGAEL.
 *
 * CAMBIOS v1.2.0 → v1.3.0:
 *   - Soporte para voces Chirp 3 HD (es-ES-Chirp3-HD-*) además de Neural2.
 *     Cambio de voz sin tocar código: editar voiceId en EgaelCourses.
 *   - Detección automática del tipo de voz (Neural2 vs Chirp3-HD).
 *     Chirp 3 HD NO acepta speakingRate ni pitch — se ignoran silenciosamente
 *     para esas voces (Google los rechaza si se envían).
 *   - egaelListVoices() ahora devuelve las voces agrupadas por familia
 *     con precio por millón de caracteres para transparencia.
 *   - Log en EgaelLog distingue "neural2" vs "chirp3hd" en el field family
 *     para poder trazar consumo separado por tipo.
 *
 * Precios (referencia):
 *   Neural2:    $16 / 1M chars   (free tier 1M chars/mes)
 *   Chirp 3 HD: $30 / 1M chars   (free tier 1M chars/mes)
 *
 * Voz por defecto: es-ES-Neural2-B (se puede cambiar en EgaelCourses.voiceId)
 * Salida: MP3 base64 reproducible con <audio>
 *
 * Secrets requeridos: GOOGLE_SA_JSON
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { webMethod, Permissions } from 'wix-web-module';
import { fetch } from 'wix-fetch';
import wixData from 'wix-data';
import { getSecret } from 'wix-secrets-backend';
import crypto from 'crypto';

const AUTH = { suppressAuth: true };
const V = 'EGAEL_TTS v1.3.0';

const TTS_ENDPOINT   = 'https://texttospeech.googleapis.com/v1/text:synthesize';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const TTS_SCOPE      = 'https://www.googleapis.com/auth/cloud-platform';
const MAX_TEXT       = 5000;

// ═══════════════════════════════════════════════════════════════════════════
// CATÁLOGO DE VOCES
// ═══════════════════════════════════════════════════════════════════════════

const NEURAL2_VOICES = [
  { id: 'es-ES-Neural2-A', gender: 'F', notes: 'Femenina neutra' },
  { id: 'es-ES-Neural2-B', gender: 'M', notes: 'Masculina cálida (default Cathovia)' },
  { id: 'es-ES-Neural2-C', gender: 'F', notes: 'Femenina cálida' },
  { id: 'es-ES-Neural2-D', gender: 'F', notes: 'Femenina brillante y joven' },
  { id: 'es-ES-Neural2-F', gender: 'M', notes: 'Masculina grave, tono solemne' },
];

const CHIRP3HD_VOICES = [
  { id: 'es-ES-Chirp3-HD-Aoede',  gender: 'F', notes: 'Femenina serena' },
  { id: 'es-ES-Chirp3-HD-Kore',   gender: 'F', notes: 'Femenina expresiva' },
  { id: 'es-ES-Chirp3-HD-Leda',   gender: 'F', notes: 'Femenina cálida' },
  { id: 'es-ES-Chirp3-HD-Zephyr', gender: 'F', notes: 'Femenina fresca' },
  { id: 'es-ES-Chirp3-HD-Charon', gender: 'M', notes: 'Masculina profunda' },
  { id: 'es-ES-Chirp3-HD-Fenrir', gender: 'M', notes: 'Masculina firme' },
  { id: 'es-ES-Chirp3-HD-Orus',   gender: 'M', notes: 'Masculina cálida (pastoral)' },
  { id: 'es-ES-Chirp3-HD-Puck',   gender: 'M', notes: 'Masculina joven, cercana' },
];

const ALL_VOICE_IDS = [
  ...NEURAL2_VOICES.map(v => v.id),
  ...CHIRP3HD_VOICES.map(v => v.id),
];

const DEFAULT_VOICE = 'es-ES-Neural2-B';
const DEFAULT_SPEAKING_RATE = 1.0;
const DEFAULT_PITCH = 0.0;

let _tokenCache = { token: null, expiresAt: 0 };

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function _detectFamily(voiceId) {
  if (voiceId && voiceId.indexOf('Chirp3-HD') !== -1) return 'chirp3hd';
  return 'neural2';
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN — SÍNTESIS
// ═══════════════════════════════════════════════════════════════════════════

export const egaelSynthesize = webMethod(
  Permissions.Anyone,
  async ({ texto, cursoId, voiceName, speakingRate, pitch }) => {
    console.log(`[${V}] egaelSynthesize IN len=${(texto || '').length} cursoId=${cursoId || '-'} voice=${voiceName || 'default'}`);

    try {
      if (!texto || !texto.trim()) return { ok: false, error: 'texto requerido' };
      if (texto.length > MAX_TEXT) return { ok: false, error: `texto excede ${MAX_TEXT} caracteres (${texto.length})` };

      // 1. Resolver voz, rate y pitch — override > CMS > default
      let voice = voiceName;
      let rate  = (typeof speakingRate === 'number') ? speakingRate : null;
      let pit   = (typeof pitch === 'number') ? pitch : null;
      if (cursoId && (!voice || rate === null || pit === null)) {
        try {
          const curso = await wixData.get('EgaelCourses', cursoId, AUTH);
          if (curso) {
            if (!voice && curso.voiceId)                              voice = curso.voiceId;
            if (rate === null && typeof curso.voiceRate === 'number') rate  = curso.voiceRate;
            if (pit === null && typeof curso.voicePitch === 'number') pit   = curso.voicePitch;
          }
        } catch (e) {
          console.warn(`[${V}] no se pudo leer EgaelCourses/${cursoId}:`, e.message);
        }
      }
      voice = voice || DEFAULT_VOICE;
      rate  = (rate !== null) ? rate : DEFAULT_SPEAKING_RATE;
      pit   = (pit  !== null) ? pit  : DEFAULT_PITCH;

      // 2. Validar contra whitelist
      if (ALL_VOICE_IDS.indexOf(voice) === -1) {
        console.warn(`[${V}] voz "${voice}" no reconocida, usando ${DEFAULT_VOICE}`);
        voice = DEFAULT_VOICE;
      }
      const family = _detectFamily(voice);

      // 3. Construir payload — Chirp 3 HD NO acepta speakingRate ni pitch
      const cleanText = _sanitizeText(texto);
      const audioConfig = { audioEncoding: 'MP3' };
      if (family === 'neural2') {
        audioConfig.speakingRate = rate;
        audioConfig.pitch = pit;
      }
      const body = {
        input: { text: cleanText },
        voice: { languageCode: 'es-ES', name: voice },
        audioConfig
      };

      // 4. Llamada
      const accessToken = await _getAccessToken();
      const startTime = Date.now();

      const response = await fetch(TTS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(body)
      });

      const timeMs = Date.now() - startTime;

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[${V}] Cloud TTS ${response.status} (${family}): ${errText.substring(0, 500)}`);
        _log({ cursoId, voice, family, textoLen: texto.length, timeMs, ok: false, error: `HTTP ${response.status}` });
        return { ok: false, error: `Cloud TTS respondió ${response.status}` };
      }

      const data = await response.json();
      const mp3Base64 = data && data.audioContent;

      if (!mp3Base64) {
        console.error(`[${V}] Respuesta sin audio:`, JSON.stringify(data).substring(0, 500));
        return { ok: false, error: 'Cloud TTS no devolvió audio' };
      }

      console.log(`[${V}] egaelSynthesize OUT ${timeMs}ms voice=${voice} family=${family} mp3Len=${mp3Base64.length}`);
      _log({ cursoId, voice, family, textoLen: texto.length, timeMs, ok: true });

      return {
        ok: true,
        audioContent: mp3Base64,
        mimeType: 'audio/mpeg',
        voice: voice,
        family: family,
        timeMs: timeMs
      };

    } catch (err) {
      console.error(`[${V}] egaelSynthesize EXCEPTION:`, err.message || err);
      return { ok: false, error: 'Error técnico: ' + (err.message || 'desconocido') };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// LISTADO DE VOCES DISPONIBLES
// ═══════════════════════════════════════════════════════════════════════════

export const egaelListVoices = webMethod(
  Permissions.Anyone,
  async () => {
    return {
      ok: true,
      defaultVoice: DEFAULT_VOICE,
      families: {
        neural2: {
          label: 'Neural2 (Cloud TTS clásico)',
          pricePer1MChars: 16,
          freeTierPerMonth: 1000000,
          supportsRateAndPitch: true,
          voices: NEURAL2_VOICES
        },
        chirp3hd: {
          label: 'Chirp 3 HD (Cloud TTS última generación)',
          pricePer1MChars: 30,
          freeTierPerMonth: 1000000,
          supportsRateAndPitch: false,
          voices: CHIRP3HD_VOICES
        }
      }
    };
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// OAUTH2 — JWT RS256 con Service Account (sin cambios)
// ═══════════════════════════════════════════════════════════════════════════

async function _getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (_tokenCache.token && _tokenCache.expiresAt > now + 300) return _tokenCache.token;

  let saJson;
  try { saJson = await getSecret('GOOGLE_SA_JSON'); }
  catch (e) { throw new Error('GOOGLE_SA_JSON no encontrado en Wix Secrets'); }

  let sa;
  try { sa = JSON.parse(saJson); }
  catch (e) { throw new Error('GOOGLE_SA_JSON no es JSON válido'); }

  if (!sa.client_email || !sa.private_key) {
    throw new Error('GOOGLE_SA_JSON no tiene client_email o private_key');
  }

  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss:   sa.client_email,
    scope: TTS_SCOPE,
    aud:   TOKEN_ENDPOINT,
    iat:   now,
    exp:   now + 3600
  };

  const b64url = (obj) => Buffer.from(JSON.stringify(obj))
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const headerEnc = b64url(header);
  const claimEnc  = b64url(claim);
  const signingInput = `${headerEnc}.${claimEnc}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  const signature = signer.sign(sa.private_key)
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const jwt = `${signingInput}.${signature}`;

  const params = new URLSearchParams();
  params.append('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
  params.append('assertion', jwt);

  const tokenRes = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    console.error(`[${V}] OAuth token exchange failed ${tokenRes.status}: ${errText.substring(0, 500)}`);
    throw new Error(`OAuth ${tokenRes.status}`);
  }

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error('Sin access_token en respuesta OAuth');

  _tokenCache = {
    token: tokenData.access_token,
    expiresAt: now + (tokenData.expires_in || 3600)
  };
  console.log(`[${V}] access_token nuevo obtenido, expira en ${tokenData.expires_in || 3600}s`);

  return _tokenCache.token;
}

// ═══════════════════════════════════════════════════════════════════════════
// SANITIZACIÓN DE TEXTO
// ═══════════════════════════════════════════════════════════════════════════

function _sanitizeText(text) {
  let t = String(text || '');
  t = t.replace(/\[\[CARD:[a-zA-Z0-9_\-]+\]\]/g, '');
  t = t.replace(/\*\*(.+?)\*\*/g, '$1');
  t = t.replace(/^#{1,6}\s+/gm, '');
  t = t.replace(/^-{3,}$/gm, '');
  t = t.replace(/\*(.+?)\*/g, '$1');
  t = t.replace(/\n{3,}/g, '\n\n').trim();
  return t;
}

// ═══════════════════════════════════════════════════════════════════════════
// LOG
// ═══════════════════════════════════════════════════════════════════════════

async function _log({ cursoId, voice, family, textoLen, timeMs, ok, error }) {
  try {
    await wixData.insert('EgaelLog', {
      title: 'tts_synthesize',
      cursoRef: cursoId || '',
      category: 'egael_tts',
      parameters: JSON.stringify({ voice, family, textoLen, ok, error: error || null }),
      timeMs: timeMs || 0,
      timestamp: new Date()
    }, AUTH);
  } catch (_) { }
}