# Mizuki Aiga - OBS 实时双语字幕机 (Live Caption for OBS)

[繁體中文](README.md) | [English](README.en.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md) | [한국어](README.ko.md)

专为游戏主播、实况主与 VTuber 设计的 OBS Studio 实时语音识别与双语翻译字幕工具。

---

## 📖 项目背景与命名由来

本项目最初是为了与 **蓝芽水月（Aiga Mizuki）** 联动直播时，为 OBS Studio 提供极速语音识别与双语即时翻译字幕而量身打造的实况专用系统，随后自该实况需求独立分流优化而成。为纪念这次合作直播的诞生契机，项目正式命名为 **Mizuki Aiga**。

---

## 🧩 各子系统架构介绍

本系统由多个高度模块化的独立子系统协同运作：

1. **🎙️ 主控工作台系统 (Web Control Panel - `/`)**
   - 负责主播麦克风音频采集与 Google Web Speech API 语音连续听写。
   - 支持智能断句结算、实时音量跳动监控（VU Meter）、麦克风设备扫描切换与数字增益控制。
   - 提供 5 国 UI 语系无缝切换（繁中、日文、英文、简中、韩文），并内置 Chrome 浏览器环境自动检测（非 Chrome 浏览器自动弹窗警示）。
   - 具备快速常用语广播板（快捷模板）与识别历史记录导出（TXT 笔记）。

2. **📺 OBS 专属透明图层系统 (OBS Overlay Browser Source - `/overlay.html`)**
   - 专为 OBS Studio“浏览器来源 (Browser Source)”打造的纯粹渲染画布。
   - 具备 **100% 原生 Alpha 透明通道**，文字描边干净利落，完全免除传统色度键的去背调校与绿光色溢问题。
   - 通过 WebSocket 与 BroadcastChannel 与控制台达成零延迟实时同步。
   - 支持完整的 URL Query 参数自定义（字号、对齐、排版模式、自动隐藏秒数等）。

3. **🟢 色度键全屏实况舞台 (Chroma Key Green Stage - `?bg=green`)**
   - 专门为喜爱使用副屏幕“窗口采集 (Window Capture)”的主播打造。
   - **严格 16:9 黄金比例锁定**：无论主机屏幕规格（如 MacBook 16:10），绿幕舞台皆强制等比缩放，对齐 OBS 16:9 直播画布不发生形变。
   - 支持“**🔲 隐藏功能栏（纯绿幕模式）**”（快捷键：`H` 或 `Esc`），鼠标闲置时自动隐藏操作钮，打造最纯净的绿幕窗口。

4. **🌐 多引擎智能容错翻译系统 (Multi-Engine Translation Service - `/api/translate`)**
   - **本地 Chrome 离线翻译**：支持 Chrome 内置 AI Translation API，免走网络、毫秒级极速响应。
   - **云端多重容错备援**：整合服务器内存缓存 + Google GTX 与 MyMemory 翻译引擎，遇网络波动自动平滑切换，确保实况翻译永不中断。

5. **🎬 实况粒子与动态视觉系统 (Visual & Particle FX System - `effects.js`)**
   - 内置高清粒子物理运算引擎，支持一键施放 6 种大型实况特效（放烟火 🎆、砸碎屏幕 💥、浪漫送花 💐、派对拉炮 🎉、满满爱心 💖、雷电轰顶 ⚡）。
   - 特效速度、数量与重力全面支持 16:9 高分辨率自适应等比放大，在 1080p/4K 画布上呈现饱满震撼视觉张力。
   - 支持主播自定义头像上传，并联动动态发话呼吸律动（Speaking Pulse）。

---

## ✨ 特色亮点

- 🎙️ **实时语音连续听写**：高准确率语音识别，说话时即时打字预览，断句时自动结算。
- 🌐 **双语同步排版**：上方显示“原文”、下方显示“翻译字幕”，完美契合实况观众与外语受众交流需求。
- 🟢 **绿幕（Chroma Key）支持与 16:9 黄金比例**：
  - 严格 16:9 标准比例锁定（1920×1080 规格）。
  - 支持一键隐藏功能栏（纯绿幕模式）。
  - 支持纯绿幕、专业实况绿、蓝幕、深色底与透明底模式。
- ⚡ **WebSocket + BroadcastChannel 实时串流**：Chrome 麦克风 0 延迟同步至 OBS。
- 🎨 **高度个性化外观**：黑边描边强度、字体大小、对齐位置与文字颜色。
- 👤 **字幕前置头像 / 贴图**：自带动态呼吸律动效果（Speaking Pulse）。
- 🎬 **直播实时绿幕特效栏**：烟火、碎屏、送花、彩带、爱心、雷电。
- 🌍 **完整多语言 UI（i18n）**：繁中、简中、英文、日文、韩文实时切换。
- 📜 **历史记录与导出**：一键导出为 TXT 文件。

---

## 🚀 快速启动

在终端进入项目目录并执行：

```bash
npm start
```

服务器将在 `http://localhost:3000` 启动。

---

## 📺 OBS 连接方式（两种任选）

### 方案 A：OBS“浏览器来源”（最推荐 ⭐⭐⭐⭐⭐）
> **优势**：背景自动为 100% 纯透明（Alpha 通道），文字边缘最干净、无绿幕反光色溢（Color Bleed）。

1. 启动服务器后，在浏览器打开控制面板：`http://localhost:3000`。
2. 点击顶部工具栏的“**📋 复制 OBS 网址**”（网址为：`http://localhost:3000/overlay.html`）。
3. 打开 **OBS Studio**：
   - 在“来源”面板中点击“**+**”➜ 选择“**浏览器 (Browser)**”。
   - 名称可设定为“双语实时字幕”。
   - 将“URL”设为：`http://localhost:3000/overlay.html`。
   - 将“宽度”设为 **1920**，“高度”设为 **1080**（或与您的直播画布分辨率相同）。
   - 点击确定。
4. 回到 Chrome 控制网页，点击右上角“**开始聆听**”并对着麦克风说话，OBS 画面就会自动同步出现双语字幕！

---

### 方案 B：OBS“窗口采集”+“色度键绿幕过滤”
> **优势**：可直接将 Chrome 窗口独立放置在副屏幕上，直观监视。

1. 在 Chrome 控制网页中点击“**🟢 绿幕全屏**”（或直接打开 `http://localhost:3000/overlay.html?bg=green`）。
2. 打开 **OBS Studio**：
   - 在“来源”面板点击“**+**”➜ 选择“**窗口采集 (Window Capture)**”。
   - 选择刚刚打开绿幕的 Chrome 窗口。
3. 在该窗口来源上点击**右键** ➜ 选择“**滤镜 (Filters)**”：
   - 在左下角点击“**+**”➜ 选择“**色度键 (Chroma Key)**”。
   - “颜色类型”选择“**绿 (Green)**”。
   - OBS 会自动将纯绿色背景掏空透明，只保留双语字幕！
4. 点击 Chrome 画面右上角的“退出全屏”或按键盘 `Esc` 即可恢复控制界面。

---

## ⚙️ 参数进阶调整（OBS Overlay URL 参数）

若使用 OBS 浏览器来源，亦可直接在网址后方添加参数，例如：

- `http://localhost:3000/overlay.html?mode=both`（默认，双语显示：上方原文、下方翻译）
- `http://localhost:3000/overlay.html?mode=original`（仅显示原文语言）
- `http://localhost:3000/overlay.html?mode=translation`（仅显示翻译后语言）
- `http://localhost:3000/overlay.html?bg=green`（强制使用绿幕底）
- `http://localhost:3000/overlay.html?size=huge`（强制使用特大字体）
- `http://localhost:3000/overlay.html?autohide=5`（静音 5 秒后自动隐藏）
- `http://localhost:3000/overlay.html?stroke=thick`（超粗黑边）

---

## 💡 注意事项

1. **浏览器内核限制**：语音识别依赖 Google Web Speech API，因此**控制面板（说话端）请务必使用 Google Chrome 浏览器打开**（系统已内置自动检测，非 Chrome 浏览器打开时将弹出提示通知）。
2. **麦克风权限**：首次打开时，浏览器会弹出麦克风权限提示，请点击“允许”。
3. 只要保持后台 `npm start` 运行，即可随时在直播中无限制使用。
