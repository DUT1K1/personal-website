// The hero's dot field. Every dot has a home; the pointer pushes dots away,
// springs pull them back, and a click sends a shockwave through the grid.
// Homes can be re-targeted to sample text, which is how the easter egg spells.
// The loop sleeps whenever everything has settled, so an idle hero costs nothing.
//
// On load the field plays a two-act intro: the dots swirl in a flowing
// current, then a wave spreads out from the portrait and each dot snaps into
// the grid as the wave reaches it, glinting as it locks in.

const SPACING = 26;
const POINTER_RADIUS = 130;
const POINTER_FORCE = 2.4;
const SPRING = 0.045;
const FRICTION = 0.82;
const SETTLE_EPSILON = 0.04;
const INTRO_CHAOS_MS = 1100;
const INTRO_SPREAD_MS = 1800;
const INTRO_SCATTER = 220;
// Released dots glide a little softer than the everyday spring, so the
// assembly reads as settling rather than snapping.
const INTRO_SPRING = 0.032;
const INTRO_FRICTION = 0.86;
const PALETTE = {
  base: [201, 197, 193],
  warm: [255, 134, 96],
  cool: [154, 51, 255],
  flagRed: [232, 17, 45],
  white: [255, 255, 255],
};

const mix = (a, b, t) => a.map((value, index) => Math.round(value + (b[index] - value) * t));

export const createHeroField = (canvas, { reducedMotion = false, origin } = {}) => {
  const context = canvas.getContext("2d");
  if (!context) return null;

  let width = 0;
  let height = 0;
  let ratio = 1;
  let particles = [];
  let frame = 0;
  let visible = true;
  let pointer = { x: -9999, y: -9999, active: false };
  let waves = [];
  let textMode = null;
  // start/origin are filled in on the first frame, once layout is known.
  let intro = reducedMotion ? null : { start: null, origin: null, end: 0 };

  const layoutGrid = () => {
    const columns = Math.ceil(width / SPACING) + 1;
    const rows = Math.ceil(height / SPACING) + 1;
    const offsetX = (width - (columns - 1) * SPACING) / 2;
    const offsetY = (height - (rows - 1) * SPACING) / 2;
    const homes = [];

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        homes.push({ x: offsetX + column * SPACING, y: offsetY + row * SPACING });
      }
    }
    return homes;
  };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    // The observer also fires once right after observe(); nothing to redo then.
    if (particles.length && rect.width === width && rect.height === height) return;
    ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    const homes = layoutGrid();
    const isFirstLayout = particles.length === 0;
    particles = homes.map((home, index) => {
      const previous = particles[index];
      // The intro begins with every dot thrown loosely around its home.
      const angle = Math.random() * Math.PI * 2;
      const reach = Math.sqrt(Math.random()) * INTRO_SCATTER;
      const start = previous ?? (isFirstLayout && intro
        ? { x: home.x + Math.cos(angle) * reach, y: home.y + Math.sin(angle) * reach }
        : home);

      return {
        x: start.x,
        y: start.y,
        vx: 0,
        vy: 0,
        gridX: home.x,
        gridY: home.y,
        hx: home.x,
        hy: home.y,
        // Static per-dot variation so the field reads as texture, not graph paper.
        seed: Math.random(),
        text: false,
        // A resize mid-intro must not reset where each dot is in the show.
        released: previous?.released ?? !intro,
        locked: previous?.locked ?? !intro,
        flash: previous?.flash ?? 0,
        release: previous?.release ?? 0,
      };
    });

    if (intro?.start != null) scheduleRelease();

    if (textMode) applyText(textMode.text);
    wake();
  };

  const sampleText = (text) => {
    const buffer = document.createElement("canvas");
    const fontSize = Math.min((width * 0.86) / (text.length * 0.66), height * 0.36);
    buffer.width = Math.ceil(width);
    buffer.height = Math.ceil(height);
    const bufferContext = buffer.getContext("2d");
    bufferContext.fillStyle = "#fff";
    bufferContext.textAlign = "center";
    bufferContext.textBaseline = "middle";
    bufferContext.font = `800 ${fontSize}px "Noto Sans Georgian", "Poppins", system-ui, sans-serif`;
    bufferContext.fillText(text, width / 2, height / 2);

    const data = bufferContext.getImageData(0, 0, buffer.width, buffer.height).data;
    // Dense enough to read, but never more points than there are dots.
    let step = Math.max(4, Math.round(fontSize / 22));
    const coverage = () => {
      let count = 0;
      for (let y = 0; y < buffer.height; y += step) {
        for (let x = 0; x < buffer.width; x += step) {
          if (data[(y * buffer.width + x) * 4 + 3] > 128) count += 1;
        }
      }
      return count;
    };
    while (coverage() > particles.length * 0.9) step += 1;
    const points = [];
    for (let y = 0; y < buffer.height; y += step) {
      for (let x = 0; x < buffer.width; x += step) {
        if (data[(y * buffer.width + x) * 4 + 3] > 128) points.push({ x, y });
      }
    }
    return points;
  };

  const applyText = (text) => {
    const points = sampleText(text);
    // Give each text point the nearest-ish free dot by walking both lists in
    // a shuffled order; good enough to look intentional, cheap to compute.
    const order = particles.map((_, index) => index).sort(() => Math.random() - 0.5);

    particles.forEach((particle) => {
      particle.text = false;
      particle.hx = particle.gridX;
      particle.hy = particle.gridY;
    });

    points.forEach((point, index) => {
      const particle = particles[order[index % order.length]];
      particle.hx = point.x;
      particle.hy = point.y;
      particle.text = true;
    });
  };

  // When the ordering wave reaches each dot. A little jitter keeps the wave
  // front organic instead of a perfect circle.
  const scheduleRelease = () => {
    particles.forEach((particle) => {
      if (particle.released) return;
      const distance = Math.hypot(particle.gridX - intro.origin.x, particle.gridY - intro.origin.y);
      particle.release = INTRO_CHAOS_MS + (distance / intro.radius) * INTRO_SPREAD_MS + particle.seed * 160;
    });
  };

  const beginIntro = (now) => {
    const point = origin?.() ?? { x: width * 0.72, y: height * 0.45 };
    const corners = [
      [0, 0],
      [width, 0],
      [0, height],
      [width, height],
    ];
    const farthest = Math.max(...corners.map(([x, y]) => Math.hypot(x - point.x, y - point.y)));
    intro.start = now;
    intro.origin = point;
    intro.radius = farthest;
    scheduleRelease();
    intro.end = INTRO_CHAOS_MS + INTRO_SPREAD_MS + 160;
  };

  // A slowly turning flow field: neighbours drift together, like a current.
  const flowAngle = (x, y, t) =>
    Math.sin(x * 0.0042 + t * 0.0007) * Math.PI +
    Math.cos(y * 0.0051 - t * 0.0005) * Math.PI;

  const draw = () => {
    context.clearRect(0, 0, width, height);
    const now = performance.now();

    for (const particle of particles) {
      const dx = particle.x - pointer.x;
      const dy = particle.y - pointer.y;
      const near = pointer.active ? Math.max(0, 1 - Math.hypot(dx, dy) / (POINTER_RADIUS * 1.6)) : 0;
      const displaced = Math.min(1, Math.hypot(particle.x - particle.hx, particle.y - particle.hy) / 40);
      const swirling = intro && !particle.released;
      // Free dots glow, but softer than a dot the pointer is pushing.
      const energy = Math.max(near, swirling ? displaced * 0.55 : displaced, particle.flash);

      let color;
      let alpha;
      let size;

      if (textMode) {
        if (particle.text) {
          color = mix(PALETTE.flagRed, PALETTE.white, particle.seed < 0.18 ? 1 : 0);
          alpha = 0.95;
          size = 2.6;
        } else {
          color = PALETTE.base;
          alpha = 0.06;
          size = 1.4;
        }
      } else {
        const hue = mix(PALETTE.warm, PALETTE.cool, Math.min(1, particle.x / Math.max(1, width)));
        color = mix(mix(PALETTE.base, hue, energy), PALETTE.white, particle.flash * 0.6);
        alpha = 0.16 + particle.seed * 0.1 + energy * 0.72;
        size = 1.5 + energy * 1.6;
      }

      context.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
      context.fillRect(particle.x - size / 2, particle.y - size / 2, size, size);
    }

    if (intro?.start != null) {
      const elapsed = now - intro.start - INTRO_CHAOS_MS;
      if (elapsed > 0 && elapsed < INTRO_SPREAD_MS) {
        const progress = elapsed / INTRO_SPREAD_MS;
        const radius = progress * intro.radius;
        context.strokeStyle = `rgba(255, 157, 125, ${0.22 * (1 - progress)})`;
        context.lineWidth = 1.5;
        context.beginPath();
        context.arc(intro.origin.x, intro.origin.y, radius, 0, Math.PI * 2);
        context.stroke();
      }
    }

    waves = waves.filter((wave) => now - wave.start < 900);
    for (const wave of waves) {
      const progress = (now - wave.start) / 900;
      const radius = 20 + progress * 360;
      context.strokeStyle = `rgba(255, 157, 125, ${0.35 * (1 - progress)})`;
      context.lineWidth = 1.5;
      context.beginPath();
      context.arc(wave.x, wave.y, radius, 0, Math.PI * 2);
      context.stroke();
    }
  };

  const step = () => {
    frame = 0;
    const now = performance.now();
    let moving = waves.length > 0;

    if (intro && intro.start === null) beginIntro(now);
    const introElapsed = intro ? now - intro.start : 0;
    if (intro) moving = true;

    for (const particle of particles) {
      particle.flash *= 0.93;
      if (particle.flash < 0.01) particle.flash = 0;
      else moving = true;
      if (pointer.active) {
        const dx = particle.x - pointer.x;
        const dy = particle.y - pointer.y;
        const distance = Math.hypot(dx, dy);
        if (distance < POINTER_RADIUS && distance > 0.01) {
          const force = (1 - distance / POINTER_RADIUS) ** 2 * POINTER_FORCE;
          particle.vx += (dx / distance) * force;
          particle.vy += (dy / distance) * force;
        }
      }

      if (intro && !particle.released) {
        if (introElapsed >= particle.release) {
          particle.released = true;
        } else {
          // Act one: ride the current, loosely tethered so each dot stays
          // in its neighbourhood and the assembly reads clearly.
          const angle = flowAngle(particle.x, particle.y, now);
          particle.vx += Math.cos(angle) * 0.32 + (particle.gridX - particle.x) * 0.0016;
          particle.vy += Math.sin(angle) * 0.32 + (particle.gridY - particle.y) * 0.0016;
          particle.vx *= 0.93;
          particle.vy *= 0.93;
          particle.x += particle.vx;
          particle.y += particle.vy;
          continue;
        }
      }

      const assembling = intro && !particle.locked;
      particle.vx += (particle.hx - particle.x) * (assembling ? INTRO_SPRING : SPRING);
      particle.vy += (particle.hy - particle.y) * (assembling ? INTRO_SPRING : SPRING);
      particle.vx *= assembling ? INTRO_FRICTION : FRICTION;
      particle.vy *= assembling ? INTRO_FRICTION : FRICTION;
      particle.x += particle.vx;
      particle.y += particle.vy;

      // Act two's payoff: a brief glint the moment a dot finds its place.
      if (!particle.locked && Math.hypot(particle.hx - particle.x, particle.hy - particle.y) < 1.2) {
        particle.locked = true;
        particle.flash = 0.9;
      }

      if (
        Math.abs(particle.vx) > SETTLE_EPSILON ||
        Math.abs(particle.vy) > SETTLE_EPSILON ||
        Math.abs(particle.hx - particle.x) > 0.3 ||
        Math.abs(particle.hy - particle.y) > 0.3
      ) {
        moving = true;
      }
    }

    if (intro && introElapsed > intro.end && particles.every((particle) => particle.locked)) {
      intro = null;
    } else if (intro && introElapsed > intro.end + 2500) {
      // Stragglers (e.g. held off by the pointer) just join the normal physics.
      particles.forEach((particle) => {
        particle.released = true;
        particle.locked = true;
      });
      intro = null;
    }

    draw();
    if ((moving || pointer.active) && visible) frame = window.requestAnimationFrame(step);
  };

  const wake = () => {
    if (reducedMotion) {
      particles.forEach((particle) => {
        particle.x = particle.hx;
        particle.y = particle.hy;
      });
      draw();
      return;
    }
    if (!frame && visible) frame = window.requestAnimationFrame(step);
  };

  const localPoint = (event) => {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const shockwave = (x, y) => {
    if (reducedMotion) return;
    waves.push({ x, y, start: performance.now() });
    for (const particle of particles) {
      const dx = particle.x - x;
      const dy = particle.y - y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const force = Math.max(0, 1 - distance / 380) * 14;
      particle.vx += (dx / distance) * force;
      particle.vy += (dy / distance) * force;
    }
    wake();
  };

  const host = canvas.parentElement;
  const onPointerMove = (event) => {
    if (event.pointerType !== "mouse" || reducedMotion) return;
    const point = localPoint(event);
    pointer = { ...point, active: true };
    wake();
  };
  const onPointerLeave = () => {
    pointer = { x: -9999, y: -9999, active: false };
    wake();
  };
  const onPointerDown = (event) => {
    // Clicks on real controls keep their meaning; empty space gets the ripple.
    if (event.target instanceof Element && event.target.closest("a, button, input, img")) return;
    const point = localPoint(event);
    shockwave(point.x, point.y);
  };

  host?.addEventListener("pointermove", onPointerMove);
  host?.addEventListener("pointerleave", onPointerLeave);
  host?.addEventListener("pointerdown", onPointerDown);

  // Scrolling moves the page under a still cursor without firing any pointer
  // events, so remember where the mouse is on screen and re-aim on scroll.
  // That also covers the hero scrolling back under a cursor that was parked
  // further down the page.
  let lastClient = null;
  window.addEventListener(
    "pointermove",
    (event) => {
      lastClient = event.pointerType === "mouse" ? { x: event.clientX, y: event.clientY } : null;
    },
    { passive: true }
  );

  window.addEventListener(
    "scroll",
    () => {
      if (!lastClient || reducedMotion) return;
      // Hit-test rather than compare rectangles: the fixed header covers the
      // top of the hero, and a cursor over it shouldn't stir the dots.
      const under = document.elementFromPoint(lastClient.x, lastClient.y);
      if (host && under && host.contains(under)) {
        pointer = { ...localPoint({ clientX: lastClient.x, clientY: lastClient.y }), active: true };
        wake();
      } else if (pointer.active) {
        onPointerLeave();
      }
    },
    { passive: true }
  );

  const resizeObserver = new ResizeObserver(() => resize());
  resizeObserver.observe(canvas);

  const visibilityObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) wake();
  });
  visibilityObserver.observe(canvas);

  let textTimer;
  const spell = async (text, duration = 6500) => {
    await document.fonts?.load(`800 64px "Noto Sans Georgian"`, text).catch(() => {});
    window.clearTimeout(textTimer);
    textMode = { text };
    applyText(text);
    shockwave(width / 2, height / 2);
    wake();

    textTimer = window.setTimeout(() => {
      textMode = null;
      particles.forEach((particle) => {
        particle.text = false;
        particle.hx = particle.gridX;
        particle.hy = particle.gridY;
      });
      shockwave(width / 2, height / 2);
    }, duration);
  };

  resize();
  return { spell, shockwave };
};
