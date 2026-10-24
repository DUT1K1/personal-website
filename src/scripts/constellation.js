// Skills, roles and projects as a 3D map. Each skill area is its own tidy
// cluster on an outer ring; the roles and projects sit in the core, so every
// line reads as "this skill was used here". The side panel drives the camera
// through the API returned by createConstellation.

export const COLORS = {
  category: "#5badff",
  skill: "#ff8660",
  role: "#3bd6a6",
  project: "#b57bff",
};
const SIZES = { category: 0.42, skill: 0.2, role: 0.3, project: 0.3 };
const LABEL_PRIORITY = { focus: 0, neighbor: 1, category: 2, role: 3, project: 3, skill: 4 };
const RING_RADIUS = 7;
const CLUSTER_RADIUS = 1.9;
const CORE_RADIUS = 2.6;
const HOME_CAMERA = { x: 0, y: 8.5, z: 17 };
// Rough radius of the whole map, used to keep it in frame on narrow screens.
const MAP_RADIUS = RING_RADIUS + CLUSTER_RADIUS;
const INTRO_MS = 1200;
// Camera easing: each frame closes this share of the remaining gap (per
// second, frame-rate independent), so moves start briskly and settle softly.
const CAMERA_EASE = 6.5;
const MIN_DISTANCE = 4;
const MAX_DISTANCE = 30;
const HOVER_RADIUS = 26;

const easeOut = (t) => 1 - (1 - t) ** 4;

export const buildGraph = (groups, places) => {
  const nodes = [];
  const edges = [];
  const byId = new Map();
  const add = (node) => {
    if (byId.has(node.id)) return byId.get(node.id);
    const created = { ...node, neighbors: new Set() };
    byId.set(node.id, created);
    nodes.push(created);
    return created;
  };
  const link = (a, b) => {
    edges.push([a, b]);
    a.neighbors.add(b);
    b.neighbors.add(a);
  };

  groups.forEach((group) => {
    const category = add({ id: `group:${group.label}`, label: group.label, kind: "category" });
    category.skills = [];
    group.skills.forEach((skill) => {
      const skillNode = add({
        id: `skill:${skill.name}`,
        label: skill.name,
        kind: "skill",
        area: category,
        uses: skill.usedIn.filter((placeId) => places[placeId]).length,
      });
      category.skills.push(skillNode);
      link(category, skillNode);
      skill.usedIn.forEach((placeId) => {
        const place = places[placeId];
        if (!place) return;
        const placeNode = add({
          id: placeId,
          label: place.label,
          kind: place.kind === "Role" ? "role" : "project",
          target: placeId,
        });
        link(skillNode, placeNode);
      });
    });
  });

  return { nodes, edges, byId };
};

// Deterministic positions, so the map looks the same on every visit and
// "Java is top-left" stays true between sessions.
const layout = (graph) => {
  const categories = graph.nodes.filter((node) => node.kind === "category");
  categories.forEach((category, index) => {
    const angle = (index / categories.length) * Math.PI * 2 - Math.PI / 2;
    const center = {
      x: Math.cos(angle) * RING_RADIUS,
      y: index % 2 === 0 ? 0.9 : -0.9,
      z: Math.sin(angle) * RING_RADIUS,
    };
    Object.assign(category, center);

    // Skills on a small Fibonacci sphere around their hub. The most-used
    // skills face the core, so their lines stay short and readable.
    const skills = [...category.skills].sort((a, b) => b.uses - a.uses);
    const inward = { x: -Math.cos(angle), z: -Math.sin(angle) };
    skills.forEach((skill, skillIndex) => {
      const t = (skillIndex + 0.5) / skills.length;
      const y = 1 - t * 2;
      const radius = Math.sqrt(1 - y * y);
      const theta = skillIndex * Math.PI * (3 - Math.sqrt(5));
      const local = { x: Math.cos(theta) * radius, y, z: Math.sin(theta) * radius };
      // Rotate so the first (most used) points toward the core.
      const lean = 0.55 * (1 - t);
      skill.x = center.x + (local.x + inward.x * lean) * CLUSTER_RADIUS;
      skill.y = center.y + local.y * CLUSTER_RADIUS * 0.8;
      skill.z = center.z + (local.z + inward.z * lean) * CLUSTER_RADIUS;
    });
  });

  const core = graph.nodes.filter((node) => node.kind === "role" || node.kind === "project");
  const roles = core.filter((node) => node.kind === "role");
  const projects = core.filter((node) => node.kind === "project");
  const placeRing = (list, y, offset) =>
    list.forEach((node, index) => {
      const angle = (index / list.length) * Math.PI * 2 + offset;
      node.x = Math.cos(angle) * CORE_RADIUS;
      node.y = y;
      node.z = Math.sin(angle) * CORE_RADIUS;
    });
  placeRing(roles, 0.9, 0);
  placeRing(projects, -0.9, Math.PI / Math.max(1, projects.length));
};

const glowTexture = (THREE) => {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.25, "rgba(255,255,255,0.35)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

export const createConstellation = async (
  container,
  graph,
  { reducedMotion = false, onPick, onHover } = {}
) => {
  const THREE = await import("three");
  const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");

  layout(graph);

  const canvas = document.createElement("canvas");
  canvas.className = "constellation-canvas";
  const labelLayer = document.createElement("div");
  labelLayer.className = "constellation-labels";
  labelLayer.setAttribute("aria-hidden", "true");

  // Throws when WebGL can't start (blocklisted GPU, hardware acceleration off);
  // the caller turns that into a visible fallback.
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  container.prepend(canvas, labelLayer);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x121110, 16, 34);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  // The home view backs off on tall, narrow stages (phones) until the whole
  // ring fits across, instead of cropping the outer clusters.
  const homePosition = () => {
    const home = new THREE.Vector3(HOME_CAMERA.x, HOME_CAMERA.y, HOME_CAMERA.z);
    const halfWidth = Math.tan((camera.fov * Math.PI) / 360) * camera.aspect;
    const needed = (MAP_RADIUS * 1.08) / Math.max(0.01, halfWidth);
    return home.setLength(Math.min(MAX_DISTANCE, Math.max(home.length(), needed)));
  };
  // Until someone moves the camera, resizes keep re-fitting the home view.
  let cameraTouched = false;
  camera.position.set(HOME_CAMERA.x, HOME_CAMERA.y, HOME_CAMERA.z);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  // Wheel zoom would hijack page scrolling; pinch / ctrl+wheel is handled below.
  controls.enableZoom = false;
  controls.rotateSpeed = 0.55;
  controls.minPolarAngle = 0.25;
  controls.maxPolarAngle = Math.PI - 0.25;
  controls.autoRotate = !reducedMotion;
  controls.autoRotateSpeed = 0.35;
  // OrbitControls claims every touch on the canvas, which would trap a phone
  // user's scroll inside the map. Hand vertical swipes back to the page;
  // sideways swipes still orbit.
  canvas.style.touchAction = "pan-y";

  const world = new THREE.Group();
  scene.add(world);

  const sphere = new THREE.SphereGeometry(1, 24, 16);
  const glow = glowTexture(THREE);

  graph.nodes.forEach((node) => {
    const color = new THREE.Color(COLORS[node.kind]);
    const mesh = new THREE.Mesh(sphere, new THREE.MeshBasicMaterial({ color, transparent: true }));
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glow,
        color,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    const holder = new THREE.Group();
    holder.add(mesh, halo);
    world.add(holder);

    const labelElement = document.createElement("span");
    labelElement.className = `constellation-label is-${node.kind}`;
    labelElement.textContent = node.label;
    labelLayer.append(labelElement);

    Object.assign(node, {
      holder,
      mesh,
      halo,
      labelElement,
      home: new THREE.Vector3(node.x, node.y, node.z),
      size: SIZES[node.kind],
      currentScale: SIZES[node.kind],
      currentEmphasis: 1,
    });
  });

  const edgePositions = new Float32Array(graph.edges.length * 6);
  const edgeColors = new Float32Array(graph.edges.length * 6);
  const edgeGeometry = new THREE.BufferGeometry();
  edgeGeometry.setAttribute("position", new THREE.BufferAttribute(edgePositions, 3));
  edgeGeometry.setAttribute("color", new THREE.BufferAttribute(edgeColors, 3));
  world.add(
    new THREE.LineSegments(
      edgeGeometry,
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    )
  );

  // ---------- state ----------
  let hovered = null;
  let previewed = null;
  let pinned = null;
  let area = null;
  let query = "";
  let running = false;
  let visible = false;
  let frame = 0;
  let introStart = reducedMotion ? -Infinity : null;
  // Where the camera is heading. Any field left out keeps its current value,
  // so a zoom only changes the radius and a fly-to changes everything.
  let cameraGoal = null;
  let lastFrameTime = null;
  let pointerInside = false;
  let stylesDirty = true;
  let width = 0;
  let height = 0;
  const pointer = { x: 0, y: 0 };
  const projected = new THREE.Vector3();
  const scratchColor = new THREE.Color();
  const dimEdge = new THREE.Color(0x2c2927);

  const focusNode = () => pinned ?? previewed ?? hovered;

  // 1 = fully lit, low = pushed into the background.
  const emphasisOf = (node) => {
    const focus = focusNode();
    if (focus) {
      if (node === focus) return 1;
      if (focus.neighbors.has(node)) return 0.9;
      // A focused skill keeps its own area legible.
      if (focus.kind === "skill" && node.area === focus.area) return 0.35;
      return 0.08;
    }
    if (query) return node.label.toLowerCase().includes(query) ? 1 : 0.1;
    if (area) {
      if (node === area || node.area === area) return 1;
      if ([...area.neighbors].some((skill) => skill.neighbors.has(node))) return 0.75;
      return 0.1;
    }
    return node.kind === "skill" ? 0.65 : 0.9;
  };

  const labelRank = (node, emphasis) => {
    const focus = focusNode();
    if (node === focus) return LABEL_PRIORITY.focus;
    if (focus?.neighbors.has(node)) return LABEL_PRIORITY.neighbor;
    if (emphasis < 0.5) return null;
    if (node.kind === "skill") {
      const inArea = area && node.area === area;
      const matches = query && emphasis === 1;
      return inArea || matches ? LABEL_PRIORITY.neighbor : null;
    }
    return LABEL_PRIORITY[node.kind];
  };

  const applyStyles = () => {
    stylesDirty = false;
    const focus = focusNode();
    graph.nodes.forEach((node) => {
      node.emphasis = emphasisOf(node);
      node.rank = labelRank(node, node.emphasis);
      node.targetScale = node.size * (node === focus ? 1.6 : node === hovered ? 1.35 : 1);
      node.labelElement.classList.toggle("is-focus", node === focus);
    });

    graph.edges.forEach(([a, b], index) => {
      const lit = focus
        ? a === focus || b === focus
        : query
          ? a.emphasis === 1 && b.emphasis === 1
          : area
            ? a.emphasis === 1 && b.emphasis >= 0.75
            : false;
      const quiet = focus || query || area;
      [a, b].forEach((node, end) => {
        const color = lit
          ? scratchColor.set(COLORS[node.kind])
          : scratchColor.copy(dimEdge).multiplyScalar(quiet ? 0.45 : 1);
        edgeColors.set([color.r, color.g, color.b], index * 6 + end * 3);
      });
    });
    edgeGeometry.attributes.color.needsUpdate = true;
    container.classList.toggle("has-focus", Boolean(focus));
  };

  const markDirty = () => {
    stylesDirty = true;
    start();
  };

  const resize = () => {
    const rect = container.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (!cameraTouched) camera.position.copy(homePosition());
    graph.nodes.forEach((node) => {
      node.labelSize = null;
    });
    start();
  };

  const nearestNode = () => {
    if (!pointerInside) return null;
    let best = null;
    let bestScore = Infinity;
    graph.nodes.forEach((node) => {
      if (!node.screen || node.screen.behind) return;
      const distance = Math.hypot(node.screen.x - pointer.x, node.screen.y - pointer.y);
      // Big nodes and lit nodes are easier to grab than dim ones.
      const reach = HOVER_RADIUS + node.screen.radius;
      if (distance > reach) return;
      const score = distance / reach + (node.emphasis < 0.3 ? 0.6 : 0);
      if (score < bestScore) {
        best = node;
        bestScore = score;
      }
    });
    return best;
  };

  // ---------- camera moves ----------
  const orbit = new THREE.Spherical();
  const offset = new THREE.Vector3();

  const currentOrbit = () => orbit.setFromVector3(offset.copy(camera.position).sub(controls.target));

  const setGoal = (goal) => {
    cameraTouched = true;
    controls.autoRotate = false;
    cameraGoal = { ...cameraGoal, ...goal };
    if (reducedMotion) {
      stepCamera(1);
      cameraGoal = null;
    }
    start();
  };

  const goalFor = (target, distance) => {
    // Look at the target from outside the map, slightly above it.
    const outward = target.clone().setY(0);
    if (outward.lengthSq() < 0.01) outward.set(0, 0, 1);
    outward.normalize();
    const position = target
      .clone()
      .add(outward.multiplyScalar(distance))
      .add(new THREE.Vector3(0, distance * 0.42, 0));
    const spherical = new THREE.Spherical().setFromVector3(position.sub(target));
    return { target: target.clone(), radius: spherical.radius, phi: spherical.phi, theta: spherical.theta };
  };

  const flyTo = (target, distance) => setGoal(goalFor(target, distance));

  const flyHome = () => {
    const home = new THREE.Spherical().setFromVector3(homePosition());
    setGoal({ target: new THREE.Vector3(0, 0, 0), radius: home.radius, phi: home.phi, theta: home.theta });
  };

  const dolly = (factor) => {
    // Repeated clicks (or a stream of pinch events) stack on the pending
    // goal instead of the current distance, so they add up smoothly.
    const base = cameraGoal?.radius ?? currentOrbit().radius;
    setGoal({ radius: Math.min(MAX_DISTANCE, Math.max(MIN_DISTANCE, base * factor)) });
  };

  // Moves the camera `amount` (0..1) of the way to its goal, in orbit space so
  // fly-tos swing around the map instead of cutting through it.
  const stepCamera = (amount) => {
    if (!cameraGoal) return false;
    currentOrbit();

    if (cameraGoal.target) controls.target.lerp(cameraGoal.target, amount);
    const radius = cameraGoal.radius ?? orbit.radius;
    const phi = cameraGoal.phi ?? orbit.phi;
    let thetaDelta = (cameraGoal.theta ?? orbit.theta) - orbit.theta;
    thetaDelta = Math.atan2(Math.sin(thetaDelta), Math.cos(thetaDelta));

    orbit.radius += (radius - orbit.radius) * amount;
    orbit.phi += (phi - orbit.phi) * amount;
    orbit.theta += thetaDelta * amount;
    camera.position.copy(controls.target).add(offset.setFromSpherical(orbit));

    const settled =
      Math.abs(radius - orbit.radius) < 0.005 &&
      Math.abs(phi - orbit.phi) < 0.0005 &&
      Math.abs(thetaDelta) * (1 - amount) < 0.0005 &&
      (!cameraGoal.target || controls.target.distanceTo(cameraGoal.target) < 0.005);
    if (settled) cameraGoal = null;
    return true;
  };

  // ---------- frame ----------
  const placeLabels = () => {
    const placed = [];
    const candidates = graph.nodes
      .filter((node) => node.rank !== null && node.screen && !node.screen.behind)
      .sort((a, b) => a.rank - b.rank || a.screen.depth - b.screen.depth);
    const shown = new Set();

    candidates.forEach((node) => {
      if (!node.labelSize) {
        node.labelSize = { w: node.labelElement.offsetWidth || 80, h: node.labelElement.offsetHeight || 18 };
      }
      const box = {
        left: node.screen.x - node.labelSize.w / 2 - 3,
        right: node.screen.x + node.labelSize.w / 2 + 3,
        top: node.screen.y - node.screen.radius - node.labelSize.h - 6,
        bottom: node.screen.y - node.screen.radius - 2,
      };
      // Higher-priority labels win; anything that would overlap waits its
      // turn. Only the focused node's label is guaranteed a spot; its
      // neighbours are all listed in the side panel anyway.
      const overlaps = node.rank > LABEL_PRIORITY.focus &&
        placed.some((other) =>
          box.left < other.right && box.right > other.left && box.top < other.bottom && box.bottom > other.top
        );
      if (overlaps) return;
      placed.push(box);
      shown.add(node);
      // Keep labels inside the frame; a node near the edge shifts its label in.
      const left = Math.min(Math.max(box.left + 3, 6), width - node.labelSize.w - 6);
      const top = Math.min(Math.max(box.top, 6), height - node.labelSize.h - 6);
      node.labelElement.style.transform = `translate3d(${left}px, ${top}px, 0)`;
    });

    graph.nodes.forEach((node) => {
      node.labelElement.classList.toggle("is-visible", shown.has(node));
    });
  };

  const render = (time) => {
    frame = 0;
    if (!running || !visible) return;
    if (introStart === null) introStart = time;
    const intro = easeOut(Math.min(1, (time - introStart) / INTRO_MS));
    let animating = intro < 1;

    const dt = Math.min(0.05, lastFrameTime === null ? 1 / 60 : (time - lastFrameTime) / 1000);
    lastFrameTime = time;
    if (stepCamera(1 - Math.exp(-CAMERA_EASE * dt))) animating = true;

    const cameraMoving = controls.update();
    if (stylesDirty) applyStyles();

    graph.nodes.forEach((node) => {
      node.holder.position.copy(node.home).multiplyScalar(intro);
      node.currentScale += (node.targetScale - node.currentScale) * 0.25;
      node.currentEmphasis += (node.emphasis - node.currentEmphasis) * 0.2;
      if (Math.abs(node.targetScale - node.currentScale) > 0.002) animating = true;
      if (Math.abs(node.emphasis - node.currentEmphasis) > 0.01) animating = true;
      node.mesh.scale.setScalar(node.currentScale);
      node.mesh.material.opacity = Math.max(0.12, node.currentEmphasis);
      node.halo.scale.setScalar(node.currentScale * 6.5);
      node.halo.material.opacity = (node.kind === "skill" ? 0.4 : 0.6) * node.currentEmphasis;
    });

    graph.edges.forEach(([a, b], index) => {
      const pa = a.holder.position;
      const pb = b.holder.position;
      edgePositions.set([pa.x, pa.y, pa.z, pb.x, pb.y, pb.z], index * 6);
    });
    edgeGeometry.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);

    const pixelsPerUnit = height / (2 * Math.tan((camera.fov * Math.PI) / 360));
    graph.nodes.forEach((node) => {
      node.holder.getWorldPosition(projected);
      const depth = projected.distanceTo(camera.position);
      projected.project(camera);
      node.screen = {
        x: (projected.x * 0.5 + 0.5) * width,
        y: (-projected.y * 0.5 + 0.5) * height,
        behind: projected.z > 1,
        depth,
        radius: (node.currentScale * pixelsPerUnit) / depth,
      };
    });
    placeLabels();

    const next = nearestNode();
    if (next !== hovered) {
      hovered = next;
      canvas.style.cursor = hovered ? "pointer" : "grab";
      onHover?.(hovered);
      applyStyles();
      animating = true;
    }

    if ((animating || cameraMoving || controls.autoRotate || pointerInside) && running && visible) {
      frame = window.requestAnimationFrame(render);
    }
  };

  function start() {
    if (!frame && running && visible) {
      // The loop was asleep: measure the first frame from now, not from
      // whenever it last ran.
      lastFrameTime = null;
      frame = window.requestAnimationFrame(render);
    }
  }

  // ---------- input ----------
  canvas.addEventListener("pointerenter", () => {
    pointerInside = true;
    // Holding still while someone aims is what makes small targets clickable.
    controls.autoRotate = false;
    start();
  });
  canvas.addEventListener("pointermove", (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
    pointerInside = true;
    start();
  });
  canvas.addEventListener("pointerleave", () => {
    pointerInside = false;
    start();
  });

  canvas.addEventListener(
    "wheel",
    (event) => {
      // Trackpad pinch arrives as ctrl+wheel; plain scrolling keeps scrolling the page.
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      dolly(Math.exp(event.deltaY * 0.012));
    },
    { passive: false }
  );

  let downAt = null;
  canvas.addEventListener("pointerdown", (event) => {
    downAt = { x: event.clientX, y: event.clientY };
    // Grabbing the map takes over from any move in progress.
    cameraGoal = null;
    cameraTouched = true;
    controls.autoRotate = false;
  });
  canvas.addEventListener("pointerup", (event) => {
    if (!downAt) return;
    const moved = Math.hypot(event.clientX - downAt.x, event.clientY - downAt.y);
    downAt = null;
    if (moved > 6) return;

    if (event.pointerType !== "mouse") {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointerInside = true;
      hovered = nearestNode();
    }

    api.pick(hovered?.id ?? null, { fly: hovered?.kind === "category" });
  });

  new ResizeObserver(resize).observe(container);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    start();
  }).observe(container);

  const api = {
    setRunning(value) {
      running = value;
      if (value) resize();
      start();
    },
    filter(value) {
      query = value.trim().toLowerCase();
      markDirty();
    },
    // Hover preview from the side panel: lights the node without moving the camera.
    preview(id) {
      previewed = id ? graph.byId.get(id) ?? null : null;
      markDirty();
    },
    pick(id, { fly = true } = {}) {
      const node = id ? graph.byId.get(id) ?? null : null;
      pinned = node;
      if (node?.kind === "category") area = node;
      else if (node) area = node.area ?? area;
      if (node && fly) {
        flyTo(node.home, node.kind === "category" ? 9 : node.kind === "skill" ? 8 : 9);
      }
      markDirty();
      onPick?.(pinned);
    },
    focusArea(id) {
      const node = id ? graph.byId.get(id) ?? null : null;
      area = node;
      pinned = null;
      if (node) flyTo(node.home, 9);
      else flyHome();
      markDirty();
      onPick?.(null);
    },
    reset() {
      pinned = null;
      previewed = null;
      area = null;
      query = "";
      flyHome();
      markDirty();
      onPick?.(null);
    },
    zoomIn: () => dolly(0.72),
    zoomOut: () => dolly(1 / 0.72),
  };

  resize();
  return api;
};
