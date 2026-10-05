# Mizuki Aiga - OBS Live Bilingual Captions (Live Caption for OBS)

[繁體中文](README.md) | [English](README.en.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md) | [한국어](README.ko.md)

A real-time speech recognition and bilingual translation live caption tool specially designed for streamers, content creators, and VTubers in OBS Studio.

---

## 📖 Project Origin & Naming

This project was originally built for a collaborative livestream with **Aiga Mizuki (藍芽水月)** to provide lightning-fast speech recognition and synchronized bilingual subtitles in OBS Studio, and was subsequently branched and refined from that production workflow. In honor of that collaboration, the project is officially named **Mizuki Aiga**.

---

## 🧩 Subsystem Architecture

The system consists of several modular and independent subsystems operating in sync:

1. **🎙️ Web Control Panel (`/`)**
   - Captures streamer microphone input and performs continuous speech-to-text via Google Web Speech API.
   - Features smart sentence boundary settlement, real-time volume VU meter, microphone device switching, and digital gain control.
   - Provides seamless 5-language UI switching (繁中, 日本語, English, 简体中文, 한국어) and automated Google Chrome environment detection (alert warning on non-Chrome browsers).
   - Includes quick template broadcasting buttons and transcription history export (TXT).

2. **📺 OBS Overlay Browser Source (`/overlay.html`)**
   - Pure rendering canvas dedicated to OBS Studio's "Browser Source".
   - Features **100% native Alpha transparency**, delivering crisp text outlines without green screen bleed or chroma key tuning.
   - Real-time 0-latency synchronization with the Control Panel via WebSocket and BroadcastChannel.
   - Full URL query parameter customizability (font size, alignment, display mode, auto-hide timer, etc.).

3. **🟢 Chroma Key Fullscreen Green Stage (`?bg=green`)**
   - Tailored for streamers who prefer "Window Capture" on a secondary monitor.
   - **Strict 16:9 Standard Ratio Lock**: Preserves aspect ratio on any display (e.g., MacBook 16:10) to perfectly fit OBS 16:9 canvas without distortion.
   - Supports **Pure Green Mode** (shortcut: `H` or `Esc`) with auto-hiding controls when idle for ultra-clean window capture.

4. **🌐 Multi-Engine Translation Service (`/api/translate`)**
   - **Chrome On-Device AI Translation**: Uses Chrome built-in Translation API for offline, sub-50ms instant translation.
   - **Cloud Multi-Engine Failover**: Combines server in-memory caching with Google GTX and MyMemory fallback to guarantee unbroken translation during network spikes.

5. **🎬 Live Particle & Visual FX System (`effects.js`)**
   - Built-in physics particle engine supporting 6 large-scale stream effects (Fireworks 🎆, Glass Shatter 💥, Flower Bouquet 💐, Party Confetti 🎉, Floating Hearts 💖, Lightning Strike ⚡).
   - Automatically scales particle size, speed, and count proportionally for 1080p and 4K outputs.
   - Supports custom streamer avatar upload with dynamic speaking pulse animation.

---

## ✨ Features

- 🎙️ **Real-time Continuous Speech-to-Text**: Fast typing preview and automatic smart clause segmentation.
- 🌐 **Synchronized Bilingual Subtitles**: Displays original speech on top and translated captions below.
- 🟢 **Chroma Key Green Screen & Locked 16:9 Aspect Ratio**:
  - Strict 16:9 standard ratio lock (1920×1080).
  - Pure green screen mode (`H` or `Esc`).
  - Supports Chroma Green (`#00FF00`), Broadcast Green (`#00B140`), Chroma Blue (`#0000FF`), Dark (`#0F172A`), and transparent background.
- ⚡ **Zero-Latency WebSocket & BroadcastChannel Streaming**: Real-time sync from Chrome to OBS.
- 🎨 **Deep Customization**: Stroke strength, font sizes, alignments, text colors, and auto-hide timer.
- 👤 **Custom Streamer Avatar & Speaking Pulse**: Dynamic breathing pulse animation while speaking.
- 🎬 **Resolution-Adaptive Stage Particle FX**: Dynamic visual effects for viewer engagement.
- 🌍 **Full Multi-Language UI (i18n)**: One-click instant switching across 5 languages.
- 📜 **Transcription History & Export**: Live logging with one-click TXT export.

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

1. **Browser Requirement**: Speech recognition relies on the Google Web Speech API. **The Control Panel (speaking end) must be opened in Google Chrome** (the system includes automatic browser detection and alerts on non-Chrome browsers).
2. **Microphone Permissions**: When launching for the first time, allow microphone access when prompted by the browser.
3. Keep `npm start` running in the background while streaming.
