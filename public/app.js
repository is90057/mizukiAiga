// OBS Realtime Dual-Language Caption Application
(function () {
  // i18n helper function
  const t = (key, fallback) => (window.I18N ? window.I18N.t(key, fallback) : (fallback || key));

  // DOM Elements - Status & Controls
  const btnToggleListen = document.getElementById('btn-toggle-listen');
  const listenBtnText = document.getElementById('listen-btn-text');
  const listenIcon = document.getElementById('listen-icon');
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const volumeBar = document.getElementById('volume-bar');

  // Stage & Preview Elements
  const subtitleStage = document.getElementById('subtitle-stage');
  const stageHint = document.getElementById('stage-hint');
  const previewWrapper = document.getElementById('preview-wrapper');
  const previewBox = document.getElementById('preview-box');
  const previewOriginal = document.getElementById('preview-original');
  const previewTranslation = document.getElementById('preview-translation');

  // Toolbar Action Buttons
  const btnTestSub = document.getElementById('btn-test-sub');
  const btnClearSub = document.getElementById('btn-clear-sub');
  const btnCopyUrl = document.getElementById('btn-copy-url');
  const btnFullscreenGreen = document.getElementById('btn-fullscreen-green');
  const btnHideUi = document.getElementById('btn-hide-ui');
  const btnHideUiNav = document.getElementById('btn-hide-ui-nav');
  const btnExitGreenMode = document.getElementById('btn-exit-green-mode');
  const btnToggleListenHud = document.getElementById('btn-toggle-listen-hud');
  const listenIconHud = document.getElementById('listen-icon-hud');
  const listenBtnTextHud = document.getElementById('listen-btn-text-hud');
  const pureGreenHud = document.getElementById('pure-green-hud');
  const btnOpenTutorial = document.getElementById('btn-open-tutorial');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const tutorialModal = document.getElementById('tutorial-modal');

  // History & Export Elements
  const historyList = document.getElementById('history-list');
  const btnClearLog = document.getElementById('btn-clear-log');
  const btnExportLog = document.getElementById('btn-export-log');

  // Settings Elements
  const selectSourceLang = document.getElementById('select-source-lang');
  const selectTargetLang = document.getElementById('select-target-lang');
  const selectStroke = document.getElementById('select-stroke');
  const selectBoxStyle = document.getElementById('select-box-style');
  const selectAutoHide = document.getElementById('select-auto-hide');
  const pickerOrigColor = document.getElementById('picker-orig-color');
  const textOrigColor = document.getElementById('text-orig-color');
  const pickerTransColor = document.getElementById('picker-trans-color');
  const textTransColor = document.getElementById('text-trans-color');

  // Avatar Elements
  const previewAvatarContainer = document.getElementById('preview-avatar-container');
  const previewAvatarImg = document.getElementById('preview-avatar-img');
  const sidebarAvatarThumb = document.getElementById('sidebar-avatar-thumb');
  const sidebarAvatarImg = document.getElementById('sidebar-avatar-img');
  const sidebarAvatarPlaceholder = document.getElementById('sidebar-avatar-placeholder');
  const fileAvatarInput = document.getElementById('file-avatar-input');
  const btnUploadAvatar = document.getElementById('btn-upload-avatar');
  const btnRemoveAvatar = document.getElementById('btn-remove-avatar');
  const checkShowAvatar = document.getElementById('check-show-avatar');
  const pickerAvatarBorderColor = document.getElementById('picker-avatar-border-color');
  const textAvatarBorderColor = document.getElementById('text-avatar-border-color');

  // Settings State
  let currentSettings = {
    bgMode: 'green',
    fontSize: 'large',
    textShadow: 'strong',
    align: 'center',
    position: 'bottom',
    originalColor: '#FFFFFF',
    translationColor: '#FFEE55',
    boxStyle: 'none',
    autoHideSeconds: 3.5,
    displayMode: 'both', // 'both' | 'original' | 'translation'
    streamMode: 'streaming', // 'streaming' (即說即現) | 'sentence' (講完斷句)
    showOriginal: true,
    showTranslation: true,
    sourceLang: 'zh-TW',
    targetLang: 'ja',
    showAvatar: false,
    avatarUrl: '',
    avatarShape: 'circle',
    avatarSize: 'large',
    avatarBorder: 'thick', // 'medium' (4px) | 'thick' (6px) | 'extra' (8px)
    avatarBorderColor: '#FFFFFF',
    avatarPos: 'far-left', // 'far-left' | 'inline'
    speechSpeedMode: 'normal', // 'ultra' | 'normal' | 'relaxed'
    transEngine: 'online', // 'online' | 'chrome'
    chromeFallbackOnline: true
  };

  // Load saved settings if any
  try {
    const saved = localStorage.getItem('obs_caption_settings');
    if (saved) {
      currentSettings = { ...currentSettings, ...JSON.parse(saved) };
    }
  } catch (e) {}

  // WebSocket Connection
  let ws = null;
  function connectWS() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${location.host}`;
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      syncSettings();
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'effect' && previewEffects) {
          previewEffects.trigger(msg.data?.name);
        } else if (msg.type === 'customText') {
          renderPreviewCustomBanner(msg.data);
        } else if (msg.type === 'customTextClear') {
          clearPreviewCustomBanner();
        }
      } catch (err) {}
    };

    ws.onclose = () => {
      setTimeout(connectWS, 2500);
    };

    ws.onerror = () => {
      ws.close();
    };
  }
  connectWS();

  // BroadcastChannel for instant local browser tab sync
  let channel = null;
  try {
    channel = new BroadcastChannel('caption_sync');
    channel.onmessage = (event) => {
      const msg = event.data;
      if (!msg) return;
      if (msg.type === 'effect' && previewEffects) {
        previewEffects.trigger(msg.data?.name);
      } else if (msg.type === 'customText') {
        renderPreviewCustomBanner(msg.data);
      } else if (msg.type === 'customTextClear') {
        clearPreviewCustomBanner();
      }
    };
  } catch (e) {}

  // Initialize Visual Effects for Preview Stage
  const effectCanvasPreview = document.getElementById('effect-canvas-preview');
  let previewEffects = null;
  if (effectCanvasPreview && window.LiveEffects) {
    previewEffects = new LiveEffects(effectCanvasPreview);
  }

  function triggerEffect(name) {
    if (previewEffects) previewEffects.trigger(name);
    broadcastData('effect', { name, timestamp: Date.now() });
  }

  function broadcastData(type, data = null) {
    if (type === 'subtitle' && data && typeof data.translation === 'string') {
      if (data.translation.includes('翻譯中') || data.translation.includes('翻譯失敗') || data.translation.includes('翻譯未取得') || data.translation.trim() === '...' || data.translation.trim() === '…') {
        data.translation = '';
      }
    }
    const payload = { type, data };
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
    if (channel) {
      channel.postMessage(payload);
    }
  }

  function syncSettings() {
    broadcastData('settings', currentSettings);
    try {
      localStorage.setItem('obs_caption_settings', JSON.stringify(currentSettings));
    } catch (e) {}
  }

  // Apply Settings to UI
  function applySettingsToUI() {
    // Background Buttons (Supports both .bg-picker-btn and .bg-seg-btn)
    document.querySelectorAll('.bg-picker-btn, .bg-seg-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.bg === currentSettings.bgMode);
    });

    const bgModeBadge = document.getElementById('summary-bg-mode');
    if (bgModeBadge) {
      const bgNames = {
        green: '純綠幕 (#00FF00)',
        broadcast: '實況綠 (#00B140)',
        blue: '藍幕 (#0000FF)',
        dark: '深色底 (#0F172A)',
        transparent: '透明底'
      };
      bgModeBadge.textContent = t('bg_' + currentSettings.bgMode + '_full', bgNames[currentSettings.bgMode] || '純綠幕');
    }

    // Subtitle Stage Class
    subtitleStage.className = `subtitle-stage bg-${currentSettings.bgMode} stage-pos-${currentSettings.position}`;

    // Preview Wrapper Classes (Enforce max 2 lines with mode-single)
    const isSingle = (currentSettings.displayMode === 'original' || currentSettings.displayMode === 'translation');
    previewWrapper.className = `subtitle-wrapper align-${currentSettings.align} size-${currentSettings.fontSize} text-stroke-${currentSettings.textShadow}${isSingle ? ' mode-single' : ''}`;

    // Font Size Segmented Control
    document.querySelectorAll('#control-font-size .seg-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.val === currentSettings.fontSize);
    });

    // Alignment Segmented Control
    document.querySelectorAll('#control-align .seg-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.val === currentSettings.align);
    });

    // Position Segmented Control
    document.querySelectorAll('#control-pos .seg-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.val === currentSettings.position);
    });

    // Display Mode (both, original, translation)
    const mode = currentSettings.displayMode || 'both';
    document.querySelectorAll('#control-display-mode .seg-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.val === mode);
    });

    const summaryDisplayMode = document.getElementById('summary-display-mode');
    if (summaryDisplayMode) {
      const modeLabels = {
        both: '雙語（原文+翻譯）',
        original: '僅原文',
        translation: '僅翻譯'
      };
      summaryDisplayMode.textContent = t('display_mode_' + mode, modeLabels[mode] || '雙語（原文+翻譯）');
    }

    const showOrig = mode === 'both' || mode === 'original';
    const showTrans = mode === 'both' || mode === 'translation';
    currentSettings.showOriginal = showOrig;
    currentSettings.showTranslation = showTrans;

    // Form inputs
    selectSourceLang.value = currentSettings.sourceLang;
    selectTargetLang.value = currentSettings.targetLang;
    selectStroke.value = currentSettings.textShadow;
    selectBoxStyle.value = currentSettings.boxStyle;
    selectAutoHide.value = currentSettings.autoHideSeconds;

    pickerOrigColor.value = currentSettings.originalColor;
    textOrigColor.textContent = currentSettings.originalColor;
    previewOriginal.style.color = currentSettings.originalColor;
    previewOriginal.style.display = showOrig ? 'block' : 'none';

    pickerTransColor.value = currentSettings.translationColor;
    textTransColor.textContent = currentSettings.translationColor;
    previewTranslation.style.color = currentSettings.translationColor;
    previewTranslation.style.display = showTrans ? 'block' : 'none';
    previewTranslation.style.marginTop = showOrig ? '4px' : '0px';

    // Subtitle Rhythm / Stream Mode (Approach A)
    const streamMode = currentSettings.streamMode || 'streaming';
    document.querySelectorAll('#control-stream-mode .seg-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.val === streamMode);
    });

    // Speech Speed Mode (Fast Talker Optimization)
    const speedMode = currentSettings.speechSpeedMode || 'normal';
    document.querySelectorAll('#control-speech-speed .seg-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.val === speedMode);
    });

    // Translation Engine & Chrome Translator Panel
    const engine = currentSettings.transEngine || 'online';
    document.querySelectorAll('#control-trans-engine .seg-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.val === engine);
    });
    const transEngineBadge = document.getElementById('trans-engine-badge');
    if (transEngineBadge) {
      if (engine === 'chrome') {
        transEngineBadge.textContent = t('badge_trans_engine_chrome', '⚡ Chrome 內建');
        transEngineBadge.style.background = 'rgba(16, 185, 129, 0.2)';
        transEngineBadge.style.color = '#34d399';
      } else {
        transEngineBadge.textContent = t('badge_trans_engine_online', '🌐 線上雲端');
        transEngineBadge.style.background = 'rgba(56, 189, 248, 0.2)';
        transEngineBadge.style.color = '#38bdf8';
      }
    }
    const chromePanel = document.getElementById('chrome-translator-panel');
    if (chromePanel) {
      chromePanel.style.display = engine === 'chrome' ? 'block' : 'none';
      if (engine === 'chrome') {
        updateChromeTranslatorUI();
      }
    }
    const checkFallback = document.getElementById('check-chrome-fallback-online');
    if (checkFallback) {
      checkFallback.checked = currentSettings.chromeFallbackOnline !== false;
    }

    // Avatar Settings & UI
    if (checkShowAvatar) checkShowAvatar.checked = !!currentSettings.showAvatar;

    document.querySelectorAll('#control-avatar-pos .seg-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.val === (currentSettings.avatarPos || 'far-left'));
    });

    document.querySelectorAll('#control-avatar-shape .seg-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.val === (currentSettings.avatarShape || 'circle'));
    });

    document.querySelectorAll('#control-avatar-size .seg-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.val === (currentSettings.avatarSize || 'medium'));
    });

    document.querySelectorAll('#control-avatar-border .seg-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.val === (currentSettings.avatarBorder || 'thick'));
    });

    if (pickerAvatarBorderColor && textAvatarBorderColor) {
      pickerAvatarBorderColor.value = currentSettings.avatarBorderColor || '#FFFFFF';
      textAvatarBorderColor.textContent = currentSettings.avatarBorderColor || '#FFFFFF';
    }

    // Update sidebar avatar thumbnail
    if (sidebarAvatarImg && sidebarAvatarPlaceholder && btnRemoveAvatar) {
      if (currentSettings.avatarUrl) {
        sidebarAvatarImg.src = currentSettings.avatarUrl;
        sidebarAvatarImg.style.display = 'block';
        sidebarAvatarPlaceholder.style.display = 'none';
        btnRemoveAvatar.style.display = 'block';
      } else {
        sidebarAvatarImg.style.display = 'none';
        sidebarAvatarPlaceholder.style.display = 'block';
        btnRemoveAvatar.style.display = 'none';
      }
    }

    // Update preview stage avatar & far-left position
    const avatarSizes = { small: 80, medium: 108, large: 138, huge: 168 };
    const currentSizePx = avatarSizes[currentSettings.avatarSize || 'large'] || 138;
    const previewAvatarSpacer = document.getElementById('preview-avatar-spacer');
    const isFarLeft = (currentSettings.avatarPos || 'far-left') === 'far-left';

    if (previewAvatarContainer && previewAvatarImg) {
      if (currentSettings.showAvatar && currentSettings.avatarUrl) {
        previewAvatarImg.src = currentSettings.avatarUrl;
        previewAvatarContainer.className = `avatar-container active avatar-shape-${currentSettings.avatarShape || 'circle'} avatar-size-${currentSettings.avatarSize || 'medium'} avatar-border-${currentSettings.avatarBorder || 'thick'}`;
        if (currentSettings.avatarBorderColor) {
          previewAvatarImg.style.borderColor = currentSettings.avatarBorderColor;
        }

        if (isFarLeft) {
          previewBox.classList.add('has-avatar-left');
          if (previewAvatarSpacer) {
            previewAvatarSpacer.style.width = `${currentSizePx}px`;
            previewAvatarSpacer.style.height = `${currentSizePx}px`;
          }
        } else {
          previewBox.classList.remove('has-avatar-left');
        }
      } else {
        previewAvatarContainer.className = 'avatar-container';
        previewBox.classList.remove('has-avatar-left');
      }
    }

    // Box Style
    previewBox.className = 'subtitle-box';
    if (currentSettings.showAvatar && currentSettings.avatarUrl && isFarLeft) {
      previewBox.classList.add('has-avatar-left');
    }
    if (currentSettings.boxStyle === 'bubble') {
      previewBox.classList.add('style-bubble');
    } else if (currentSettings.boxStyle === 'solid') {
      previewBox.classList.add('style-solid-black');
    }

    updateCollapsibleSummaries();
  }

  // Auto Hide Timer for Preview (clears current sentence and syncs to OBS)
  let autoHideTimer = null;
  function resetAutoHide() {
    clearTimeout(autoHideTimer);
    const secs = parseFloat(currentSettings.autoHideSeconds);
    if (!isNaN(secs) && secs > 0) {
      autoHideTimer = setTimeout(() => {
        previewOriginal.innerHTML = '';
        previewTranslation.innerHTML = '';
        if (stageHint) stageHint.style.display = wantListen ? 'none' : 'block';
        broadcastData('clear');
      }, secs * 1000);
    }
  }

  // Render Subtitles
  function renderSubtitle(original, translation, isFinal = true) {
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
      previewOriginal.innerHTML = '';
      previewTranslation.innerHTML = '';
      if (stageHint) stageHint.style.display = wantListen ? 'none' : 'block';
      return;
    }

    if (stageHint) stageHint.style.display = 'none';

    // Trigger subtle sentence pop animation on TEXT ONLY when sentence finalizes (smooth streaming without pop on every letter)
    const textGroup = previewBox ? previewBox.querySelector('.subtitle-text-group') : null;
    if (textGroup && isFinal) {
      textGroup.classList.remove('sentence-pop');
      void textGroup.offsetWidth;
      textGroup.classList.add('sentence-pop');
    }

    if (isFinal) {
      previewOriginal.textContent = original;
      previewTranslation.textContent = translation;
    } else {
      previewOriginal.innerHTML = original ? `<span class="interim-text">${escapeHtml(original)}</span><span class="live-cursor"></span>` : '';
      previewTranslation.innerHTML = translation ? `<span class="interim-text">${escapeHtml(translation)}</span>` : '';
    }

    previewOriginal.style.display = showOrig ? 'block' : 'none';
    previewTranslation.style.display = showTrans ? 'block' : 'none';
    previewTranslation.style.marginTop = showOrig ? '4px' : '0px';

    resetAutoHide();
  }

  // History Log Management
  const historyItems = [];
  function addHistoryItem(original, translation) {
    const item = {
      original,
      translation,
      time: new Date().toLocaleTimeString('zh-TW', { hour12: false })
    };
    historyItems.unshift(item);
    if (historyItems.length > 200) historyItems.pop();

    const row = document.createElement('div');
    row.className = 'history-item';
    row.innerHTML = `
      <div style="font-size:0.75rem; color:#64748b; margin-bottom:2px;">[${item.time}]</div>
      <div class="history-original">${escapeHtml(original)}</div>
      <div class="history-translation">${escapeHtml(translation)}</div>
    `;

    historyList.prepend(row);
  }

  function escapeHtml(str) {
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  // Translation Service (Multi-Engine: Online Cloud + Chrome On-Device AI)
  const translationCache = new Map();

  function normalizeLangCode(code) {
    if (!code) return 'en';
    const map = {
      'zh-TW': 'zh-Hant',
      'zh-CN': 'zh-Hans',
      'zh-HK': 'zh-Hant',
      'en-US': 'en',
      'ja-JP': 'ja',
      'ko-KR': 'ko'
    };
    return map[code] || code.split('-')[0];
  }

  function getChromeTranslatorAPI() {
    if (typeof self !== 'undefined' && self.translator) {
      return { type: 'self.translator', api: self.translator };
    }
    if (typeof window !== 'undefined' && window.Translator) {
      return { type: 'window.Translator', api: window.Translator };
    }
    if (typeof window !== 'undefined' && window.translation) {
      return { type: 'window.translation', api: window.translation };
    }
    if (typeof window !== 'undefined' && window.ai && window.ai.translator) {
      return { type: 'window.ai.translator', api: window.ai.translator };
    }
    return null;
  }

  let activeChromeTranslator = null;
  let activeChromeTranslatorPair = null;
  let isCurrentChromeModelReady = false;

  async function checkChromeModelAvailability(sourceLang, targetLang) {
    const chromeAPI = getChromeTranslatorAPI();
    const sLang = normalizeLangCode(sourceLang);
    const tLang = normalizeLangCode(targetLang);
    const pairKey = `${sLang}->${tLang}`;

    if (!chromeAPI) {
      return {
        supported: false,
        status: 'unsupported_browser',
        message: '瀏覽器尚未啟用 Chrome 內建 AI Translation API (請看下方開啟指引)',
        badgeClass: 'badge-warn'
      };
    }

    // 1. If we already have an active translator for this pair in memory, it is 100% downloaded and ready
    if (activeChromeTranslator && activeChromeTranslatorPair === pairKey) {
      return {
        supported: true,
        status: 'readily',
        message: '✅ 本機模型已下載完成並已就緒 (可即時離線高速翻譯)',
        badgeClass: 'badge-success'
      };
    }

    try {
      // 2. Query Chrome Translation API with candidate language pairs
      const tryPairs = [
        { s: sLang, t: tLang },
        { s: sLang.split('-')[0], t: tLang.split('-')[0] }
      ];
      if (sLang.includes('Hant') || sLang.includes('Hans')) {
        tryPairs.push({ s: 'zh', t: tLang.split('-')[0] });
      }

      let detectedAvail = null;
      for (const pair of tryPairs) {
        if (chromeAPI.api.canTranslate) {
          try {
            const res = await chromeAPI.api.canTranslate({ sourceLanguage: pair.s, targetLanguage: pair.t });
            if (res && res !== 'no') {
              detectedAvail = res;
              break;
            } else if (res === 'no' && !detectedAvail) {
              detectedAvail = 'no';
            }
          } catch (e) {}
        }

        if (!detectedAvail && chromeAPI.api.availability) {
          try {
            const res = await chromeAPI.api.availability({ sourceLanguage: pair.s, targetLanguage: pair.t });
            if (res && res !== 'no') {
              detectedAvail = res;
              break;
            }
          } catch (e) {}
        }

        if (!detectedAvail && chromeAPI.api.capabilities) {
          try {
            const caps = await chromeAPI.api.capabilities();
            if (caps) {
              if (typeof caps.languagePairAvailable === 'function') {
                const res = caps.languagePairAvailable(pair.s, pair.t);
                if (res && res !== 'no') {
                  detectedAvail = res;
                  break;
                }
              }
              if (caps.available && caps.available !== 'no') {
                detectedAvail = caps.available;
                break;
              }
            }
          } catch (e) {}
        }
      }

      if (detectedAvail === 'readily') {
        localStorage.setItem(`chrome_model_ready_${pairKey}`, 'true');
        return {
          supported: true,
          status: 'readily',
          message: '✅ 本機模型已下載完成 (可離線極速翻譯)',
          badgeClass: 'badge-success'
        };
      } else if (detectedAvail === 'after-download') {
        const wasDownloaded = localStorage.getItem(`chrome_model_ready_${pairKey}`) === 'true';
        if (wasDownloaded) {
          return {
            supported: true,
            status: 'readily',
            message: '✅ 本機模型已下載完成 (已載入本機快取)',
            badgeClass: 'badge-success'
          };
        }
        return {
          supported: true,
          status: 'after-download',
          message: '📥 尚未下載本機模型 (請點擊下方下載按鈕)',
          badgeClass: 'badge-info'
        };
      } else if (detectedAvail === 'no') {
        return {
          supported: false,
          status: 'no',
          message: `⚠️ 此語言組合 (${sLang} ➜ ${tLang}) 暫不支援本機模型`,
          badgeClass: 'badge-error'
        };
      }
    } catch (e) {
      console.warn('check availability error:', e);
    }

    const wasDownloaded = localStorage.getItem(`chrome_model_ready_${pairKey}`) === 'true';
    if (wasDownloaded) {
      return {
        supported: true,
        status: 'readily',
        message: '✅ 本機模型已下載完成',
        badgeClass: 'badge-success'
      };
    }

    return {
      supported: true,
      status: 'after-download',
      message: '需下載或載入本機模型',
      badgeClass: 'badge-info'
    };
  }

  async function createChromeTranslator(sourceLang, targetLang, progressCallback) {
    const chromeAPI = getChromeTranslatorAPI();
    if (!chromeAPI) {
      throw new Error('Chrome 內建翻譯 API 未啟用');
    }

    const sLang = normalizeLangCode(sourceLang);
    const tLang = normalizeLangCode(targetLang);
    const pairKey = `${sLang}->${tLang}`;

    if (activeChromeTranslator && activeChromeTranslatorPair === pairKey) {
      return activeChromeTranslator;
    }

    const options = {
      sourceLanguage: sLang,
      targetLanguage: tLang
    };

    if (progressCallback) {
      options.monitor = (m) => {
        m.addEventListener('downloadprogress', (e) => {
          let percent = 0;
          if (e.total && e.total > 0) {
            percent = Math.min(100, Math.round((e.loaded / e.total) * 100));
          } else if (e.loaded <= 1) {
            percent = Math.min(100, Math.round(e.loaded * 100));
          }
          progressCallback(percent, e.loaded, e.total);
        });
      };
    }

    let translator = null;
    if (chromeAPI.api.create) {
      translator = await chromeAPI.api.create(options);
    } else if (chromeAPI.api.createTranslator) {
      translator = await chromeAPI.api.createTranslator(options);
    } else if (typeof chromeAPI.api === 'function') {
      translator = await chromeAPI.api(options);
    }

    if (translator) {
      activeChromeTranslator = translator;
      activeChromeTranslatorPair = pairKey;
      localStorage.setItem(`chrome_model_ready_${pairKey}`, 'true');
      return translator;
    }
    throw new Error('無法建立 Chrome 翻譯器實例');
  }

  async function translateWithChrome(text, sourceLang, targetLang) {
    const translator = await createChromeTranslator(sourceLang, targetLang);
    if (!translator) throw new Error('Translator 實例不可用');
    const res = await translator.translate(text);
    return (res || '').trim();
  }

  async function downloadChromeModel() {
    const btn = document.getElementById('btn-download-chrome-model');
    const icon = document.getElementById('download-model-icon');
    const text = document.getElementById('download-model-text');
    const progressBox = document.getElementById('chrome-model-progress-container');
    const progressBar = document.getElementById('chrome-model-progress-bar');
    const progressPercent = document.getElementById('chrome-model-progress-percent');
    const progressLabel = document.getElementById('chrome-progress-label');
    const statusText = document.getElementById('chrome-model-status-text');

    const chromeAPI = getChromeTranslatorAPI();
    if (!chromeAPI) {
      alert('您的 Chrome 瀏覽器尚未啟用 Translation API 實驗功能！\n請依照下方提示方框前往 chrome://flags/#translation-api 啟用。');
      return;
    }

    try {
      if (btn) btn.disabled = true;
      if (icon) icon.textContent = '⏳';
      if (text) text.textContent = '正在準備下載...';
      if (progressBox) progressBox.style.display = 'block';
      if (progressBar) progressBar.style.width = '0%';
      if (progressPercent) progressPercent.textContent = '0%';
      if (progressLabel) progressLabel.textContent = '正在下載本機語言包模型...';

      const sLang = currentSettings.sourceLang;
      const tLang = currentSettings.targetLang;
      const sNorm = normalizeLangCode(sLang);
      const tNorm = normalizeLangCode(tLang);
      const pairKey = `${sNorm}->${tNorm}`;

      await createChromeTranslator(sLang, tLang, (percent) => {
        if (progressBar) progressBar.style.width = `${percent}%`;
        if (progressPercent) progressPercent.textContent = `${percent}%`;
        if (progressLabel) progressLabel.textContent = `正在下載本機語言包模型 (${percent}%)...`;
      });

      // Finished
      localStorage.setItem(`chrome_model_ready_${pairKey}`, 'true');
      isCurrentChromeModelReady = true;

      if (progressBar) progressBar.style.width = '100%';
      if (progressPercent) progressPercent.textContent = '100%';
      if (progressLabel) progressLabel.textContent = '✅ 模型下載完成並已就緒！';
      if (icon) icon.textContent = '✅';
      if (text) text.textContent = '模型已就緒 (已下載完成)';
      if (btn) btn.classList.add('btn-model-ready');
      if (statusText) {
        statusText.innerHTML = '<span style="color:#34d399; font-weight:700;">✅ 已下載完成 (模型已就緒)</span>';
      }

      setTimeout(() => {
        if (progressBox) progressBox.style.display = 'none';
        if (btn) btn.disabled = false;
      }, 2000);

      await updateChromeTranslatorUI();
    } catch (err) {
      console.error('Download model failed:', err);
      if (progressLabel) progressLabel.textContent = `❌ 下載失敗: ${err.message || '未知錯誤'}`;
      if (icon) icon.textContent = '⚠️';
      if (text) text.textContent = '重試下載模型';
      if (btn) btn.disabled = false;
    }
  }

  async function testChromeTranslation() {
    const resultBox = document.getElementById('chrome-test-result-box');
    const resultText = document.getElementById('chrome-test-result-text');
    const testSample = currentSettings.sourceLang.startsWith('zh') ? '大家好，歡迎收看今天的直播！' :
                       currentSettings.sourceLang.startsWith('en') ? 'Hello everyone, welcome to the stream!' :
                       currentSettings.sourceLang.startsWith('ja') ? '皆さん、配信へようこそ！' : 'Hello world!';
    
    if (resultBox) resultBox.style.display = 'block';
    if (resultText) resultText.textContent = `翻譯中: "${testSample}" ...`;

    const sLang = currentSettings.sourceLang;
    const tLang = currentSettings.targetLang;

    try {
      const res = await translateWithChrome(testSample, sLang, tLang);
      if (resultText) {
        resultText.innerHTML = `<span style="color:#94a3b8;">原文:</span> ${testSample}<br><span style="color:#34d399;">Chrome 本機譯文:</span> <b>${res || '(無結果)'}</b>`;
      }
    } catch (err) {
      if (currentSettings.chromeFallbackOnline !== false) {
        const onlineRes = await translateOnline(testSample, sLang, tLang);
        if (resultText) {
          resultText.innerHTML = `<span style="color:#f59e0b;">(Chrome 本機未就緒，已自動啟用線上備援)</span><br><span style="color:#94a3b8;">原文:</span> ${testSample}<br><span style="color:#38bdf8;">線上譯文:</span> <b>${onlineRes || '(無結果)'}</b>`;
        }
      } else {
        if (resultText) {
          resultText.innerHTML = `<span style="color:#f87171;">❌ 翻譯失敗: ${err.message} (請確認本機模型已下載完成)</span>`;
        }
      }
    }
  }

  async function updateChromeTranslatorUI(isManualCheck = false) {
    const apiBadge = document.getElementById('chrome-api-status-badge');
    const pairText = document.getElementById('chrome-model-pair-text');
    const statusText = document.getElementById('chrome-model-status-text');
    const flagsGuide = document.getElementById('chrome-flags-guide');
    const downloadBtn = document.getElementById('btn-download-chrome-model');
    const downloadIcon = document.getElementById('download-model-icon');
    const downloadText = document.getElementById('download-model-text');
    const btnCheckChromeAvail = document.getElementById('btn-check-chrome-avail');

    const sLang = currentSettings.sourceLang;
    const tLang = currentSettings.targetLang;
    const sNorm = normalizeLangCode(sLang);
    const tNorm = normalizeLangCode(tLang);

    // Provide visual loading state if user clicked "重新檢測"
    if (isManualCheck && btnCheckChromeAvail) {
      btnCheckChromeAvail.disabled = true;
      btnCheckChromeAvail.innerHTML = '<span class="spin">🔄</span> 檢測中...';
      if (statusText) {
        statusText.innerHTML = '<span style="color:#38bdf8;">🔍 正在檢測 Chrome 模型下載狀態...</span>';
      }
    }

    const availability = await checkChromeModelAvailability(sLang, tLang);

    if (availability.status === 'unsupported_browser') {
      isCurrentChromeModelReady = false;
      if (apiBadge) {
        apiBadge.textContent = 'API 未啟用';
        apiBadge.style.background = 'rgba(239, 68, 68, 0.2)';
        apiBadge.style.color = '#f87171';
      }
      if (statusText) {
        statusText.innerHTML = '<span style="color:#f87171; font-weight:600;">⚠️ 尚未開啟 Chrome Translation API 實驗功能</span>';
      }
      if (pairText) pairText.textContent = `${sLang} (${sNorm}) ➜ ${tLang} (${tNorm})`;
      if (flagsGuide) flagsGuide.style.display = 'block';
      if (downloadBtn) {
        downloadBtn.disabled = true;
        downloadBtn.classList.remove('btn-model-ready');
      }
      if (downloadText) downloadText.textContent = 'API 未啟用';
      if (downloadIcon) downloadIcon.textContent = '⚠️';

      if (isManualCheck && btnCheckChromeAvail) {
        btnCheckChromeAvail.innerHTML = '⚠️ 未開啟';
        btnCheckChromeAvail.style.color = '#f87171';
        setTimeout(() => {
          btnCheckChromeAvail.disabled = false;
          btnCheckChromeAvail.innerHTML = '🔄 重新檢測';
          btnCheckChromeAvail.style.color = '';
        }, 1600);
      }
    } else {
      if (apiBadge) {
        apiBadge.textContent = 'API 支援正常';
        apiBadge.style.background = 'rgba(16, 185, 129, 0.2)';
        apiBadge.style.color = '#34d399';
      }
      if (flagsGuide) flagsGuide.style.display = 'none';
      if (downloadBtn) downloadBtn.disabled = false;

      if (availability.status === 'readily') {
        isCurrentChromeModelReady = true;
        if (statusText) {
          statusText.innerHTML = '<span style="color:#34d399; font-weight:700;">✅ 已下載完成 (模型已就緒)</span>';
        }
        if (downloadIcon) downloadIcon.textContent = '✅';
        if (downloadText) downloadText.textContent = '模型已就緒 (已下載完成)';
        if (downloadBtn) {
          downloadBtn.classList.add('btn-model-ready');
          downloadBtn.title = '當前語言模型已下載完成，可進行離線高速翻譯！點擊可重新建立實例。';
        }
        if (pairText) {
          pairText.innerHTML = `${sLang} (${sNorm}) ➜ ${tLang} (${tNorm}) <span class="badge" style="background:rgba(16,185,129,0.2); color:#34d399; font-size:0.7rem; margin-left:4px; padding:1px 6px; border-radius:4px; border:1px solid rgba(16,185,129,0.35);">已下載完成</span>`;
        }

        if (isManualCheck && btnCheckChromeAvail) {
          btnCheckChromeAvail.innerHTML = '✅ 已就緒';
          btnCheckChromeAvail.style.color = '#34d399';
          setTimeout(() => {
            btnCheckChromeAvail.disabled = false;
            btnCheckChromeAvail.innerHTML = '🔄 重新檢測';
            btnCheckChromeAvail.style.color = '';
          }, 1600);
        }
      } else if (availability.status === 'after-download') {
        isCurrentChromeModelReady = false;
        if (statusText) {
          statusText.innerHTML = '<span style="color:#38bdf8; font-weight:600;">📥 尚未下載模型 (需點擊下載)</span>';
        }
        if (downloadIcon) downloadIcon.textContent = '📥';
        if (downloadText) downloadText.textContent = '下載 / 載入本機模型';
        if (downloadBtn) {
          downloadBtn.classList.remove('btn-model-ready');
          downloadBtn.title = '下載當前語言組合的 Chrome 本機翻譯模型';
        }
        if (pairText) {
          pairText.innerHTML = `${sLang} (${sNorm}) ➜ ${tLang} (${tNorm}) <span class="badge" style="background:rgba(56,189,248,0.15); color:#38bdf8; font-size:0.7rem; margin-left:4px; padding:1px 6px; border-radius:4px; border:1px solid rgba(56,189,248,0.3);">需下載</span>`;
        }

        if (isManualCheck && btnCheckChromeAvail) {
          btnCheckChromeAvail.innerHTML = '📥 需下載';
          btnCheckChromeAvail.style.color = '#38bdf8';
          setTimeout(() => {
            btnCheckChromeAvail.disabled = false;
            btnCheckChromeAvail.innerHTML = '🔄 重新檢測';
            btnCheckChromeAvail.style.color = '';
          }, 1600);
        }
      } else {
        isCurrentChromeModelReady = false;
        if (statusText) {
          statusText.innerHTML = `<span style="color:#f87171; font-weight:600;">${availability.message}</span>`;
        }
        if (downloadIcon) downloadIcon.textContent = '⚠️';
        if (downloadText) downloadText.textContent = '語言組合不支援';
        if (downloadBtn) {
          downloadBtn.classList.remove('btn-model-ready');
          downloadBtn.disabled = true;
        }
        if (pairText) {
          pairText.textContent = `${sLang} (${sNorm}) ➜ ${tLang} (${tNorm})`;
        }

        if (isManualCheck && btnCheckChromeAvail) {
          btnCheckChromeAvail.innerHTML = '⚠️ 不支援';
          btnCheckChromeAvail.style.color = '#f87171';
          setTimeout(() => {
            btnCheckChromeAvail.disabled = false;
            btnCheckChromeAvail.innerHTML = '🔄 重新檢測';
            btnCheckChromeAvail.style.color = '';
          }, 1600);
        }
      }
    }

    updateCollapsibleSummaries();
  }

  // Online Cloud Translation Engine (Server + Google GTX + Dict + MyMemory)
  async function translateOnline(trimmed, sl, tl, cacheKey = '') {
    // 1. Try local server endpoint first
    try {
      const resp = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed, sl, tl }),
        signal: AbortSignal.timeout(5000)
      });
      if (resp.ok) {
        const json = await resp.json();
        if (json.success && json.translated) {
          if (cacheKey) translationCache.set(cacheKey, json.translated);
          return json.translated;
        }
      }
    } catch (e) {
      // Server translation failed or timed out, fallback to client-side fetch
    }

    // 2. Client-side Google GTX fallback
    try {
      const gUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sl)}&tl=${encodeURIComponent(tl)}&dt=t&dj=1&q=${encodeURIComponent(trimmed)}`;
      const gResp = await fetch(gUrl, { signal: AbortSignal.timeout(5000) });
      if (gResp.ok) {
        const gData = await gResp.json();
        const trans = (gData.sentences || []).map(s => s.trans || '').join('').trim();
        if (trans) {
          if (cacheKey) translationCache.set(cacheKey, trans);
          return trans;
        }
      }
    } catch (e) {}

    // 2.5 Client-side Google Dict fallback
    try {
      const dUrl = `https://translate.googleapis.com/translate_a/single?client=dict-chrome-ex&sl=${encodeURIComponent(sl)}&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(trimmed)}`;
      const dResp = await fetch(dUrl, { signal: AbortSignal.timeout(5000) });
      if (dResp.ok) {
        const dData = await dResp.json();
        const trans = (dData[0] || []).map(x => x[0] || '').join('').trim();
        if (trans) {
          if (cacheKey) translationCache.set(cacheKey, trans);
          return trans;
        }
      }
    } catch (e) {}

    // 3. Client-side MyMemory fallback
    try {
      const mUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=${encodeURIComponent(sl)}|${encodeURIComponent(tl)}`;
      const mResp = await fetch(mUrl, { signal: AbortSignal.timeout(5000) });
      if (mResp.ok) {
        const mData = await mResp.json();
        const trans = (mData.responseData && mData.responseData.translatedText || '').trim();
        if (trans && !/MYMEMORY WARNING|INVALID LANGUAGE/i.test(trans)) {
          if (cacheKey) translationCache.set(cacheKey, trans);
          return trans;
        }
      }
    } catch (e) {}

    return '';
  }

  async function translateText(text) {
    const trimmed = text.trim();
    if (!trimmed) return '';

    const sl = currentSettings.sourceLang;
    const tl = currentSettings.targetLang;
    const engine = currentSettings.transEngine || 'online';
    const cacheKey = `${engine}:${sl}->${tl}:${trimmed}`;

    if (translationCache.has(cacheKey)) {
      return translationCache.get(cacheKey);
    }

    if (engine === 'chrome') {
      try {
        const trans = await translateWithChrome(trimmed, sl, tl);
        if (trans) {
          translationCache.set(cacheKey, trans);
          return trans;
        }
      } catch (chromeErr) {
        console.warn('Chrome on-device translation error:', chromeErr);
        if (currentSettings.chromeFallbackOnline === false) {
          return '';
        }
        // Fallback to online translation
      }
    }

    const onlineTrans = await translateOnline(trimmed, sl, tl, cacheKey);
    if (onlineTrans) {
      translationCache.set(cacheKey, onlineTrans);
    }
    return onlineTrans;
  }

  // Speech Recognition Engine Setup
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let wantListen = false;
  let isRunning = false;
  let startLock = false;
  let startLockTime = 0;
  let blockRestart = false;
  let sessionStartedAt = 0;
  let lastSpeechEventTime = 0;
  let lastAudioDetectedTime = 0;
  let gotResultThisSession = false;
  let restartTimer = null;
  let consecutiveFastEnds = 0;

  let committedUpTo = 0;
  let interimZh = '';
  let interimTrans = '';
  let interimToken = 0;
  let interimTimer = null;
  let stableTimer = null;
  let lastInterimSent = '';
  let lastCommitAt = 0;

  let interimTransTimer = null;
  let interimTransToken = 0;

  function scheduleInterimTranslation(text) {
    const raw = text.trim();
    if (!raw) return;

    if (currentSettings.displayMode === 'original') return;

    // Check memory cache first
    const cacheKey = `${currentSettings.sourceLang}->${currentSettings.targetLang}:${raw}`;
    if (translationCache.has(cacheKey)) {
      interimTrans = translationCache.get(cacheKey);
      renderSubtitle(interimZh, interimTrans, false);
      broadcastData('subtitle', {
        original: interimZh,
        translation: interimTrans,
        isFinal: false
      });
      return;
    }

    const token = ++interimTransToken;
    clearTimeout(interimTransTimer);

    // Fast debounce: 150ms for Chrome local AI, 260ms for online cloud
    const debounceMs = currentSettings.transEngine === 'chrome' ? 150 : 260;

    interimTransTimer = setTimeout(async () => {
      if (token !== interimTransToken) return;
      if (!interimZh.trim() || interimZh.trim() !== raw) return;

      try {
        const trans = await translateText(raw);
        if (token === interimTransToken && interimZh.trim() === raw && trans) {
          interimTrans = trans;
          renderSubtitle(interimZh, interimTrans, false);
          broadcastData('subtitle', {
            original: interimZh,
            translation: interimTrans,
            isFinal: false
          });
        }
      } catch (e) {}
    }, debounceMs);
  }

  const SPEECH_SPEED_CONFIG = {
    ultra: {
      stableMs: 400,        // 400ms 極短停頓立即結算
      maxChunkChars: 15,    // 15字長句自動智慧切句 (確保1行)
      speechEndWait: 260
    },
    normal: {
      stableMs: 650,        // 650ms 敏捷標準停頓
      maxChunkChars: 18,    // 18字長句自動切句 (確保1行)
      speechEndWait: 380
    },
    relaxed: {
      stableMs: 1000,       // 1000ms 悠閒會議長句
      maxChunkChars: 24,    // 24字長句
      speechEndWait: 600
    }
  };

  function getSpeedConfig() {
    return SPEECH_SPEED_CONFIG[currentSettings.speechSpeedMode] || SPEECH_SPEED_CONFIG.normal;
  }

  function setStatus(text, mode = '') {
    if (statusText) statusText.textContent = text;
    if (statusDot) statusDot.className = 'dot' + (mode === 'on' ? ' on' : mode === 'warn' ? ' warn' : mode === 'error' ? ' error' : '');
  }

  function updateListenButton() {
    btnToggleListen.classList.toggle('listening', wantListen);
    listenBtnText.textContent = wantListen ? t('btn_listen_stop', '停止聆聽') : t('btn_listen_start', '開始聆聽');
    listenIcon.textContent = wantListen ? '⏹️' : '🎤';

    if (btnToggleListenHud) {
      btnToggleListenHud.classList.toggle('listening', wantListen);
      listenBtnTextHud.textContent = wantListen ? t('btn_listen_stop', '停止聆聽') : t('btn_listen_start', '開始聆聽');
      listenIconHud.textContent = wantListen ? '⏹️' : '🎤';
    }
  }

  function normalize(text) {
    return text.replace(/[\s，。！？、,.!?;；：:「」"'“”‘’（）()\-]/g, '').toLowerCase();
  }

  function isMeaningful(text) {
    return text && text.trim().length > 0;
  }

  let recentCommittedList = [];
  function recordCommittedSentence(text) {
    const norm = normalize(text);
    if (!norm) return;
    const now = Date.now();
    recentCommittedList.push({ norm, raw: text.trim(), time: now });
    recentCommittedList = recentCommittedList.filter(item => now - item.time < 5000);
  }

  function scheduleCommit(delay) {
    clearTimeout(stableTimer);
    stableTimer = setTimeout(() => {
      const text = interimZh.trim();
      if (text) {
        recordCommittedSentence(text);
        commitSentence(text);
      }
    }, delay);
  }

  async function processSingleSentence(rawSentence) {
    const raw = rawSentence.trim();
    if (!isMeaningful(raw)) return;

    const cacheKey = `${currentSettings.sourceLang}->${currentSettings.targetLang}:${raw}`;
    const cachedTrans = translationCache.get(cacheKey) || '';

    // If already in cache, display immediately!
    if (cachedTrans) {
      renderSubtitle(raw, cachedTrans, true);
      broadcastData('subtitle', {
        original: raw,
        translation: cachedTrans,
        isFinal: true
      });
      addHistoryItem(raw, cachedTrans);
      if (wantListen) setStatus(t('status_listening', '正在聆聽麥克風... (請說話)'), 'on');
      return;
    }

    if (wantListen) setStatus(t('status_listening', '正在聆聽麥克風... (請說話)'), 'on');

    try {
      const trans = await translateText(raw);
      // Only render and broadcast when translation response is received!
      if (trans && trans !== '（翻譯未取得）') {
        renderSubtitle(raw, trans, true);
        broadcastData('subtitle', {
          original: raw,
          translation: trans,
          isFinal: true
        });
        addHistoryItem(raw, trans);
      } else if (currentSettings.displayMode === 'original') {
        renderSubtitle(raw, '', true);
        broadcastData('subtitle', {
          original: raw,
          translation: '',
          isFinal: true
        });
        addHistoryItem(raw, '');
      }
    } catch (e) {
      console.warn('Translation error:', e);
      if (currentSettings.displayMode === 'original') {
        renderSubtitle(raw, '', true);
        broadcastData('subtitle', {
          original: raw,
          translation: '',
          isFinal: true
        });
        addHistoryItem(raw, '');
      }
    } finally {
      if (wantListen) setStatus(t('status_listening', '正在聆聽麥克風... (請說話)'), 'on');
    }
  }

  async function commitSentence(text) {
    const raw = text.trim();
    if (!isMeaningful(raw)) return;

    recordCommittedSentence(raw);
    clearTimeout(stableTimer);
    clearTimeout(interimTransTimer);
    interimTransToken++;
    interimZh = '';
    interimTrans = '';

    // Split multiple sentences so each is treated individually without stacking
    const sentences = raw.split(/(?<=[。！？\n])/).map(s => s.trim()).filter(s => isMeaningful(s));
    for (const s of (sentences.length > 0 ? sentences : [raw])) {
      await processSingleSentence(s);
    }
  }

  // Detect if current browser is Google Chrome
  function checkChromeBrowser() {
    const ua = navigator.userAgent || '';
    const vendor = navigator.vendor || '';
    const hasChrome = /Chrome|CriOS/i.test(ua);
    const isEdge = /Edg|Edge/i.test(ua);
    const isOpera = /OPR|Opera/i.test(ua);
    const isVivaldi = /Vivaldi/i.test(ua);
    const isSamsung = /SamsungBrowser/i.test(ua);
    const isBrave = !!(navigator.brave && typeof navigator.brave.isBrave === 'function');
    const isOBS = /OBS\//i.test(ua);
    const isFirefox = /Firefox/i.test(ua);
    const isSafariOnly = /Safari/i.test(ua) && !hasChrome;

    const isChrome = hasChrome && !isEdge && !isOpera && !isVivaldi && !isSamsung && !isBrave && !isOBS && !isFirefox && !isSafariOnly && /Google Inc/.test(vendor);

    if (!isChrome) {
      const msg = t('alert_chrome_only', '⚠️ 本系統只支援 Google Chrome 瀏覽器！\n\n語音辨識與翻譯功能需使用 Chrome 核心。檢測到您目前不是使用 Google Chrome，部分或全部功能可能無法正常運作。\n請使用 Google Chrome 瀏覽器開啟本頁面。');
      alert(msg);
      return false;
    }
    return true;
  }

  // Initialize Speech Recognition on page load
  function initRecognition() {
    checkChromeBrowser();

    const isOBS = /OBS\//i.test(navigator.userAgent);
    const obsWarningEl = document.getElementById('obs-browser-warning');

    if (isOBS && obsWarningEl) {
      obsWarningEl.style.display = 'block';
    }

    if (!SpeechRecognition) {
      if (isOBS) {
        setStatus(t('status_obs_mic_error', 'OBS 內建瀏覽器無法讀取麥克風，請使用 Chrome 開啟此頁面'), 'error');
      } else {
        setStatus(t('status_speech_unsupported', '瀏覽器不支援語音辨識，請使用 Google Chrome'), 'error');
      }
      btnToggleListen.disabled = true;
      if (btnToggleListenHud) btnToggleListenHud.disabled = true;
      return;
    }
  }

  // Safe teardown of recognition instance
  function destroyRecognition() {
    if (recognition) {
      recognition.onstart = null;
      recognition.onspeechstart = null;
      recognition.onresult = null;
      recognition.onspeechend = null;
      recognition.onerror = null;
      recognition.onend = null;
      try { recognition.abort(); } catch (e) {}
      recognition = null;
    }
    isRunning = false;
    startLock = false;
    startLockTime = 0;
  }

  // Centralized auto-heal recovery when engine is frozen or deadlocked
  function forceRecoverRecognition(reason) {
    if (!wantListen || blockRestart) return;
    console.warn(`[SpeechRecognition Auto-Heal] 重新復原語音辨識連線: ${reason}`);
    clearTimeout(restartTimer);
    clearTimeout(stableTimer);
    clearTimeout(interimTransTimer);
    destroyRecognition();
    restartTimer = setTimeout(() => {
      if (wantListen && !blockRestart) {
        safeStart();
      }
    }, 100);
  }

  // Create clean SpeechRecognition instance on every session start/restart
  function createRecognition() {
    if (!SpeechRecognition) return null;

    destroyRecognition();

    const rec = new SpeechRecognition();
    rec.lang = currentSettings.sourceLang || 'zh-TW';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    let committedCharsInCurrentInterim = 0;

    rec.onstart = () => {
      isRunning = true;
      startLock = false;
      startLockTime = 0;
      lastSpeechEventTime = Date.now();
      committedUpTo = 0;
      committedCharsInCurrentInterim = 0;
      sessionStartedAt = Date.now();
      gotResultThisSession = false;
      consecutiveFastEnds = 0;
      setStatus(t('status_listening', '正在聆聽麥克風... (請說話)'), 'on');
    };

    rec.onspeechstart = () => {
      lastSpeechEventTime = Date.now();
      setStatus(t('status_speaking', '辨識說話中...'), 'on');
    };

    rec.onresult = (event) => {
      lastSpeechEventTime = Date.now();
      gotResultThisSession = true;
      consecutiveFastEnds = 0;
      let finalText = '';
      let nextInterim = '';

      for (let i = 0; i < event.results.length; i++) {
        const res = event.results[i];
        const transcript = res[0] ? res[0].transcript : '';
        if (!transcript) continue;

        if (res.isFinal) {
          if (i >= committedUpTo) {
            const effectiveFinal = (committedCharsInCurrentInterim > 0 && transcript.length >= committedCharsInCurrentInterim)
              ? transcript.slice(committedCharsInCurrentInterim)
              : transcript;
            committedUpTo = i + 1;
            committedCharsInCurrentInterim = 0;

            const trimmedFinal = effectiveFinal.trim();
            if (trimmedFinal) {
              const normFinal = normalize(trimmedFinal);
              const alreadyCommitted = recentCommittedList.some(item =>
                item.norm === normFinal ||
                (normFinal.length >= 4 && item.norm.endsWith(normFinal)) ||
                (item.norm.length >= 4 && normFinal.endsWith(item.norm))
              );
              if (!alreadyCommitted) {
                finalText += (finalText ? ' ' : '') + trimmedFinal;
              }
            }
          }
        } else {
          let effectiveInterim = (committedCharsInCurrentInterim > 0 && transcript.length >= committedCharsInCurrentInterim)
            ? transcript.slice(committedCharsInCurrentInterim)
            : transcript;

          for (const item of recentCommittedList) {
            if (item.raw && effectiveInterim.trim().startsWith(item.raw)) {
              effectiveInterim = effectiveInterim.trim().slice(item.raw.length);
            }
          }
          nextInterim += effectiveInterim;
        }
      }

      if (finalText.trim()) {
        commitSentence(finalText.trim());
      }

      interimZh = nextInterim;

      const config = getSpeedConfig();

      // Smart clause chunking for fast continuous speakers without pauses
      if (interimZh.length >= config.maxChunkChars) {
        const breakMatch = interimZh.match(/([，,。！!？?、；;]|\s+|(?<=[^\s]{4,})(但是|然後|所以|現在|因為|接著|而且|大家|那麼|不過|可是|另外))/);
        if (breakMatch && breakMatch.index && breakMatch.index >= 5) {
          const splitIdx = breakMatch.index + breakMatch[0].length;
          const chunkHead = interimZh.slice(0, splitIdx).trim();
          const chunkTail = interimZh.slice(splitIdx).trim();
          if (chunkHead) {
            commitSentence(chunkHead);
            committedCharsInCurrentInterim += splitIdx;
            interimZh = chunkTail;
          }
        }
      }

      if (interimZh.trim()) {
        const isStreaming = (currentSettings.streamMode || 'streaming') !== 'sentence';
        if (isStreaming) {
          // Approach A: Real-time Streaming Display (words appear immediately as spoken)
          renderSubtitle(interimZh, interimTrans, false);
          broadcastData('subtitle', {
            original: interimZh,
            translation: interimTrans,
            isFinal: false
          });
          scheduleInterimTranslation(interimZh);
        }

        if (wantListen) setStatus(`🎙️ ${t('status_speaking', '辨識說話中...')}: 「${interimZh.slice(-14)}」`, 'on');
        scheduleCommit(config.stableMs);
      } else {
        clearTimeout(stableTimer);
        clearTimeout(interimTransTimer);
        if (wantListen) setStatus(t('status_listening', '正在聆聽麥克風... (請說話)'), 'on');
      }

      if (wantListen && !interimZh.trim()) setStatus(t('status_listening', '正在聆聽麥克風... (請說話)'), 'on');
    };

    rec.onspeechend = () => {
      lastSpeechEventTime = Date.now();
      if (interimZh.trim()) {
        const config = getSpeedConfig();
        scheduleCommit(config.speechEndWait);
      }
    };

    rec.onerror = (event) => {
      const code = event.error;
      console.warn('SpeechRecognition error:', code);
      lastSpeechEventTime = Date.now();

      // Normal pauses/silence in Chrome, don't abort
      if (code === 'aborted' || code === 'no-speech') return;

      if (code === 'not-allowed' || code === 'service-not-allowed') {
        blockRestart = true;
        wantListen = false;
        destroyRecognition();
        updateListenButton();
        stopVolumeMeter();
        setStatus(t('status_mic_permission', '請在網址列左側 🔒 圖示允許「麥克風」存取權限'), 'error');
        return;
      }

      if (code === 'audio-capture') {
        consecutiveFastEnds++;
        if (consecutiveFastEnds >= 3) {
          blockRestart = true;
          wantListen = false;
          destroyRecognition();
          updateListenButton();
          stopVolumeMeter();
          setStatus(t('status_mic_not_found', '找不到麥克風設備，請檢查電腦音訊輸入設定'), 'error');
          return;
        }
      }

      if (code === 'network') {
        setStatus(t('status_recovering', '語音連線不穩，系統自動復原中...'), 'warn');
        clearTimeout(restartTimer);
        restartTimer = setTimeout(() => {
          if (wantListen && !blockRestart) {
            forceRecoverRecognition('network_error');
          }
        }, 500);
      }
    };

    rec.onend = () => {
      isRunning = false;
      startLock = false;

      if (!wantListen || blockRestart) {
        if (!wantListen) setStatus(t('status_stopped', '語音辨識已停止'), '');
        return;
      }

      // Auto-restart safely with a fresh instance
      setStatus(t('status_connecting', '語音辨識連線中...'), 'on');
      clearTimeout(restartTimer);
      restartTimer = setTimeout(() => {
        if (wantListen && !blockRestart && !isRunning) {
          safeStart();
        }
      }, 120);
    };

    recognition = rec;
    return rec;
  }

  function safeStart() {
    if (!wantListen || blockRestart) return;
    clearTimeout(restartTimer);

    const now = Date.now();
    // Deadlock breaker: if startLock has been held for > 2.5s without onstart, reset it
    if (startLock && (now - startLockTime > 2500)) {
      console.warn('[SpeechRecognition] 偵測到啟動鎖定卡死，自動清除鎖定');
      destroyRecognition();
    }

    if (isRunning || startLock) return;

    try {
      const rec = createRecognition();
      if (!rec) return;
      startLock = true;
      startLockTime = Date.now();
      sessionStartedAt = Date.now();
      lastSpeechEventTime = Date.now();
      rec.start();
    } catch (err) {
      console.warn('safeStart error:', err);
      destroyRecognition();
      if (wantListen && !blockRestart) {
        restartTimer = setTimeout(safeStart, 400);
      }
    }
  }

  // Multi-tier Watchdog Heartbeat: ensures recognition never silently stops, hangs, or zombies while wantListen is true
  setInterval(() => {
    if (!wantListen || blockRestart) return;

    const now = Date.now();

    // 1. Deadlock breaker: startLock stuck for > 2.5s
    if (startLock && (now - startLockTime > 2500)) {
      console.warn('[Watchdog] 啟動鎖定逾時 (>2.5s)，自動重啟辨識');
      forceRecoverRecognition('start_lock_timeout');
      return;
    }

    // 2. Stopped watcher: should be listening but is not running
    if (!isRunning && !startLock) {
      safeStart();
      return;
    }

    // 3. Smart VAD Auto-Heal: Mic is picking up speech sound, but SpeechRecognition is completely silent/zombie!
    if (isRunning && lastAudioDetectedTime > 0) {
      const soundRecently = (now - lastAudioDetectedTime) < 2000;
      const recSilent = (now - lastSpeechEventTime) > 4500;
      if (soundRecently && recSilent) {
        console.warn('[Watchdog] 麥克風持續收到聲音但語音辨識無回應 (殭屍狀態)，自動無縫重啟！');
        forceRecoverRecognition('sound_detected_but_rec_silent');
        return;
      }
    }

    // 4. Preventive session recycle during silence:
    // If recognition has been running for > 60s, and there's currently a quiet pause (no interim text and mic quiet for > 1.5s)
    if (isRunning && (now - sessionStartedAt > 60000)) {
      const isQuiet = (now - lastAudioDetectedTime > 1500) && (!interimZh || !interimZh.trim());
      if (isQuiet) {
        console.log('[Watchdog] 安靜空檔無縫重整連線，確保長時間辨識精準不卡頓');
        forceRecoverRecognition('preventive_recycle');
        return;
      }
    }
  }, 1000);

  // Auto-heal on visibility and window focus changes
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().catch(() => {});
      }
      if (wantListen && (!isRunning || (Date.now() - lastSpeechEventTime > 6000))) {
        console.log('[Visibility] 視窗切換回前景，檢查並復原語音辨識連線');
        forceRecoverRecognition('visibility_resume');
      }
    }
  });

  window.addEventListener('focus', () => {
    if (wantListen && !isRunning) {
      safeStart();
    }
  });

  // Audio Settings & Context for Volume Meter
  const audioSettingsKey = 'obs_audio_settings';
  let currentAudioSettings = {
    deviceId: 'default',
    gain: 100,
    noiseSuppression: true,
    echoCancellation: true,
    autoGainControl: true
  };
  try {
    const savedAudio = localStorage.getItem(audioSettingsKey);
    if (savedAudio) {
      currentAudioSettings = { ...currentAudioSettings, ...JSON.parse(savedAudio) };
    }
  } catch (e) {}

  function saveAudioSettings() {
    try {
      localStorage.setItem(audioSettingsKey, JSON.stringify(currentAudioSettings));
    } catch (e) {}
  }

  function getAudioConstraints() {
    const constraints = {
      echoCancellation: currentAudioSettings.echoCancellation,
      noiseSuppression: currentAudioSettings.noiseSuppression,
      autoGainControl: currentAudioSettings.autoGainControl
    };
    if (currentAudioSettings.deviceId && currentAudioSettings.deviceId !== 'default') {
      constraints.deviceId = { exact: currentAudioSettings.deviceId };
    }
    return constraints;
  }

  let audioContext = null;
  let analyser = null;
  let gainNode = null;
  let micStream = null;
  let testMicStream = null;
  let isTestingMic = false;
  let meterAnimationId = null;

  function startVolumeMeterWithStream(stream) {
    try {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioContext.state === 'suspended') {
        audioContext.resume().catch(() => {});
      }
      const source = audioContext.createMediaStreamSource(stream);
      gainNode = audioContext.createGain();
      const gainVal = (currentAudioSettings.gain || 100) / 100;
      gainNode.gain.setValueAtTime(gainVal, audioContext.currentTime);

      analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      source.connect(gainNode);
      gainNode.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      function updateMeter() {
        if (!wantListen && !isTestingMic) {
          if (volumeBar) volumeBar.style.width = '0%';
          const micCardBar = document.getElementById('mic-settings-volume-bar');
          if (micCardBar) micCardBar.style.width = '0%';
          const micDbText = document.getElementById('mic-db-text');
          if (micDbText) micDbText.textContent = '0%';
          return;
        }
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const percent = Math.min(100, Math.round((avg / 128) * 100));

        // Track live audio presence to detect stuck/zombie speech recognition
        if (percent >= 4 || avg >= 5) {
          lastAudioDetectedTime = Date.now();
        }
        
        // Update top navbar meter
        if (volumeBar) volumeBar.style.width = `${percent}%`;
        
        // Update settings card meter
        const micCardBar = document.getElementById('mic-settings-volume-bar');
        if (micCardBar) {
          micCardBar.style.width = `${percent}%`;
          if (percent > 75) {
            micCardBar.style.background = 'linear-gradient(90deg, #10b981, #f59e0b, #ef4444)';
          } else if (percent > 35) {
            micCardBar.style.background = 'linear-gradient(90deg, #10b981, #38bdf8)';
          } else {
            micCardBar.style.background = 'var(--accent-green)';
          }
        }
        const micDbText = document.getElementById('mic-db-text');
        if (micDbText) micDbText.textContent = `${percent}%`;

        meterAnimationId = requestAnimationFrame(updateMeter);
      }
      updateMeter();
    } catch (e) {
      console.warn('Volume meter error:', e);
    }
  }

  function stopVolumeMeter() {
    if (meterAnimationId) {
      cancelAnimationFrame(meterAnimationId);
      meterAnimationId = null;
    }
    if (micStream) {
      micStream.getTracks().forEach(t => t.stop());
      micStream = null;
    }
    if (volumeBar) volumeBar.style.width = '0%';
    const micCardBar = document.getElementById('mic-settings-volume-bar');
    if (micCardBar) micCardBar.style.width = '0%';
    const micDbText = document.getElementById('mic-db-text');
    if (micDbText) micDbText.textContent = '0%';
  }

  async function refreshMicDevices(requestPermission = false) {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return;
      }
      if (requestPermission && !micStream && !testMicStream) {
        try {
          const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          tempStream.getTracks().forEach(t => t.stop());
        } catch (err) {}
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(d => d.kind === 'audioinput');
      const select = document.getElementById('select-mic-device');
      if (!select) return;

      select.innerHTML = '';
      const defaultOpt = document.createElement('option');
      defaultOpt.value = 'default';
      defaultOpt.textContent = '系統預設麥克風 (System Default)';
      select.appendChild(defaultOpt);

      let foundSaved = false;
      const savedDeviceId = currentAudioSettings.deviceId || 'default';

      audioInputs.forEach((device, index) => {
        if (!device.deviceId || device.deviceId === 'default') return;
        const opt = document.createElement('option');
        opt.value = device.deviceId;
        opt.textContent = device.label || `麥克風裝置 ${index + 1} (${device.deviceId.slice(0, 8)}...)`;
        if (device.deviceId === savedDeviceId) {
          opt.selected = true;
          foundSaved = true;
        }
        select.appendChild(opt);
      });

      if (!foundSaved && savedDeviceId === 'default') {
        defaultOpt.selected = true;
      }
      updateCollapsibleSummaries();
    } catch (e) {
      console.warn('refreshMicDevices error:', e);
    }
  }

  async function restartActiveAudio() {
    if (isTestingMic && testMicStream) {
      testMicStream.getTracks().forEach(t => t.stop());
      testMicStream = null;
      try {
        const constraints = getAudioConstraints();
        testMicStream = await navigator.mediaDevices.getUserMedia({ audio: constraints });
        startVolumeMeterWithStream(testMicStream);
      } catch (e) {
        console.warn('Restart test mic error:', e);
      }
    } else if (wantListen && micStream) {
      micStream.getTracks().forEach(t => t.stop());
      micStream = null;
      try {
        const constraints = getAudioConstraints();
        micStream = await navigator.mediaDevices.getUserMedia({ audio: constraints });
        startVolumeMeterWithStream(micStream);
        forceRecoverRecognition('mic_settings_changed');
      } catch (e) {
        console.warn('Restart listen mic error:', e);
      }
    }
  }

  function initMicSettingsUI() {
    const selectMic = document.getElementById('select-mic-device');
    const btnRefresh = document.getElementById('btn-refresh-mics');
    const btnTestMic = document.getElementById('btn-test-mic');
    const testIcon = document.getElementById('test-mic-icon');
    const testText = document.getElementById('test-mic-text');
    const testStatus = document.getElementById('mic-test-status');
    const sliderGain = document.getElementById('slider-mic-gain');
    const labelGain = document.getElementById('label-mic-gain');
    const checkNoise = document.getElementById('check-noise-suppression');
    const checkEcho = document.getElementById('check-echo-cancellation');
    const checkAutoGain = document.getElementById('check-auto-gain');

    // Sync UI with currentAudioSettings
    if (sliderGain) {
      sliderGain.value = currentAudioSettings.gain || 100;
      const g = currentAudioSettings.gain || 100;
      if (labelGain) labelGain.textContent = `${g}% ${g === 100 ? '(標準)' : g > 100 ? '(放大)' : '(縮減)'}`;
      sliderGain.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        currentAudioSettings.gain = val;
        if (labelGain) labelGain.textContent = `${val}% ${val === 100 ? '(標準)' : val > 100 ? '(放大)' : '(縮減)'}`;
        if (gainNode && audioContext) {
          gainNode.gain.setValueAtTime(val / 100, audioContext.currentTime);
        }
        saveAudioSettings();
      });
    }

    if (checkNoise) {
      checkNoise.checked = currentAudioSettings.noiseSuppression !== false;
      checkNoise.addEventListener('change', (e) => {
        currentAudioSettings.noiseSuppression = e.target.checked;
        saveAudioSettings();
        restartActiveAudio();
      });
    }

    if (checkEcho) {
      checkEcho.checked = currentAudioSettings.echoCancellation !== false;
      checkEcho.addEventListener('change', (e) => {
        currentAudioSettings.echoCancellation = e.target.checked;
        saveAudioSettings();
        restartActiveAudio();
      });
    }

    if (checkAutoGain) {
      checkAutoGain.checked = currentAudioSettings.autoGainControl !== false;
      checkAutoGain.addEventListener('change', (e) => {
        currentAudioSettings.autoGainControl = e.target.checked;
        saveAudioSettings();
        restartActiveAudio();
      });
    }

    if (selectMic) {
      selectMic.addEventListener('change', async (e) => {
        currentAudioSettings.deviceId = e.target.value;
        saveAudioSettings();
        updateCollapsibleSummaries();
        restartActiveAudio();
      });
    }

    if (btnRefresh) {
      btnRefresh.addEventListener('click', async () => {
        btnRefresh.textContent = '🔄 ...';
        await refreshMicDevices(true);
        setTimeout(() => {
          btnRefresh.textContent = t('btn_refresh_mics', '🔄 重新掃描');
        }, 500);
      });
    }

    // Toggle Mic Test
    if (btnTestMic) {
      btnTestMic.addEventListener('click', async () => {
        if (isTestingMic) {
          // Stop test
          isTestingMic = false;
          if (testMicStream) {
            testMicStream.getTracks().forEach(t => t.stop());
            testMicStream = null;
          }
          if (testIcon) testIcon.textContent = '🎤';
          if (testText) testText.textContent = t('btn_test_mic', '測試麥克風收音');
          if (testStatus) {
            testStatus.textContent = t('mic_status_standby', '待機中');
            testStatus.style.background = 'rgba(255,255,255,0.08)';
            testStatus.style.color = '#94a3b8';
          }
          stopVolumeMeter();
          updateCollapsibleSummaries();
          return;
        }

        if (wantListen) {
          if (testStatus) {
            testStatus.textContent = t('mic_status_active', '語音辨識中');
            testStatus.style.background = 'rgba(16,185,129,0.2)';
            testStatus.style.color = '#34d399';
          }
          return;
        }

        // Start test
        try {
          if (testStatus) {
            testStatus.textContent = '...';
            testStatus.style.background = 'rgba(245,158,11,0.2)';
            testStatus.style.color = '#fbbf24';
          }
          const constraints = getAudioConstraints();
          testMicStream = await navigator.mediaDevices.getUserMedia({ audio: constraints });
          isTestingMic = true;
          if (testIcon) testIcon.textContent = '⏹️';
          if (testText) testText.textContent = t('btn_test_mic_stop', '停止測試');
          if (testStatus) {
            testStatus.textContent = t('mic_status_testing', '測試收音中 🔊');
            testStatus.style.background = 'rgba(16,185,129,0.2)';
            testStatus.style.color = '#34d399';
          }
          startVolumeMeterWithStream(testMicStream);
          refreshMicDevices(false);
          updateCollapsibleSummaries();
        } catch (err) {
          console.warn('test mic error:', err);
          isTestingMic = false;
          if (testIcon) testIcon.textContent = '🎤';
          if (testText) testText.textContent = t('btn_test_mic', '測試麥克風收音');
          if (testStatus) {
            testStatus.textContent = t('status_error', '權限未允許');
            testStatus.style.background = 'rgba(239,68,68,0.2)';
            testStatus.style.color = '#f87171';
          }
        }
      });
    }

    // Top navbar volume meter click opens mic settings card
    if (volumeBar && volumeBar.parentElement) {
      volumeBar.parentElement.addEventListener('click', () => {
        const micCard = document.getElementById('card-settings-mic');
        if (micCard) {
          micCard.classList.remove('collapsed');
          const btn = micCard.querySelector('.btn-collapse-toggle');
          if (btn) btn.setAttribute('aria-expanded', 'true');
          micCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });
    }

    // Initial enumeration
    refreshMicDevices(false);
  }

  // Listen Button Click Handler
  btnToggleListen.addEventListener('click', async () => {
    if (!SpeechRecognition) {
      const isOBS = /OBS\//i.test(navigator.userAgent);
      if (isOBS) {
        setStatus(t('status_obs_mic_error', 'OBS 內建瀏覽器無法讀取麥克風，請使用 Chrome 開啟此頁面'), 'error');
      } else {
        setStatus(t('status_speech_unsupported', '瀏覽器不支援語音辨識，請使用 Google Chrome'), 'error');
      }
      return;
    }

    if (wantListen) {
      wantListen = false;
      blockRestart = true;
      clearTimeout(restartTimer);
      clearTimeout(stableTimer);
      clearTimeout(interimTimer);
      clearTimeout(interimTransTimer);
      destroyRecognition();
      updateListenButton();
      stopVolumeMeter();
      const testStatus = document.getElementById('mic-test-status');
      if (testStatus) {
        testStatus.textContent = t('mic_status_standby', '待機中');
        testStatus.style.background = 'rgba(255,255,255,0.08)';
        testStatus.style.color = '#94a3b8';
      }
      setStatus(t('status_stopped', '語音辨識已停止'), '');
      updateCollapsibleSummaries();
      return;
    }

    // Starting listening
    wantListen = true;
    blockRestart = false;
    consecutiveFastEnds = 0;
    lastAudioDetectedTime = 0;
    lastSpeechEventTime = Date.now();
    updateListenButton();
    setStatus(t('status_requesting_mic', '正在請求麥克風權限...'), 'warn');

    // First ensure microphone permission is granted and start volume meter
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        if (isTestingMic && testMicStream) {
          testMicStream.getTracks().forEach(t => t.stop());
          testMicStream = null;
          isTestingMic = false;
          const testIcon = document.getElementById('test-mic-icon');
          const testText = document.getElementById('test-mic-text');
          if (testIcon) testIcon.textContent = '🎤';
          if (testText) testText.textContent = t('btn_test_mic', '測試麥克風收音');
        }
        const testStatus = document.getElementById('mic-test-status');
        if (testStatus) {
          testStatus.textContent = t('mic_status_active', '語音辨識中 🔊');
          testStatus.style.background = 'rgba(16,185,129,0.2)';
          testStatus.style.color = '#34d399';
        }
        if (!micStream) {
          const constraints = getAudioConstraints();
          micStream = await navigator.mediaDevices.getUserMedia({ audio: constraints });
        }
        startVolumeMeterWithStream(micStream);
        refreshMicDevices(false);
        updateCollapsibleSummaries();
      }
    } catch (micErr) {
      console.warn('getUserMedia error:', micErr);
      if (micErr.name === 'NotAllowedError' || micErr.name === 'PermissionDeniedError') {
        wantListen = false;
        blockRestart = true;
        updateListenButton();
        setStatus(t('status_mic_permission', '請在網址列左側 🔒 圖示允許「麥克風」存取權限'), 'error');
        return;
      }
    }

    setStatus(t('status_connecting', '啟動語音辨識中...'), 'warn');
    safeStart();
  });

  // UI Event Handlers - Background Picker
  document.querySelectorAll('.bg-picker-btn, .bg-seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentSettings.bgMode = btn.dataset.bg;
      applySettingsToUI();
      syncSettings();
      updateCollapsibleSummaries();
    });
  });

  // Font Size
  document.querySelectorAll('#control-font-size .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentSettings.fontSize = btn.dataset.val;
      applySettingsToUI();
      syncSettings();
    });
  });

  // Alignment
  document.querySelectorAll('#control-align .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentSettings.align = btn.dataset.val;
      applySettingsToUI();
      syncSettings();
    });
  });

  // Position
  document.querySelectorAll('#control-pos .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentSettings.position = btn.dataset.val;
      applySettingsToUI();
      syncSettings();
    });
  });

  // Subtitle Rhythm / Stream Mode (Approach A)
  document.querySelectorAll('#control-stream-mode .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentSettings.streamMode = btn.dataset.val;
      applySettingsToUI();
      syncSettings();
    });
  });

  // Speech Speed Mode Segmented Control
  document.querySelectorAll('#control-speech-speed .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentSettings.speechSpeedMode = btn.dataset.val;
      applySettingsToUI();
      syncSettings();
    });
  });

  // Dropdowns & Checkboxes
  selectSourceLang.addEventListener('change', () => {
    currentSettings.sourceLang = selectSourceLang.value;
    activeChromeTranslator = null;
    activeChromeTranslatorPair = null;
    if (wantListen) {
      forceRecoverRecognition('source_lang_changed');
    }
    syncSettings();
    if (currentSettings.transEngine === 'chrome') {
      updateChromeTranslatorUI();
    }
  });

  selectTargetLang.addEventListener('change', () => {
    currentSettings.targetLang = selectTargetLang.value;
    activeChromeTranslator = null;
    activeChromeTranslatorPair = null;
    syncSettings();
    if (currentSettings.transEngine === 'chrome') {
      updateChromeTranslatorUI();
    }
  });

  // Translation Engine Controls & Listeners
  document.querySelectorAll('#control-trans-engine .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentSettings.transEngine = btn.dataset.val;
      applySettingsToUI();
      syncSettings();
      updateCollapsibleSummaries();
    });
  });

  const btnDownloadChromeModel = document.getElementById('btn-download-chrome-model');
  if (btnDownloadChromeModel) {
    btnDownloadChromeModel.addEventListener('click', () => downloadChromeModel());
  }

  const btnTestChromeTrans = document.getElementById('btn-test-chrome-trans');
  if (btnTestChromeTrans) {
    btnTestChromeTrans.addEventListener('click', () => testChromeTranslation());
  }

  const btnCheckChromeAvail = document.getElementById('btn-check-chrome-avail');
  if (btnCheckChromeAvail) {
    btnCheckChromeAvail.addEventListener('click', () => updateChromeTranslatorUI(true));
  }

  const checkChromeFallback = document.getElementById('check-chrome-fallback-online');
  if (checkChromeFallback) {
    checkChromeFallback.addEventListener('change', (e) => {
      currentSettings.chromeFallbackOnline = e.target.checked;
      syncSettings();
    });
  }

  const btnCopyChromeFlagsUrl = document.getElementById('btn-copy-chrome-flags-url');
  if (btnCopyChromeFlagsUrl) {
    btnCopyChromeFlagsUrl.addEventListener('click', () => {
      const url = 'chrome://flags/#translation-api';
      navigator.clipboard.writeText(url).then(() => {
        btnCopyChromeFlagsUrl.textContent = t('btn_copy_flags_url_copied', '✅ 已複製 flags 網址！');
        setTimeout(() => {
          btnCopyChromeFlagsUrl.textContent = t('btn_copy_flags_url', '📋 複製 flags 網址');
        }, 2500);
      }).catch(() => {
        prompt(t('btn_copy_flags_url', '請手動複製下列網址並在 Chrome 網址列開啟：'), url);
      });
    });
  }

  selectStroke.addEventListener('change', () => {
    currentSettings.textShadow = selectStroke.value;
    applySettingsToUI();
    syncSettings();
  });

  selectBoxStyle.addEventListener('change', () => {
    currentSettings.boxStyle = selectBoxStyle.value;
    applySettingsToUI();
    syncSettings();
  });

  selectAutoHide.addEventListener('change', () => {
    currentSettings.autoHideSeconds = parseFloat(selectAutoHide.value);
    syncSettings();
  });

  // Display Mode Selection Controls
  document.querySelectorAll('#control-display-mode .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentSettings.displayMode = btn.dataset.val;
      applySettingsToUI();
      syncSettings();
      updateCollapsibleSummaries();
    });
  });

  // Avatar Event Listeners
  if (btnUploadAvatar && fileAvatarInput) {
    btnUploadAvatar.addEventListener('click', () => {
      fileAvatarInput.click();
    });

    fileAvatarInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target.result;
        try {
          const res = await fetch('/api/upload-avatar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              dataUrl,
              shape: currentSettings.avatarShape || 'circle',
              size: currentSettings.avatarSize || 'medium'
            })
          });
          const json = await res.json();
          if (json.success && json.avatarUrl) {
            currentSettings.avatarUrl = json.avatarUrl;
            currentSettings.showAvatar = true;
            applySettingsToUI();
            syncSettings();
          }
        } catch (err) {
          // Fallback to base64 dataUrl
          currentSettings.avatarUrl = dataUrl;
          currentSettings.showAvatar = true;
          applySettingsToUI();
          syncSettings();
        }
      };
      reader.readAsDataURL(file);
    });
  }

  if (btnRemoveAvatar) {
    btnRemoveAvatar.addEventListener('click', async () => {
      currentSettings.avatarUrl = '';
      currentSettings.showAvatar = false;
      try {
        await fetch('/api/remove-avatar', { method: 'POST' });
      } catch (e) {}
      applySettingsToUI();
      syncSettings();
    });
  }

  if (checkShowAvatar) {
    checkShowAvatar.addEventListener('change', () => {
      currentSettings.showAvatar = checkShowAvatar.checked;
      applySettingsToUI();
      syncSettings();
    });
  }

  document.querySelectorAll('#control-avatar-shape .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentSettings.avatarShape = btn.dataset.val;
      applySettingsToUI();
      syncSettings();
    });
  });

  // Avatar Position Switcher
  document.querySelectorAll('#control-avatar-pos .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentSettings.avatarPos = btn.dataset.val;
      applySettingsToUI();
      syncSettings();
    });
  });

  document.querySelectorAll('#control-avatar-size .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentSettings.avatarSize = btn.dataset.val;
      applySettingsToUI();
      syncSettings();
    });
  });

  document.querySelectorAll('#control-avatar-border .seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentSettings.avatarBorder = btn.dataset.val;
      applySettingsToUI();
      syncSettings();
    });
  });

  if (pickerAvatarBorderColor) {
    pickerAvatarBorderColor.addEventListener('input', () => {
      currentSettings.avatarBorderColor = pickerAvatarBorderColor.value;
      if (textAvatarBorderColor) textAvatarBorderColor.textContent = pickerAvatarBorderColor.value;
      if (previewAvatarImg) previewAvatarImg.style.borderColor = pickerAvatarBorderColor.value;
      syncSettings();
    });
  }

  // Live Stream Visual Effects Button Listeners (Toolbar & HUD)
  document.querySelectorAll('.btn-effect').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const effectName = btn.dataset.effect;
      if (effectName) {
        triggerEffect(effectName);
        wakeHud();

        // Button press feedback animation
        btn.classList.add('effect-active');
        setTimeout(() => btn.classList.remove('effect-active'), 400);
      }
    });
  });

  pickerOrigColor.addEventListener('input', () => {
    currentSettings.originalColor = pickerOrigColor.value;
    textOrigColor.textContent = pickerOrigColor.value;
    previewOriginal.style.color = pickerOrigColor.value;
    syncSettings();
  });

  pickerTransColor.addEventListener('input', () => {
    currentSettings.translationColor = pickerTransColor.value;
    textTransColor.textContent = pickerTransColor.value;
    previewTranslation.style.color = pickerTransColor.value;
    syncSettings();
  });

  // Test Subtitle Button
  btnTestSub.addEventListener('click', () => {
    let samples = t('test_samples');
    if (!Array.isArray(samples) || samples.length === 0) {
      samples = [
        { orig: '大家下午好！歡迎來到今天的直播～', trans: '皆さんこんにちは！本日の配信へようこそ～' },
        { orig: '我們現在開始進行今天的遊戲挑戰！', trans: 'それでは今日のゲームチャレンジを始めましょう！' },
        { orig: '感謝大家的支持與訂閱，太開心了！', trans: '応援とチャンネル登録ありがとうございます、とても嬉しいです！' }
      ];
    }
    const item = samples[Math.floor(Math.random() * samples.length)];
    renderSubtitle(item.orig, item.trans, true);
    broadcastData('subtitle', { original: item.orig, translation: item.trans, isFinal: true });
    addHistoryItem(item.orig, item.trans);
  });

  // Clear Subtitle Button
  btnClearSub.addEventListener('click', () => {
    renderSubtitle('', '', true);
    broadcastData('clear');
  });

  // Copy OBS URL Button
  btnCopyUrl.addEventListener('click', () => {
    const overlayUrl = `${window.location.origin}/overlay.html`;
    navigator.clipboard.writeText(overlayUrl).then(() => {
      const origText = btnCopyUrl.innerHTML;
      btnCopyUrl.textContent = t('btn_copy_url_success', '✅ 已複製網址！');
      setTimeout(() => { btnCopyUrl.innerHTML = origText; }, 2000);
    }).catch(() => {
      prompt(t('btn_copy_url_prompt', '請手動複製 OBS 網址：'), overlayUrl);
    });
  });

  // Pure Green Mode & Fullscreen Handling
  let hudIdleTimer = null;
  function wakeHud() {
    if (!pureGreenHud) return;
    pureGreenHud.classList.remove('hud-idle');
    pureGreenHud.classList.add('hud-active');
    clearTimeout(hudIdleTimer);
    hudIdleTimer = setTimeout(() => {
      pureGreenHud.classList.remove('hud-active');
      pureGreenHud.classList.add('hud-idle');
    }, 2400);
  }

  document.addEventListener('mousemove', () => {
    if (document.body.classList.contains('pure-green-mode') || document.body.classList.contains('fullscreen-mode')) {
      wakeHud();
    }
  });

  function enterPureGreenMode() {
    document.body.classList.add('pure-green-mode');
    currentSettings.bgMode = 'green';
    applySettingsToUI();
    syncSettings();
    wakeHud();

    setTimeout(() => {
      if (previewEffects) previewEffects.resize();
      window.dispatchEvent(new Event('resize'));
    }, 60);

    // Auto-start listening if not already active
    if (!wantListen && SpeechRecognition) {
      btnToggleListen.click();
    }
  }

  function exitPureGreenMode() {
    document.body.classList.remove('pure-green-mode');
    document.body.classList.remove('fullscreen-mode');
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    setTimeout(() => {
      if (previewEffects) previewEffects.resize();
      window.dispatchEvent(new Event('resize'));
    }, 60);
  }

  function togglePureGreenMode() {
    if (document.body.classList.contains('pure-green-mode') || document.body.classList.contains('fullscreen-mode')) {
      exitPureGreenMode();
    } else {
      enterPureGreenMode();
    }
  }

  function handleEnterFullscreenGreen() {
    enterPureGreenMode();
    if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }

  if (btnHideUi) btnHideUi.addEventListener('click', handleEnterFullscreenGreen);
  if (btnHideUiNav) btnHideUiNav.addEventListener('click', handleEnterFullscreenGreen);
  if (btnFullscreenGreen) btnFullscreenGreen.addEventListener('click', handleEnterFullscreenGreen);
  if (btnExitGreenMode) btnExitGreenMode.addEventListener('click', exitPureGreenMode);
  if (btnToggleListenHud) {
    btnToggleListenHud.addEventListener('click', () => {
      btnToggleListen.click();
      wakeHud();
    });
  }

  // Global Keyboard Shortcuts
  document.addEventListener('keydown', (e) => {
    // Ignore when typing in form inputs
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

    if (e.key === 'h' || e.key === 'H') {
      e.preventDefault();
      togglePureGreenMode();
    } else if (e.key === 'Escape') {
      if (document.body.classList.contains('pure-green-mode') || document.body.classList.contains('fullscreen-mode')) {
        exitPureGreenMode();
      }
    }
  });

  // Tutorial Modal
  btnOpenTutorial.addEventListener('click', () => {
    document.getElementById('tutorial-overlay-url').textContent = `${window.location.origin}/overlay.html`;
    tutorialModal.classList.add('open');
  });

  btnCloseModal.addEventListener('click', () => {
    tutorialModal.classList.remove('open');
  });

  tutorialModal.addEventListener('click', (e) => {
    if (e.target === tutorialModal) {
      tutorialModal.classList.remove('open');
    }
  });

  // Export History
  btnExportLog.addEventListener('click', () => {
    if (historyItems.length === 0) {
      alert(t('history_empty_export', '目前尚無辨識紀錄可匯出'));
      return;
    }
    const origLabel = t('history_label_orig', '原文');
    const transLabel = t('history_label_trans', '翻譯');
    const lines = historyItems.map(item => `[${item.time}]\n${origLabel}: ${item.original}\n${transLabel}: ${item.translation}\n`).join('\n');
    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `caption_log_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
  });

  btnClearLog.addEventListener('click', () => {
    if (confirm(t('history_clear_confirm', '確定清空歷史紀錄嗎？'))) {
      historyItems.length = 0;
      historyList.innerHTML = '';
    }
  });

  // ========================================================
  // Custom Text Broadcast & Marquee Controller
  // ========================================================
  const inputCustomText = document.getElementById('input-custom-text');
  const btnSendCustom = document.getElementById('btn-send-custom');
  const btnClearCustom = document.getElementById('btn-clear-custom');
  const selectCustomDuration = document.getElementById('select-custom-duration');
  const bannerPreviewLayer = document.getElementById('custom-banner-layer-preview');

  let customTextState = {
    text: '',
    mode: 'marquee-loop', // 'marquee-loop' | 'marquee-once' | 'static'
    pos: 'top',          // 'top' | 'center' | 'bottom'
    speed: 'normal',     // 'slow' | 'normal' | 'fast' | 'rapid'
    duration: '0',       // '0', 'auto', '3', '5', '10', '20', '30'
    size: 'medium',      // 'small' | 'medium' | 'large' | 'huge'
    style: 'neon'        // 'neon' | 'glass' | 'alert' | 'clean'
  };

  let previewBannerTimer = null;

  function clearPreviewCustomBanner() {
    clearTimeout(previewBannerTimer);
    if (!bannerPreviewLayer) return;
    bannerPreviewLayer.classList.add('fade-out');
    setTimeout(() => {
      bannerPreviewLayer.innerHTML = '';
      bannerPreviewLayer.className = 'custom-banner-layer pos-top';
    }, 350);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function renderPreviewCustomBanner(data) {
    if (!bannerPreviewLayer || !data) return;
    clearTimeout(previewBannerTimer);
    bannerPreviewLayer.classList.remove('fade-out');

    const text = data.text || '';
    const mode = data.mode || 'marquee-loop';
    const pos = data.pos || 'top';
    const speed = data.speed || 'normal';
    const duration = data.duration ?? '0';
    const size = data.size || 'medium';
    const style = data.style || 'neon';

    if (!text.trim()) {
      clearPreviewCustomBanner();
      return;
    }

    bannerPreviewLayer.className = `custom-banner-layer pos-${pos}`;

    if (mode === 'static') {
      bannerPreviewLayer.innerHTML = `
        <div class="static-banner-content banner-style-${style} banner-size-${size}">
          ${escapeHtml(text)}
        </div>
      `;
    } else {
      const isLoop = mode === 'marquee-loop';
      const loopClass = isLoop ? 'loop-infinite' : 'loop-once';
      bannerPreviewLayer.innerHTML = `
        <div class="marquee-track">
          <div class="marquee-content ${loopClass} speed-${speed} banner-style-${style} banner-size-${size}">
            ${escapeHtml(text)}
          </div>
        </div>
      `;

      if (mode === 'marquee-once' && (duration === 'auto' || duration == 0)) {
        const marqueeEl = bannerPreviewLayer.querySelector('.marquee-content');
        if (marqueeEl) {
          marqueeEl.addEventListener('animationend', () => {
            clearPreviewCustomBanner();
          }, { once: true });
        }
      }
    }

    const durSec = parseFloat(duration);
    if (!isNaN(durSec) && durSec > 0) {
      previewBannerTimer = setTimeout(() => {
        clearPreviewCustomBanner();
      }, durSec * 1000);
    }
  }

  function sendCustomText(overrideText = null) {
    const text = (overrideText !== null ? overrideText : (inputCustomText?.value || '')).trim();
    if (!text) {
      inputCustomText?.focus();
      return;
    }

    customTextState.text = text;
    if (selectCustomDuration) {
      customTextState.duration = selectCustomDuration.value;
    }

    const payload = {
      ...customTextState,
      timestamp: Date.now()
    };

    // Render locally in stage preview
    renderPreviewCustomBanner(payload);

    // Broadcast to OBS overlay via WebSocket & BroadcastChannel
    broadcastData('customText', payload);
  }

  function clearCustomText() {
    customTextState.text = '';
    clearPreviewCustomBanner();
    broadcastData('customTextClear');
  }

  // Bind Buttons & Inputs
  if (btnSendCustom) {
    btnSendCustom.addEventListener('click', () => sendCustomText());
  }

  if (inputCustomText) {
    inputCustomText.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendCustomText();
      }
    });
  }

  if (btnClearCustom) {
    btnClearCustom.addEventListener('click', () => {
      clearCustomText();
    });
  }

  // Quick Templates
  document.querySelectorAll('.btn-quick-tmpl').forEach(btn => {
    btn.addEventListener('click', () => {
      const tmplText = btn.dataset.text || '';
      if (inputCustomText) inputCustomText.value = tmplText;
      sendCustomText(tmplText);
    });
  });

  // Setup generic segmented control helper for custom settings
  function bindCustomSegControl(containerId, stateKey) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.querySelectorAll('.seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        customTextState[stateKey] = btn.dataset.val;

        // If banner is currently active on screen, live-update it immediately
        if (customTextState.text) {
          sendCustomText(customTextState.text);
        }
      });
    });
  }

  // Collapsible Settings Cards Feature
  function initCollapsibleCards() {
    const cardIds = ['card-settings-mic', 'card-settings-lang', 'card-settings-avatar', 'card-settings-style'];
    const storageKey = 'obs_sidebar_collapsed_cards';
    
    // Default: mic settings open, others collapsed to save screen space, or read from localStorage
    let collapsedState = {
      'card-settings-mic': false,
      'card-settings-lang': true,
      'card-settings-avatar': true,
      'card-settings-style': true
    };

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        collapsedState = { ...collapsedState, ...JSON.parse(saved) };
      }
    } catch (e) {}

    function saveState() {
      try {
        localStorage.setItem(storageKey, JSON.stringify(collapsedState));
      } catch (e) {}
    }

    function applyCardState(cardId) {
      const card = document.getElementById(cardId);
      if (!card) return;
      const isCollapsed = !!collapsedState[cardId];
      card.classList.toggle('collapsed', isCollapsed);
      const btn = card.querySelector('.btn-collapse-toggle');
      if (btn) {
        btn.setAttribute('aria-expanded', !isCollapsed);
      }
    }

    // Initialize each card
    cardIds.forEach(id => {
      applyCardState(id);
      const card = document.getElementById(id);
      if (!card) return;
      const header = card.querySelector('.collapsible-header');
      if (header) {
        header.addEventListener('click', (e) => {
          collapsedState[id] = !collapsedState[id];
          applyCardState(id);
          saveState();
        });
      }
    });

    // Expand / Collapse All Buttons
    const btnCollapseAll = document.getElementById('btn-collapse-all');
    const btnExpandAll = document.getElementById('btn-expand-all');

    if (btnCollapseAll) {
      btnCollapseAll.addEventListener('click', () => {
        cardIds.forEach(id => {
          collapsedState[id] = true;
          applyCardState(id);
        });
        saveState();
      });
    }

    if (btnExpandAll) {
      btnExpandAll.addEventListener('click', () => {
        cardIds.forEach(id => {
          collapsedState[id] = false;
          applyCardState(id);
        });
        saveState();
      });
    }
  }

  // Update dynamic summary badges on collapsible card headers
  function updateCollapsibleSummaries() {
    // 0. Microphone Summary
    const summaryMic = document.getElementById('summary-mic');
    if (summaryMic) {
      const select = document.getElementById('select-mic-device');
      let micName = t('summary_mic_default', '系統預設');
      if (select && select.selectedOptions && select.selectedOptions[0]) {
        micName = select.selectedOptions[0].textContent.replace(/\(.*?\)/g, '').trim() || t('summary_mic_default', '系統預設');
        if (micName.length > 8) micName = micName.slice(0, 8) + '...';
      }
      const statusText = wantListen ? t('summary_mic_active', '收音中') : isTestingMic ? t('summary_mic_testing', '測試中') : t('summary_mic_standby', '待機');
      summaryMic.textContent = `${micName} · ${statusText}`;
    }

    // 1. Language Summary
    const summaryLang = document.getElementById('summary-lang');
    if (summaryLang) {
      const srcKey = 'lang_' + (currentSettings.sourceLang || 'zh-TW').replace('-', '_');
      const targetKey = 'lang_' + (currentSettings.targetLang || 'ja').replace('-', '_');
      const srcText = t(srcKey, currentSettings.sourceLang);
      const targetText = t(targetKey, currentSettings.targetLang);
      const engineText = currentSettings.transEngine === 'chrome' 
        ? (isCurrentChromeModelReady ? '⚡Chrome' : '⚡Chrome')
        : t('badge_trans_engine_online', '🌐線上雲端');
      summaryLang.textContent = `${srcText} ➜ ${targetText} · ${engineText}`;
    }

    // 2. Avatar Summary
    const summaryAvatar = document.getElementById('summary-avatar');
    if (summaryAvatar) {
      if (!currentSettings.showAvatar) {
        summaryAvatar.textContent = t('summary_avatar_disabled', '未開啟');
      } else {
        const posText = (currentSettings.avatarPos === 'inline') ? t('summary_avatar_pos_inline', '貼字') : t('summary_avatar_pos_left', '最左');
        const shapeText = t('summary_shape_' + (currentSettings.avatarShape || 'circle'), '圓形');
        summaryAvatar.textContent = `${t('summary_avatar_enabled', '已啟用')} · ${posText} · ${shapeText}`;
      }
    }

    // 3. Style & Background Summary
    const summaryStyle = document.getElementById('summary-style');
    if (summaryStyle) {
      const bgText = t('summary_bg_' + (currentSettings.bgMode || 'green'), '純綠幕');
      const sizeCode = currentSettings.fontSize === 'small' ? 's' : currentSettings.fontSize === 'medium' ? 'm' : currentSettings.fontSize === 'huge' ? 'xl' : 'l';
      const sizeText = t('summary_size_' + sizeCode, '大');
      const alignText = t('summary_align_' + (currentSettings.align || 'center'), '居中');
      const modeKey = currentSettings.displayMode === 'original' ? 'orig' : currentSettings.displayMode === 'translation' ? 'trans' : 'both';
      const modeText = t('summary_display_' + modeKey, '雙語');
      summaryStyle.textContent = `${bgText} · ${sizeText} · ${modeText}`;
    }
  }

  // UI Language Switcher Handlers
  const selectUiLang = document.getElementById('select-ui-lang');
  const selectUiLangSettings = document.getElementById('select-ui-lang-settings');

  function syncUiLangDropdowns(lang) {
    if (selectUiLang && selectUiLang.value !== lang) {
      selectUiLang.value = lang;
    }
    if (selectUiLangSettings && selectUiLangSettings.value !== lang) {
      selectUiLangSettings.value = lang;
    }
  }

  if (selectUiLang) {
    selectUiLang.addEventListener('change', (e) => {
      if (window.I18N) window.I18N.setLanguage(e.target.value);
    });
  }

  if (selectUiLangSettings) {
    selectUiLangSettings.addEventListener('change', (e) => {
      if (window.I18N) window.I18N.setLanguage(e.target.value);
    });
  }

  // Set initial value in dropdowns
  if (window.I18N) {
    syncUiLangDropdowns(window.I18N.getLanguage());
  }

  // Listen to i18n language change event
  window.addEventListener('i18nLanguageChanged', (e) => {
    const lang = e.detail?.lang;
    syncUiLangDropdowns(lang);
    updateListenButton();
    updateCollapsibleSummaries();
    if (!wantListen) {
      setStatus(t('status_ready', '點擊開始聆聽'), '');
    }
  });

  // Initialize
  initRecognition();
  applySettingsToUI();
  initMicSettingsUI();
  initCollapsibleCards();
})();

