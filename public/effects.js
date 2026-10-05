// Live Stream Visual Effects Engine (OBS & Controller)
class LiveEffects {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.animId = null;
    this.activeEffect = null;
    this.effectTimer = null;
    this.lastTime = performance.now();

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement ? this.canvas.parentElement.getBoundingClientRect() : null;
    this.width = rect && rect.width > 0 ? rect.width : window.innerWidth;
    this.height = rect && rect.height > 0 ? rect.height : window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  // Calculate dynamic scale factor based on 16:9 reference resolution (960 x 540)
  // When viewed on 1920x1080 (standard OBS Full HD), scale is ~2.0
  // When viewed on 1280x720 (720p), scale is ~1.33
  // When viewed on 3840x2160 (4K), scale is ~4.0
  // When on web preview (e.g. 960x540), scale is 1.0
  getScale() {
    const baseW = 960;
    const baseH = 540;
    const sW = (this.width || 960) / baseW;
    const sH = (this.height || 540) / baseH;
    return Math.max(0.75, (sW + sH) / 2);
  }

  clear() {
    this.particles = [];
    this.activeEffect = null;
    clearTimeout(this.effectTimer);
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.width, this.height);
    }
    // Remove screen shake if active
    const parent = this.canvas.parentElement;
    if (parent) {
      parent.classList.remove('effect-shake');
    }
  }

  startLoop() {
    if (this.animId) return;
    this.lastTime = performance.now();
    const loop = (now) => {
      const dt = Math.min((now - this.lastTime) / 1000, 0.1);
      this.lastTime = now;

      this.updateAndDraw(dt);

      if (this.particles.length > 0 || this.activeEffect) {
        this.animId = requestAnimationFrame(loop);
      } else {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.animId = null;
      }
    };
    this.animId = requestAnimationFrame(loop);
  }

  updateAndDraw(dt) {
    this.ctx.clearRect(0, 0, this.width, this.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.gravity) p.vy += p.gravity * dt;
      if (p.drag) {
        p.vx *= (1 - p.drag * dt);
        p.vy *= (1 - p.drag * dt);
      }
      if (p.rotationSpeed) p.rotation += p.rotationSpeed * dt;

      const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.translate(p.x, p.y);
      if (p.rotation) this.ctx.rotate(p.rotation);

      if (p.type === 'circle') {
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, Math.max(1, p.size * alpha), 0, Math.PI * 2);
        this.ctx.fill();
      } else if (p.type === 'rect') {
        this.ctx.fillStyle = p.color;
        this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * (p.aspect || 1));
      } else if (p.type === 'shard') {
        this.ctx.fillStyle = p.color;
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        this.ctx.lineWidth = p.lineWidth || 2;
        this.ctx.beginPath();
        this.ctx.moveTo(p.pts[0].x, p.pts[0].y);
        for (let j = 1; j < p.pts.length; j++) {
          this.ctx.lineTo(p.pts[j].x, p.pts[j].y);
        }
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
      } else if (p.type === 'text') {
        this.ctx.font = `${p.size}px -apple-system, sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(p.text, 0, 0);
      } else if (p.type === 'lightning') {
        this.ctx.strokeStyle = p.color;
        this.ctx.lineWidth = p.size;
        this.ctx.shadowColor = '#60a5fa';
        this.ctx.shadowBlur = p.shadowBlur || 20;
        this.ctx.beginPath();
        this.ctx.moveTo(p.pts[0].x, p.pts[0].y);
        for (let j = 1; j < p.pts.length; j++) {
          this.ctx.lineTo(p.pts[j].x, p.pts[j].y);
        }
        this.ctx.stroke();
      }

      this.ctx.restore();
    }
  }

  // 1. Fireworks (璀璨煙火 - 16:9 全域綻放)
  triggerFireworks() {
    this.clear();
    this.resize();
    this.activeEffect = 'fireworks';
    const scale = this.getScale();

    const colors = ['#ff3838', '#ff9f1a', '#fff200', '#32ff7e', '#18dcff', '#7d5fff', '#ff3838', '#ffffff'];

    const spawnExplosion = (x, y) => {
      const color = colors[Math.floor(Math.random() * colors.length)];
      const count = Math.floor((75 + Math.random() * 35) * Math.min(1.4, scale));
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.25;
        const speed = (130 + Math.random() * 260) * scale;
        const life = 1.2 + Math.random() * 0.9;
        this.particles.push({
          type: 'circle',
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          gravity: 140 * scale,
          drag: 0.55,
          size: (3.5 + Math.random() * 4.5) * scale,
          color: Math.random() > 0.3 ? color : '#ffffff',
          life,
          maxLife: life
        });
      }
    };

    // Sequential multi-bursts across 16:9 coordinates
    const bursts = [
      { x: this.width * 0.3, y: this.height * 0.35, delay: 0 },
      { x: this.width * 0.7, y: this.height * 0.3, delay: 300 },
      { x: this.width * 0.5, y: this.height * 0.25, delay: 700 },
      { x: this.width * 0.2, y: this.height * 0.4, delay: 1100 },
      { x: this.width * 0.8, y: this.height * 0.38, delay: 1400 },
      { x: this.width * 0.4, y: this.height * 0.28, delay: 1800 },
      { x: this.width * 0.6, y: this.height * 0.22, delay: 2100 }
    ];

    bursts.forEach(b => {
      setTimeout(() => {
        if (this.activeEffect === 'fireworks') {
          spawnExplosion(b.x, b.y);
          this.startLoop();
        }
      }, b.delay);
    });

    this.startLoop();
    this.effectTimer = setTimeout(() => {
      this.activeEffect = null;
    }, 4500);
  }

  // 2. Glass Smash (砸破螢幕玻璃 - 震撼大碎片飛濺)
  triggerGlassSmash() {
    this.clear();
    this.resize();
    this.activeEffect = 'glass';
    const scale = this.getScale();

    const parent = this.canvas.parentElement;
    if (parent) {
      parent.classList.add('effect-shake');
      setTimeout(() => parent.classList.remove('effect-shake'), 450);
    }

    const cx = this.width / 2;
    const cy = this.height / 2;

    // Center impact flash & blast ring
    const blastCount = Math.floor(40 * Math.min(1.5, scale));
    for (let i = 0; i < blastCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (240 + Math.random() * 460) * scale;
      this.particles.push({
        type: 'circle',
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: 280 * scale,
        drag: 0.3,
        size: (3.5 + Math.random() * 4.5) * scale,
        color: '#ffffff',
        life: 0.8 + Math.random() * 0.6,
        maxLife: 1.4
      });
    }

    // Triangular glass shards flying outward with large visible crystal facets
    const shardCount = Math.floor(45 * Math.min(1.4, scale));
    for (let i = 0; i < shardCount; i++) {
      const angle = (Math.PI * 2 * i) / shardCount + (Math.random() - 0.5) * 0.35;
      const speed = (160 + Math.random() * 520) * scale;
      const s = (16 + Math.random() * 36) * scale;
      const pts = [
        { x: -s / 2, y: -s / 3 },
        { x: s / 2 + (Math.random() * 10 * scale), y: -s / 2 },
        { x: 0, y: s / 2 + (Math.random() * 10 * scale) }
      ];

      this.particles.push({
        type: 'shard',
        x: cx + (Math.random() - 0.5) * (60 * scale),
        y: cy + (Math.random() - 0.5) * (60 * scale),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (60 * scale),
        gravity: 520 * scale,
        drag: 0.15,
        lineWidth: Math.max(1.5, 2 * scale),
        pts,
        rotation: Math.random() * Math.PI,
        rotationSpeed: (Math.random() - 0.5) * 12,
        color: 'rgba(235, 248, 255, 0.5)',
        life: 2.8 + Math.random() * 1.0,
        maxLife: 3.8
      });
    }

    this.startLoop();
    this.effectTimer = setTimeout(() => {
      this.activeEffect = null;
    }, 4000);
  }

  // 3. Flower Petals / Bouquets (浪漫送花 - 醒目大朵花束花瓣雨)
  triggerFlowers() {
    this.clear();
    this.resize();
    this.activeEffect = 'flowers';
    const scale = this.getScale();

    const flowers = ['🌸', '🌹', '💐', '🌺', '🌷', '✨', '🌼'];
    const count = 55;

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        if (this.activeEffect !== 'flowers') return;
        const x = Math.random() * this.width;
        const char = flowers[Math.floor(Math.random() * flowers.length)];
        const life = 3.5 + Math.random() * 2.0;

        this.particles.push({
          type: 'text',
          text: char,
          x,
          y: -(50 * scale),
          vx: (Math.random() - 0.5) * (90 * scale),
          vy: (85 + Math.random() * 150) * scale,
          gravity: 28 * scale,
          rotation: Math.random() * Math.PI,
          rotationSpeed: (Math.random() - 0.5) * 3,
          size: Math.round((28 + Math.random() * 24) * scale),
          life,
          maxLife: life
        });
        this.startLoop();
      }, i * 60);
    }

    this.startLoop();
    this.effectTimer = setTimeout(() => {
      this.activeEffect = null;
    }, 6500);
  }

  // 4. Confetti Cannon (彩帶噴射 - 雙側全視窗高射彩帶)
  triggerConfetti() {
    this.clear();
    this.resize();
    this.activeEffect = 'confetti';
    const scale = this.getScale();

    const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#eab308'];
    const count = Math.floor(130 * Math.min(1.4, scale));

    // Launch from bottom left and bottom right corners
    for (let i = 0; i < count; i++) {
      const fromLeft = i % 2 === 0;
      const x = fromLeft ? 0 : this.width;
      const y = this.height * 0.92;
      const angle = fromLeft
        ? -Math.PI / 4 + (Math.random() - 0.5) * 0.5
        : -3 * Math.PI / 4 + (Math.random() - 0.5) * 0.5;
      const speed = (420 + Math.random() * 480) * scale;
      const life = 3.2 + Math.random() * 1.5;

      this.particles.push({
        type: 'rect',
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        gravity: 270 * scale,
        drag: 0.45,
        size: (10 + Math.random() * 9) * scale,
        aspect: 1.8 + Math.random() * 1.2,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 14,
        color: colors[Math.floor(Math.random() * colors.length)],
        life,
        maxLife: life
      });
    }

    this.startLoop();
    this.effectTimer = setTimeout(() => {
      this.activeEffect = null;
    }, 5000);
  }

  // 5. Floating Hearts (滿滿愛心 - 溫暖大顆立體愛心群)
  triggerHearts() {
    this.clear();
    this.resize();
    this.activeEffect = 'hearts';
    const scale = this.getScale();

    const hearts = ['❤️', '💖', '💕', '💗', '💓', '🥰', '✨'];
    const count = 50;

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        if (this.activeEffect !== 'hearts') return;
        const x = this.width * 0.12 + Math.random() * (this.width * 0.76);
        const char = hearts[Math.floor(Math.random() * hearts.length)];
        const life = 3.0 + Math.random() * 1.8;

        this.particles.push({
          type: 'text',
          text: char,
          x,
          y: this.height + (40 * scale),
          vx: (Math.random() - 0.5) * (70 * scale),
          vy: -(125 + Math.random() * 175) * scale,
          gravity: -20 * scale,
          rotation: (Math.random() - 0.5) * 0.3,
          rotationSpeed: (Math.random() - 0.5) * 1.5,
          size: Math.round((30 + Math.random() * 26) * scale),
          life,
          maxLife: life
        });
        this.startLoop();
      }, i * 70);
    }

    this.startLoop();
    this.effectTimer = setTimeout(() => {
      this.activeEffect = null;
    }, 6000);
  }

  // 6. Lightning Strike (雷電震撼 - 粗壯雷光與電弧)
  triggerLightning() {
    this.clear();
    this.resize();
    this.activeEffect = 'lightning';
    const scale = this.getScale();

    const parent = this.canvas.parentElement;
    if (parent) {
      parent.classList.add('effect-flash');
      setTimeout(() => parent.classList.remove('effect-flash'), 250);
    }

    const generateBolt = (startX, startY, endY) => {
      const pts = [{ x: startX, y: startY }];
      let curX = startX;
      let curY = startY;

      while (curY < endY) {
        curY += (25 + Math.random() * 35) * scale;
        curX += (Math.random() - 0.5) * (75 * scale);
        pts.push({ x: curX, y: Math.min(curY, endY) });
      }
      return pts;
    };

    // Main central bolt + side branches
    const cx = this.width * (0.35 + Math.random() * 0.3);
    const mainPts = generateBolt(cx, 0, this.height * 0.85);

    this.particles.push({
      type: 'lightning',
      pts: mainPts,
      size: 5.5 * scale,
      shadowBlur: 25 * scale,
      color: '#ffffff',
      x: 0, y: 0, vx: 0, vy: 0,
      life: 0.45,
      maxLife: 0.45
    });

    // Branch 1
    if (mainPts.length > 4) {
      const mid = mainPts[Math.floor(mainPts.length / 2)];
      this.particles.push({
        type: 'lightning',
        pts: generateBolt(mid.x, mid.y, this.height * 0.7),
        size: 3.2 * scale,
        shadowBlur: 18 * scale,
        color: '#93c5fd',
        x: 0, y: 0, vx: 0, vy: 0,
        life: 0.35,
        maxLife: 0.35
      });
    }

    this.startLoop();
    this.effectTimer = setTimeout(() => {
      this.activeEffect = null;
    }, 1200);
  }

  // Generic Trigger by Name
  trigger(name) {
    switch (name) {
      case 'fireworks':
        this.triggerFireworks();
        break;
      case 'glass':
        this.triggerGlassSmash();
        break;
      case 'flowers':
        this.triggerFlowers();
        break;
      case 'confetti':
        this.triggerConfetti();
        break;
      case 'hearts':
        this.triggerHearts();
        break;
      case 'lightning':
        this.triggerLightning();
        break;
      case 'clear':
        this.clear();
        break;
      default:
        console.warn('Unknown effect:', name);
    }
  }
}

// Export for browser
window.LiveEffects = LiveEffects;
