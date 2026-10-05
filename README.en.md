# OBS Live Bilingual Captions (Live Caption for OBS)

[繁體中文](README.md) | [English](README.en.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md) | [한국어](README.ko.md)

A real-time speech recognition and bilingual translation live caption tool specially designed for streamers, content creators, and VTubers in OBS Studio.

---

## ✨ Features

- 🎙️ **Real-time Continuous Speech-to-Text**: Powered by the Web Speech API with rapid typing preview and automatic smart clause segmentation.
- 🌐 **Synchronized Bilingual Subtitles**: Displays "Original Speech" on top and "Translated Captions" below, perfectly bridging communication with international audiences.
- 🟢 **Chroma Key Green Screen & Locked 16:9 Aspect Ratio**:
  - **Strict 16:9 Standard Ratio**: The live green stage preview and fullscreen mode are permanently locked to 16:9 (1920×1080), maintaining aspect ratio regardless of window size or screen aspect ratio (e.g., MacBook 16:10).
  - **Pure Green Screen Mode** (Shortcut: `H` or `Esc`): Instantly hides navbar, sidebar controls, and buttons, turning the entire browser window into a clean green screen with live subtitles. Controls auto-hide when idle.
  - Supports Pure Chroma Green (`#00FF00`), Broadcast Green (`#00B140`), Chroma Blue (`#0000FF`), Dark background (`#0F172A`), and transparent background.
  - Dedicated OBS Browser Source Overlay (`overlay.html`) natively supports pure 100% alpha transparency.
- ⚡ **Zero-Latency WebSocket & BroadcastChannel Streaming**: Speak into your microphone in Google Chrome, and subtitles appear on OBS in real time with zero delay.
- 🎨 **Deep Customization**:
  - Outline shadow strength (None, Subtle, Thick, Strong) for maximum contrast against bright game scenes.
  - Font sizes (Small, Medium, Large, Extra Large).
  - Horizontal alignment (Center, Left, Right) and vertical position (Bottom, Center, Top).
  - Customizable text colors for original and translated text (defaults to high-contrast white + vivid yellow).
  - Auto-hide timer when silent (3s, 5s, 8s, or never).
- 👤 **Custom Streamer Avatar & Speaking Pulse**: Upload custom avatar or PNG images to display before subtitles; supports circular, rounded, and square frames with dynamic speaking pulse glow animation.
- 🎬 **Resolution-Adaptive Live Stage Visual Effects**: Trigger vibrant particle effects (Fireworks 🎆, Glass Shatter 💥, Flower Bouquet 💐, Confetti Party 🎉, Floating Hearts 💖, Lightning Strike ⚡) scaled proportionally for 1080p and 4K stream outputs.
- 🔄 **Multi-Engine Translation Support**: Server cache with automatic fallback, Chrome on-device AI Translation API (zero latency, offline), Google GTX, and MyMemory.
- 🌍 **Full Multi-Language UI (i18n)**: One-click instant switching between Traditional Chinese, Simplified Chinese, English, Japanese, and Korean.
- 📜 **Transcription History & Export**: Live transcription logs of original and translated text with one-click TXT export.

---

## 🚀 Quick Start

Run the following command in the project directory:

```bash
npm start
```

The server will start at `http://localhost:3000`.

---

## 📺 OBS Setup Guide (Choose either option)

### Option A: OBS "Browser Source" (Recommended ⭐⭐⭐⭐⭐)
> **Benefit**: 100% pure transparent alpha background, crisp text edges, no green screen color bleed.

1. Start the server and open the Control Panel in Google Chrome: `http://localhost:3000`.
2. Click **"📋 Copy OBS URL"** in the top toolbar (URL: `http://localhost:3000/overlay.html`).
3. Open **OBS Studio**:
   - In the **Sources** panel, click **+** ➜ select **Browser**.
   - Name it "Bilingual Live Captions".
   - Set **URL** to `http://localhost:3000/overlay.html`.
   - Set **Width** to **1920** and **Height** to **1080** (or your stream canvas resolution).
   - Click OK.
4. Back in the Chrome Control Panel, click **"Start Listening"** and speak into your microphone. Bilingual subtitles will sync to OBS in real time!

---

### Option B: OBS "Window Capture" + Chroma Key Filter
> **Benefit**: Allows placing the Chrome window on a secondary monitor for direct visual monitoring.

1. In the Chrome Control Panel, click **"🟢 Fullscreen Green"** (or open `http://localhost:3000/overlay.html?bg=green`).
2. Open **OBS Studio**:
   - In the **Sources** panel, click **+** ➜ select **Window Capture**.
   - Select the Chrome window showing the green screen.
3. Right-click the newly created Window Capture source ➜ select **Filters**:
   - In the bottom-left of the filter window, click **+** ➜ select **Chroma Key**.
   - Set **Key Color Type** to **Green**.
   - OBS will automatically key out the green background, leaving only subtitles!
4. Click "Exit Fullscreen" or press `Esc` to restore the control interface.

---

## ⚙️ Advanced OBS Overlay URL Parameters

When using the OBS Browser Source, you can customize the appearance directly via URL query parameters:

- `http://localhost:3000/overlay.html?mode=both` (Default: bilingual, original on top and translation below)
- `http://localhost:3000/overlay.html?mode=original` (Display original speech only)
- `http://localhost:3000/overlay.html?mode=translation` (Display translated text only)
- `http://localhost:3000/overlay.html?bg=green` (Force chroma key green background)
- `http://localhost:3000/overlay.html?size=huge` (Force extra large font size)
- `http://localhost:3000/overlay.html?autohide=5` (Auto-hide subtitles after 5 seconds of silence)
- `http://localhost:3000/overlay.html?stroke=thick` (Extra thick black text stroke)

---

## 💡 Important Notes

1. **Browser Requirement**: Speech recognition relies on the Google Web Speech API. **The Control Panel (speaking end) must be opened in Google Chrome**.
2. **Microphone Permissions**: When launching for the first time, allow microphone access when prompted by the browser.
3. Keep `npm start` running in the background while streaming.
