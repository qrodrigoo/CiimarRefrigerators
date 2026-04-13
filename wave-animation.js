/* ═══════════════════════════════════════════════════════════════
   Ribbon PS3 XMB  —  curva de Bézier cúbica com glow e partículas
═══════════════════════════════════════════════════════════════════ */

(function() {
  // Criar ou obter canvas
  let canvas = document.getElementById('wave-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'wave-canvas';
    // Estilos para o canvas ficar no fundo em full-screen
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = '0';
    canvas.style.pointerEvents = 'none';
    document.body.prepend(canvas);
  }

  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  /* ── Partículas (scintillas ao longo do ribbon) ─────────────── */
  const NUM_PARTICLES = 80;
  const particles = Array.from({ length: NUM_PARTICLES }, () => ({
    progress : Math.random(),
    offset   : (Math.random() - 0.5) * 54,   // desvio lateral
    size     : Math.random() * 2.2 + 0.6,
    opacity  : Math.random() * 0.55 + 0.15,
    speed    : Math.random() * 0.00015 + 0.00005,
  }));

  /* ── Ponto na curva de Bézier cúbica ────────────────────────── */
  function bezier(t, p0, p1, p2, p3) {
    const u = 1 - t;
    return u*u*u*p0 + 3*u*u*t*p1 + 3*u*t*t*p2 + t*t*t*p3;
  }

  function getRibbonPoint(prog, ts) {
    const W = canvas.width;
    const H = canvas.height;

    /*
     * Centro da logo (CSS: right:-60px, bottom:-60px, 520×520px):
     *   lx = W + 60 - 260 = W - 200
     *   ly = H + 60 - 260 = H - 200
     *
     * Os dois "orifícios" do nó ficam aprox. a ±160px do centro:
     *   Buraco esquerdo:  (lx - 160, ly)
     *   Buraco direito:   (lx + 90,  ly - 60)   ← saída
     */
    const lx = W - 200;
    const ly = H - 200;

    /* Entrada — canto inferior esquerdo, ondula bem forte */
    const x0 =  -W * 0.04;
    const y0 =   H * 0.82 + Math.sin(ts * 0.00042)           * H * 0.08;

    /* Saída — direita, ao nível inferior da logo */
    const x3 =   W * 1.04;
    const y3 =   H * 0.76 + Math.sin(ts * 0.00034 + 1.80)    * H * 0.07;

    /* Controlo 1 — aponta para o buraco ESQUERDO do nó (ao nível de ly) */
    const cx1 =  lx - 180;
    const cy1 =  ly        + Math.sin(ts * 0.00055 + 0.50)    * H * 0.09;

    /* Controlo 2 — sai pelo buraco DIREITO/superior do nó */
    const cx2 =  lx + 80;
    const cy2 =  ly - 90   + Math.sin(ts * 0.00048 + 2.20)    * H * 0.08;

    /* Cúbica de Bézier */
    const mt = 1 - prog;
    const x  = mt*mt*mt*x0 + 3*mt*mt*prog*cx1 + 3*mt*prog*prog*cx2 + prog*prog*prog*x3;
    const y  = mt*mt*mt*y0 + 3*mt*mt*prog*cy1 + 3*mt*prog*prog*cy2 + prog*prog*prog*y3;

    return { x, y };
  }

  /* ── Ribbon com efeito glow multicamada ─────────────────────── */
  function drawRibbon(ts) {
    /*
     * Desenhado de fora para dentro:
     * camadas largas e muito transparentes = halo difuso externo
     * camada fina e opaca = núcleo branco brilhante
     */
    const passes = [
      { w: 170, op: 0.018 },
      { w: 100, op: 0.040 },
      { w:  54, op: 0.075 },
      { w:  25, op: 0.135 },
      { w:  10, op: 0.220 },
      { w:   3, op: 0.500 }, // núcleo luminoso
    ];

    const STEPS = 260;

    passes.forEach(({ w, op }) => {
      ctx.beginPath();
      for (let i = 0; i <= STEPS; i++) {
        const { x, y } = getRibbonPoint(i / STEPS, ts);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(200, 230, 255, ${op})`;
      ctx.lineWidth   = w;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      ctx.stroke();
    });
  }

  /* ── Partículas brilhantes ao longo do ribbon ───────────────── */
  function drawParticles(ts) {
    particles.forEach(p => {
      p.progress = (p.progress + p.speed) % 1;

      const pt  = getRibbonPoint(p.progress,                        ts);
      const pt2 = getRibbonPoint(Math.min(p.progress + 0.007, 1),  ts);

      // Vetor perpendicular ao ribbon para o offset lateral
      const dx  = pt2.x - pt.x;
      const dy  = pt2.y - pt.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx  = -dy / len;
      const ny  =  dx / len;

      const px = pt.x + nx * p.offset;
      const py = pt.y + ny * p.offset;

      // Partícula com gradiente radial (ponto luminoso suave)
      const r = p.size * 3;
      const g = ctx.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0,   `rgba(230, 248, 255, ${p.opacity})`);
      g.addColorStop(0.4, `rgba(200, 235, 255, ${p.opacity * 0.5})`);
      g.addColorStop(1,   `rgba(180, 220, 255, 0)`);

      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
    });
  }

  /* ── Loop principal ─────────────────────────────────────────── */
  function animate(ts) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawRibbon(ts);
    drawParticles(ts);
    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
})();
