const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { WebSocketServer, WebSocket } = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;

// In-memory translation cache (up to 1000 items)
const translationCache = new Map();

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(express.json({ limit: '12mb' }));

// Disable browser caching for live streaming script updates
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

app.use(express.static(path.join(__dirname, 'public'), { etag: false, maxAge: 0 }));

// Translation helper functions with multi-engine failover
async function translateGoogleGTX(text, sl = 'zh-TW', tl = 'ja') {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sl)}&tl=${encodeURIComponent(tl)}&dt=t&dj=1&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
    signal: AbortSignal.timeout(5000)
  });
  if (!res.ok) throw new Error(`Google GTX returned ${res.status}`);
  const data = await res.json();
  const trans = (data.sentences || []).map(s => s.trans || '').join('').trim();
  if (!trans) throw new Error('Empty response from Google GTX');
  return trans;
}

async function translateGoogleDict(text, sl = 'zh-TW', tl = 'ja') {
  const url = `https://translate.googleapis.com/translate_a/single?client=dict-chrome-ex&sl=${encodeURIComponent(sl)}&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
    signal: AbortSignal.timeout(5000)
  });
  if (!res.ok) throw new Error(`Google Dict returned ${res.status}`);
  const data = await res.json();
  const trans = (data[0] || []).map(x => x[0] || '').join('').trim();
  if (!trans) throw new Error('Empty response from Google Dict');
  return trans;
}

async function translateMyMemory(text, sl = 'zh-TW', tl = 'ja') {
  const pair = `${sl}|${tl}`;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(pair)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`MyMemory returned ${res.status}`);
  const data = await res.json();
  const trans = (data.responseData && data.responseData.translatedText || '').trim();
  if (!trans || /MYMEMORY WARNING|INVALID LANGUAGE|QUERY LENGTH/i.test(trans)) {
    throw new Error('MyMemory invalid result');
  }
  return trans;
}

async function translateWithEngines(text, sl, tl) {
  let lastErr = null;

  // Engine 1: Google GTX (JSON object)
  try {
    return await translateGoogleGTX(text, sl, tl);
  } catch (err1) {
    lastErr = err1;
  }

  // Engine 2: Google Dict-Chrome-Ex (JSON array)
  try {
    return await translateGoogleDict(text, sl, tl);
  } catch (err2) {
    lastErr = err2;
  }

  // Engine 3: MyMemory
  try {
    return await translateMyMemory(text, sl, tl);
  } catch (err3) {
    lastErr = err3;
  }

  throw new Error(`All translation engines failed: ${lastErr ? lastErr.message : 'Unknown'}`);
}

async function translateText(text, sl = 'zh-TW', tl = 'ja') {
  const cacheKey = `${sl}->${tl}:${text.trim()}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  let translated = '';
  try {
    translated = await translateWithEngines(text, sl, tl);
  } catch (err) {
    // Retry once after 250ms
    await new Promise(r => setTimeout(r, 250));
    translated = await translateWithEngines(text, sl, tl);
  }

  if (translated) {
    translationCache.set(cacheKey, translated);
    if (translationCache.size > 2000) {
      const firstKey = translationCache.keys().next().value;
      translationCache.delete(firstKey);
    }
  }
  return translated;
}

// API endpoint for translation (eliminates CORS and provides server caching)
app.post('/api/translate', async (req, res) => {
  const { text, sl = 'zh-TW', tl = 'ja' } = req.body || {};
  if (!text || !text.trim()) {
    return res.json({ translated: '' });
  }

  try {
    const translated = await translateText(text.trim(), sl, tl);
    res.json({ success: true, original: text, translated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API endpoint for uploading avatar image (Base64)
app.post('/api/upload-avatar', (req, res) => {
  const { dataUrl, shape = 'circle', size = 'medium' } = req.body || {};
  if (!dataUrl) {
    return res.status(400).json({ success: false, error: 'No image data provided' });
  }

  try {
    const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ success: false, error: 'Invalid data URL format' });
    }
    const buffer = Buffer.from(matches[2], 'base64');
    const filename = `avatar_${Date.now()}.png`;
    const filepath = path.join(uploadsDir, filename);

    fs.writeFileSync(filepath, buffer);
    const avatarUrl = `/uploads/${filename}`;

    currentSettings.avatarUrl = avatarUrl;
    currentSettings.showAvatar = true;
    currentSettings.avatarShape = shape;
    currentSettings.avatarSize = size;
    broadcast({ type: 'settings', data: currentSettings });

    res.json({ success: true, avatarUrl });
  } catch (err) {
    console.error('Error saving avatar:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// API endpoint to remove avatar
app.post('/api/remove-avatar', (req, res) => {
  currentSettings.avatarUrl = '';
  currentSettings.showAvatar = false;
  broadcast({ type: 'settings', data: currentSettings });
  res.json({ success: true });
});

// Broadcast helper to all connected WebSocket clients
function broadcast(data, senderWs = null) {
  const payload = typeof data === 'string' ? data : JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client !== senderWs && client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// Store current state for newly connected OBS overlay clients
let currentSubtitleState = {
  original: '',
  translation: '',
  isFinal: true,
  timestamp: Date.now()
};

let currentSettings = {
  bgMode: 'green',
  fontSize: 'large',
  fontFamily: 'system',
  textShadow: 'strong',
  originalColor: '#FFFFFF',
  translationColor: '#FFEE55',
  align: 'center',
  position: 'bottom',
  autoHideSeconds: 3.5,
  displayMode: 'both',
  showOriginal: true,
  showTranslation: true,
  boxStyle: 'none',
  showAvatar: false,
  avatarUrl: '',
  avatarShape: 'circle',
  avatarSize: 'large',
  avatarBorder: 'thick',
  avatarBorderColor: '#FFFFFF',
  speechSpeedMode: 'normal',
  transEngine: 'online', // 'online' | 'chrome'
  chromeFallbackOnline: true
};

wss.on('connection', (ws) => {
  // Send current settings & subtitle on connect
  ws.send(JSON.stringify({ type: 'settings', data: currentSettings }));
  
  // Only send subtitle on connect if it is recent (within autoHide duration)
  const subtitleAge = Date.now() - (currentSubtitleState.timestamp || 0);
  const maxSubtitleAge = ((currentSettings.autoHideSeconds || 3.5) + 1) * 1000;
  if ((currentSubtitleState.original || currentSubtitleState.translation) && subtitleAge < maxSubtitleAge) {
    ws.send(JSON.stringify({ type: 'subtitle', data: currentSubtitleState }));
  }

  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message.toString());
      if (parsed.type === 'subtitle') {
        currentSubtitleState = {
          ...parsed.data,
          timestamp: Date.now()
        };
        broadcast(parsed, ws);
      } else if (parsed.type === 'clear') {
        currentSubtitleState = { original: '', translation: '', isFinal: true, timestamp: Date.now() };
        broadcast({ type: 'clear' }, ws);
      } else if (parsed.type === 'settings') {
        currentSettings = { ...currentSettings, ...parsed.data };
        broadcast({ type: 'settings', data: currentSettings }, ws);
      } else if (parsed.type === 'test') {
        currentSubtitleState = {
          original: parsed.data?.original || '大家下午好！歡迎來到今日實況～',
          translation: parsed.data?.translation || '皆さんこんにちは！本日の配信へようこそ～',
          isFinal: true,
          timestamp: Date.now()
        };
        broadcast({ type: 'subtitle', data: currentSubtitleState });
      } else if (parsed.type === 'effect') {
        broadcast(parsed);
      } else if (parsed.type === 'customText') {
        broadcast(parsed);
      } else if (parsed.type === 'customTextClear') {
        broadcast(parsed);
      }
    } catch (err) {
      console.error('Error handling WS message:', err);
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🎬 OBS 即時雙語字幕伺服器已啟動！`);
  console.log(`📡 控制主面板: http://localhost:${PORT}/`);
  console.log(`📺 OBS 瀏覽器來源: http://localhost:${PORT}/overlay.html`);
  console.log(`🟢 綠幕全螢幕模式: http://localhost:${PORT}/overlay.html?bg=green`);
  console.log(`======================================================\n`);
});
