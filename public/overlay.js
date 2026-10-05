// OBS Overlay Script
(function () {
  const container = document.getElementById('overlay-container');
  const subtitleBox = document.getElementById('subtitle-box');
  const originalEl = document.getElementById('sub-original');
  const translationEl = document.getElementById('sub-translation');
  const avatarContainer = document.getElementById('avatar-container');
  const avatarImg = document.getElementById('avatar-img');

  // URL Params Override
  const urlParams = new URLSearchParams(window.location.search);
  const paramBg = urlParams.get('bg'); // 'green', 'broadcast', 'blue', 'transparent', 'dark'
  const paramSize = urlParams.get('size'); // 'small', 'medium', 'large', 'huge'
  const paramAlign = urlParams.get('align'); // 'center', 'left', 'right'
  const paramPos = urlParams.get('pos'); // 'bottom', 'center', 'top'
  const paramStroke = urlParams.get('stroke'); // 'strong', 'thick', 'subtle', 'none'
  const paramAutoHide = urlParams.get('autohide'); // seconds
  const paramMode = urlParams.get('mode'); // 'both', 'original', 'translation'

  let autoHideTimer = null;
  let currentSettings = {
    bgMode: paramBg || 'transparent',
    fontSize: paramSize || 'large',
    textShadow: paramStroke || 'strong',
    align: paramAlign || 'center',
    position: paramPos || 'bottom',
    originalColor: '#FFFFFF',
    translationColor: '#FFEE55',
    autoHideSeconds: paramAutoHide ? parseFloat(paramAutoHide) : 3.5,
    displayMode: paramMode || 'both',
    showOriginal: true,
    showTranslation: true,
    boxStyle: 'none',
    showAvatar: false,
    avatarUrl: '',
    avatarShape: 'circle',
    avatarSize: 'large',
    avatarPos: 'far-left' // 'far-left' | 'inline'
  };

  const avatarSizes = { small: 80, medium: 108, large: 138, huge: 168 };

  function applySettings(settings) {
    currentSettings = { ...currentSettings, ...settings };
    if (paramMode) currentSettings.displayMode = paramMode;

    // Background
    document.body.className = `bg-${currentSettings.bgMode}`;

    // Layout
    const mode = currentSettings.displayMode || 'both';
    container.className = `pos-${currentSettings.position} align-${currentSettings.align} size-${currentSettings.fontSize} text-stroke-${currentSettings.textShadow}${mode === 'original' || mode === 'translation' ? ' mode-single' : ''}`;

    // Colors
    originalEl.style.color = currentSettings.originalColor || '#FFFFFF';
    translationEl.style.color = currentSettings.translationColor || '#FFEE55';

    // Visibility based on displayMode
    const showOrig = mode === 'both' || mode === 'original';
    const showTrans = mode === 'both' || mode === 'translation';

    originalEl.style.display = showOrig ? 'block' : 'none';
    translationEl.style.display = showTrans ? 'block' : 'none';
    translationEl.style.marginTop = showOrig ? '6px' : '0px';

    // Avatar Handling
    const avatarSpacer = document.getElementById('avatar-spacer');
    const isFarLeft = (currentSettings.avatarPos || 'far-left') === 'far-left';

    if (avatarContainer && avatarImg) {
      if (currentSettings.showAvatar && currentSettings.avatarUrl) {
        avatarImg.src = currentSettings.avatarUrl;
        avatarContainer.className = `avatar-container active avatar-shape-${currentSettings.avatarShape || 'circle'} avatar-size-${currentSettings.avatarSize || 'large'} avatar-border-${currentSettings.avatarBorder || 'thick'}`;
        if (currentSettings.avatarBorderColor) {
          avatarImg.style.borderColor = currentSettings.avatarBorderColor;
        }

        if (isFarLeft) {
          subtitleBox.classList.add('has-avatar-left');
          if (avatarSpacer) {
            const sizePx = avatarSizes[currentSettings.avatarSize || 'large'] || 138;
            avatarSpacer.style.width = `${sizePx}px`;
            avatarSpacer.style.height = `${sizePx}px`;
          }
        } else {
          subtitleBox.classList.remove('has-avatar-left');
        }
      } else {
        avatarContainer.className = 'avatar-container';
        subtitleBox.classList.remove('has-avatar-left');
      }
    }

    // Box Style
    subtitleBox.className = 'subtitle-box';
    if (currentSettings.showAvatar && currentSettings.avatarUrl && isFarLeft) {
      subtitleBox.classList.add('has-avatar-left');
    }
    if (currentSettings.boxStyle === 'bubble') {
      subtitleBox.classList.add('style-bubble');
    } else if (currentSettings.boxStyle === 'solid') {
      subtitleBox.classList.add('style-solid-black');
    }
  }

  // Initial apply
  applySettings(currentSettings);

  function resetAutoHide() {
    clearTimeout(autoHideTimer);
    const secs = parseFloat(currentSettings.autoHideSeconds);
    if (!isNaN(secs) && secs > 0) {
      autoHideTimer = setTimeout(() => {
        subtitleBox.classList.add('hidden');
      }, secs * 1000);
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  function renderSubtitle(data) {
    let { original = '', translation = '', isFinal = true } = data || {};

    if (typeof translation === 'string') {
      if (translation.includes('翻譯中') || translation.includes('翻譯失敗') || translation.includes('翻譯未取得') || translation.trim() === '...' || translation.trim() === '…') {
        translation = '';
      }
    }

    const mode = currentSettings.displayMode || 'both';
    const showOrig = mode === 'both' || mode === 'original';
    const showTrans = mode === 'both' || mode === 'translation';

    const hasVisibleContent = (showOrig && original) || (showTrans && translation);
    if (!hasVisibleContent) {
      subtitleBox.classList.add('hidden');
      return;
    }

    // Trigger subtle sentence pop animation on TEXT ONLY when sentence finalizes (smooth streaming without pop on every letter)
    const textGroup = subtitleBox ? subtitleBox.querySelector('.subtitle-text-group') : null;
    if (textGroup && isFinal) {
      textGroup.classList.remove('sentence-pop');
      void textGroup.offsetWidth;
      textGroup.classList.add('sentence-pop');
    }

    if (isFinal) {
      originalEl.textContent = original;
      translationEl.textContent = translation;
    } else {
      // Interim streaming state
      originalEl.innerHTML = original ? `<span class="interim">${escapeHtml(original)}</span><span class="cursor"></span>` : '';
      translationEl.innerHTML = translation ? `<span class="interim">${escapeHtml(translation)}</span>` : '';
    }

    subtitleBox.classList.remove('hidden');
    resetAutoHide();
  }

  function clearSubtitle() {
    clearTimeout(autoHideTimer);
    subtitleBox.classList.add('hidden');
    setTimeout(() => {
      originalEl.textContent = '';
      translationEl.textContent = '';
    }, 300);
  }

  // Initialize Visual Effects Engine
  const effectCanvas = document.getElementById('effect-canvas');
  let effectsEngine = null;
  if (effectCanvas && window.LiveEffects) {
    effectsEngine = new LiveEffects(effectCanvas);
  }

  // Custom Banner & Marquee Layer
  const bannerLayer = document.getElementById('custom-banner-layer');
  let bannerTimer = null;

  function clearCustomBanner() {
    clearTimeout(bannerTimer);
    if (!bannerLayer) return;
    bannerLayer.classList.add('fade-out');
    setTimeout(() => {
      bannerLayer.innerHTML = '';
      bannerLayer.className = 'custom-banner-layer pos-top';
    }, 350);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function renderCustomBanner(data) {
    if (!bannerLayer || !data) return;
    clearTimeout(bannerTimer);
    bannerLayer.classList.remove('fade-out');

    const text = data.text || '';
    const mode = data.mode || 'marquee-loop'; // 'marquee-loop' | 'marquee-once' | 'static'
    const pos = data.pos || 'top';            // 'top' | 'center' | 'bottom'
    const speed = data.speed || 'normal';     // 'slow' | 'normal' | 'fast' | 'rapid'
    const duration = data.duration ?? 0;      // seconds (0 = persistent, 'auto' = end of animation)
    const size = data.size || 'medium';       // 'small' | 'medium' | 'large' | 'huge'
    const style = data.style || 'neon';       // 'neon' | 'glass' | 'alert' | 'clean'

    if (!text.trim()) {
      clearCustomBanner();
      return;
    }

    bannerLayer.className = `custom-banner-layer pos-${pos}`;

    if (mode === 'static') {
      bannerLayer.innerHTML = `
        <div class="static-banner-content banner-style-${style} banner-size-${size}">
          ${escapeHtml(text)}
        </div>
      `;
    } else {
      const isLoop = mode === 'marquee-loop';
      const loopClass = isLoop ? 'loop-infinite' : 'loop-once';
      bannerLayer.innerHTML = `
        <div class="marquee-track">
          <div class="marquee-content ${loopClass} speed-${speed} banner-style-${style} banner-size-${size}">
            ${escapeHtml(text)}
          </div>
        </div>
      `;

      if (mode === 'marquee-once' && (duration === 'auto' || duration == 0)) {
        const marqueeEl = bannerLayer.querySelector('.marquee-content');
        if (marqueeEl) {
          marqueeEl.addEventListener('animationend', () => {
            clearCustomBanner();
          }, { once: true });
        }
      }
    }

    const durSec = parseFloat(duration);
    if (!isNaN(durSec) && durSec > 0) {
      bannerTimer = setTimeout(() => {
        clearCustomBanner();
      }, durSec * 1000);
    }
  }

  // BroadcastChannel for instant local inter-tab sync
  let channel = null;
  try {
    channel = new BroadcastChannel('caption_sync');
    channel.onmessage = (event) => {
      const msg = event.data;
      if (!msg) return;
      if (msg.type === 'subtitle' || msg.type === 'test') renderSubtitle(msg.data);
      if (msg.type === 'clear') clearSubtitle();
      if (msg.type === 'settings') applySettings(msg.data);
      if (msg.type === 'effect' && effectsEngine) effectsEngine.trigger(msg.data?.name);
      if (msg.type === 'customText') renderCustomBanner(msg.data);
      if (msg.type === 'customTextClear') clearCustomBanner();
    };
  } catch (e) {
    // BroadcastChannel not available, WS will handle it
  }

  // WebSocket Connection
  let ws = null;
  function connectWS() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${location.host}`;
    ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'subtitle' || msg.type === 'test') {
          renderSubtitle(msg.data);
        } else if (msg.type === 'clear') {
          clearSubtitle();
        } else if (msg.type === 'settings') {
          applySettings(msg.data);
        } else if (msg.type === 'effect') {
          if (effectsEngine) effectsEngine.trigger(msg.data?.name);
        } else if (msg.type === 'customText') {
          renderCustomBanner(msg.data);
        } else if (msg.type === 'customTextClear') {
          clearCustomBanner();
        }
      } catch (err) {
        console.error('WS parse error:', err);
      }
    };

    ws.onclose = () => {
      setTimeout(connectWS, 2000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }

  connectWS();
})();
