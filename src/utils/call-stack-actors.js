// The cast of "The Flea and the Ant", built from primitives at runtime.
//
// Every character is a small articulated rig: a group of low-poly parts plus an
// update(t) that animates the parts that should move — wings, legs, tails, the
// pages of a book. Nothing here is downloaded, so the whole cast costs only the
// code that describes it.
//
// createActorKit(THREE) returns { build(name), dispose() }. build() returns
// { group, update } or null for an unknown name.

const PALETTE = {
  ink: "#211f22",
  charcoal: "#2f2b2e",
  grey: "#9aa0a8",
  greyDark: "#6f757c",
  pink: "#f0a5b1",
  pinkDeep: "#d97f8e",
  tan: "#c89b6a",
  brown: "#6d4a2d",
  brownDark: "#4a3120",
  green: "#6fbf73",
  greenDeep: "#4d9455",
  gold: "#d9b34a",
  yellow: "#f4d03f",
  orange: "#e08a3c",
  white: "#f4f1ea",
  cream: "#efe6d6",
  red: "#b8503c",
};

export const createActorKit = (THREE) => {
  const geometries = [];
  const materials = new Map();

  const track = (geometry) => {
    geometries.push(geometry);
    return geometry;
  };

  const material = (key, options = {}) => {
    const existing = materials.get(key);
    if (existing) return existing;
    const created = new THREE.MeshStandardMaterial({
      color: new THREE.Color(PALETTE[key] || key),
      roughness: options.roughness ?? 0.55,
      metalness: options.metalness ?? 0.05,
      ...(options.emissive ? { emissive: new THREE.Color(options.emissive), emissiveIntensity: options.emissiveIntensity ?? 0.3 } : {}),
    });
    materials.set(key, created);
    return created;
  };

  // Shared primitives. Every part scales one of these rather than building its
  // own geometry, which keeps the buffer count low across the whole cast.
  const unit = {
    sphere: track(new THREE.SphereGeometry(1, 16, 12)),
    hemisphere: track(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)),
    cone: track(new THREE.ConeGeometry(1, 1, 14)),
    cylinder: track(new THREE.CylinderGeometry(1, 1, 1, 12)),
    box: track(new THREE.BoxGeometry(1, 1, 1)),
    torus: track(new THREE.TorusGeometry(1, 0.32, 8, 20)),
    circle: track(new THREE.CircleGeometry(1, 16)),
    tetra: track(new THREE.TetrahedronGeometry(1)),
  };

  const part = (shape, key, { pos, scale, rot, options } = {}) => {
    const mesh = new THREE.Mesh(unit[shape], material(key, options));
    if (pos) mesh.position.set(pos[0], pos[1], pos[2]);
    if (scale) {
      if (typeof scale === "number") mesh.scale.setScalar(scale);
      else mesh.scale.set(scale[0], scale[1], scale[2]);
    }
    if (rot) mesh.rotation.set(rot[0], rot[1], rot[2]);
    return mesh;
  };

  // A limb hung from a pivot, so rotating it swings from the shoulder or hip
  // rather than around the limb's own centre.
  const limb = (key, { pos, radius = 0.016, length = 0.2, rot = [0, 0, 0] }) => {
    const pivot = new THREE.Group();
    pivot.position.set(pos[0], pos[1], pos[2]);
    pivot.rotation.set(rot[0], rot[1], rot[2]);
    const bone = part("cylinder", key, {
      pos: [0, -length / 2, 0],
      scale: [radius, length, radius],
    });
    pivot.add(bone);
    return pivot;
  };

  const builders = {
    // Our Story: the book the whole tale sits in.
    story: () => {
      const group = new THREE.Group();
      group.add(part("box", "red", { pos: [0, 0, 0], scale: [0.1, 0.34, 0.4] }));
      const left = part("box", "cream", { pos: [-0.19, 0.02, 0], scale: [0.36, 0.03, 0.38] });
      const right = part("box", "cream", { pos: [0.19, 0.02, 0], scale: [0.36, 0.03, 0.38] });
      left.rotation.z = 0.2;
      right.rotation.z = -0.2;
      group.add(left, right);
      return {
        group,
        update: (t) => {
          left.rotation.z = 0.2 + Math.sin(t * 1.9) * 0.07;
          right.rotation.z = -0.2 - Math.sin(t * 1.9) * 0.07;
        },
      };
    },

    // The ant, who falls into the stream.
    ant: () => {
      const group = new THREE.Group();
      group.add(part("sphere", "ink", { pos: [-0.19, 0, 0], scale: [0.15, 0.12, 0.12] }));
      group.add(part("sphere", "ink", { pos: [-0.02, 0.01, 0], scale: [0.09, 0.09, 0.09] }));
      group.add(part("sphere", "ink", { pos: [0.15, 0.02, 0], scale: [0.1, 0.09, 0.09] }));
      const legs = [];
      [-0.1, 0, 0.09].forEach((x, index) => {
        [-1, 1].forEach((side) => {
          const leg = limb("ink", {
            pos: [x, -0.02, side * 0.07],
            radius: 0.011,
            length: 0.17,
            rot: [side * 0.6, 0, 0],
          });
          legs.push({ leg, phase: index * 1.1 + (side > 0 ? 0 : Math.PI), side });
          group.add(leg);
        });
      });
      const antennae = [-1, 1].map((side) => {
        const stalk = limb("ink", {
          pos: [0.2, 0.07, side * 0.03],
          radius: 0.008,
          length: 0.13,
          rot: [0, 0, side * 0.5 - Math.PI * 0.75],
        });
        group.add(stalk);
        return stalk;
      });
      return {
        group,
        update: (t) => {
          legs.forEach(({ leg, phase, side }) => {
            leg.rotation.x = side * 0.6 + Math.sin(t * 9 + phase) * 0.35;
          });
          antennae.forEach((stalk, index) => {
            stalk.rotation.x = Math.sin(t * 4 + index) * 0.25;
          });
        },
      };
    },

    // The flea, who does all the asking.
    flea: () => {
      const group = new THREE.Group();
      group.add(part("sphere", "brownDark", { pos: [0, 0, 0], scale: [0.12, 0.1, 0.1] }));
      group.add(part("sphere", "brownDark", { pos: [0.11, 0.03, 0], scale: [0.06, 0.06, 0.06] }));
      const hind = [-1, 1].map((side) => {
        const leg = limb("brownDark", {
          pos: [-0.06, -0.03, side * 0.06],
          radius: 0.014,
          length: 0.16,
          rot: [0, 0, side * 0.1 + 0.7],
        });
        group.add(leg);
        return leg;
      });
      return {
        group,
        // The legs coil and kick in time with the hop the motion applies.
        update: (t) => {
          const kick = Math.abs(Math.sin(t * 3.4));
          hind.forEach((leg, index) => {
            leg.rotation.z = (index === 0 ? 1 : -1) * 0.1 + 0.7 - kick * 0.75;
          });
        },
      };
    },

    // The rope the flea twists from the bristle.
    rope: () => {
      const group = new THREE.Group();
      const points = [];
      for (let i = 0; i <= 40; i += 1) {
        const angle = (i / 40) * Math.PI * 6;
        points.push(new THREE.Vector3(Math.cos(angle) * 0.075, -0.22 + (i / 40) * 0.44, Math.sin(angle) * 0.075));
      }
      const curve = new THREE.CatmullRomCurve3(points);
      const tube = new THREE.Mesh(track(new THREE.TubeGeometry(curve, 60, 0.028, 7, false)), material("tan"));
      group.add(tube);
      return {
        group,
        update: (t) => {
          group.rotation.y = t * 1.6;
          tube.scale.y = 1 + Math.sin(t * 2.4) * 0.06;
        },
      };
    },

    // The pig, who wants an acorn before parting with a bristle.
    pig: () => {
      const group = new THREE.Group();
      group.add(part("sphere", "pink", { pos: [0, 0, 0], scale: [0.19, 0.15, 0.15] }));
      const head = part("sphere", "pink", { pos: [0.2, 0.04, 0], scale: [0.11, 0.1, 0.1] });
      group.add(head);
      head.add(part("cylinder", "pinkDeep", { pos: [0.09, -0.02, 0], scale: [0.05, 0.04, 0.05], rot: [0, 0, Math.PI / 2] }));
      [-1, 1].forEach((side) => {
        head.add(part("cone", "pinkDeep", { pos: [-0.01, 0.09, side * 0.05], scale: [0.04, 0.07, 0.04] }));
      });
      const legs = [];
      [-0.1, 0.09].forEach((x, row) => {
        [-1, 1].forEach((side) => {
          const leg = limb("pink", { pos: [x, -0.11, side * 0.08], radius: 0.028, length: 0.11 });
          legs.push({ leg, phase: row * Math.PI + (side > 0 ? 0 : Math.PI / 2) });
          group.add(leg);
        });
      });
      const tail = part("torus", "pinkDeep", { pos: [-0.2, 0.06, 0], scale: [0.04, 0.04, 0.04], rot: [0, Math.PI / 2, 0] });
      group.add(tail);
      return {
        group,
        update: (t) => {
          legs.forEach(({ leg, phase }) => {
            leg.rotation.x = Math.sin(t * 4.4 + phase) * 0.3;
          });
          tail.rotation.z = Math.sin(t * 6) * 0.6;
          head.rotation.z = Math.sin(t * 2.2) * 0.08;
        },
      };
    },

    // The acorn the oak gives up.
    acorn: () => {
      const group = new THREE.Group();
      const nut = part("sphere", "tan", { pos: [0, -0.02, 0], scale: [0.1, 0.13, 0.1] });
      const cap = part("hemisphere", "brown", { pos: [0, 0.06, 0], scale: [0.11, 0.07, 0.11] });
      const stem = part("cylinder", "brownDark", { pos: [0, 0.15, 0], scale: [0.014, 0.06, 0.014] });
      group.add(nut, cap, stem);
      return {
        group,
        update: (t) => {
          group.rotation.y = t * 1.9;
          // Squashes on the beat it would land on.
          const bounce = Math.abs(Math.sin(t * 2.5));
          group.scale.set(1 + (1 - bounce) * 0.06, 1 - (1 - bounce) * 0.08, 1 + (1 - bounce) * 0.06);
        },
      };
    },

    // The crow, who must leave the oak.
    crow: () => {
      const group = new THREE.Group();
      group.add(part("sphere", "charcoal", { pos: [0, 0, 0], scale: [0.17, 0.12, 0.12] }));
      const head = part("sphere", "charcoal", { pos: [0.17, 0.07, 0], scale: [0.09, 0.09, 0.09] });
      group.add(head);
      head.add(part("cone", "orange", { pos: [0.1, -0.01, 0], scale: [0.035, 0.11, 0.035], rot: [0, 0, -Math.PI / 2] }));
      group.add(part("box", "charcoal", { pos: [-0.24, 0.03, 0], scale: [0.16, 0.02, 0.1], rot: [0, 0, 0.25] }));
      const wings = [-1, 1].map((side) => {
        const pivot = new THREE.Group();
        pivot.position.set(0, 0.06, side * 0.07);
        const blade = part("box", "ink", { pos: [-0.02, 0, side * 0.14], scale: [0.2, 0.02, 0.28] });
        pivot.add(blade);
        group.add(pivot);
        return { pivot, side };
      });
      return {
        group,
        update: (t) => {
          wings.forEach(({ pivot, side }) => {
            pivot.rotation.x = side * Math.sin(t * 9) * 0.85;
          });
          head.rotation.y = Math.sin(t * 2.6) * 0.3;
        },
      };
    },

    // The chick the hen provides.
    chick: () => {
      const group = new THREE.Group();
      group.add(part("sphere", "yellow", { pos: [0, 0, 0], scale: [0.12, 0.11, 0.11] }));
      const head = part("sphere", "yellow", { pos: [0.03, 0.14, 0], scale: [0.085, 0.085, 0.085] });
      group.add(head);
      head.add(part("cone", "orange", { pos: [0.08, -0.01, 0], scale: [0.03, 0.07, 0.03], rot: [0, 0, -Math.PI / 2] }));
      const wings = [-1, 1].map((side) => {
        const wing = part("box", "yellow", { pos: [-0.02, 0.01, side * 0.11], scale: [0.12, 0.02, 0.09] });
        group.add(wing);
        return { wing, side };
      });
      const feet = [-1, 1].map((side) => {
        const foot = limb("orange", { pos: [0, -0.1, side * 0.045], radius: 0.012, length: 0.07 });
        group.add(foot);
        return foot;
      });
      return {
        group,
        update: (t) => {
          wings.forEach(({ wing, side }) => {
            wing.rotation.x = side * Math.sin(t * 11) * 0.5;
          });
          head.rotation.z = Math.sin(t * 3.2) * 0.16;
          feet.forEach((foot, index) => {
            foot.rotation.x = Math.sin(t * 3.4 + index * Math.PI) * 0.3;
          });
        },
      };
    },

    // The millet from the grain pit.
    millet: () => {
      const group = new THREE.Group();
      const stalks = [-1, 0, 1].map((offset, index) => {
        const stalk = new THREE.Group();
        stalk.position.set(offset * 0.06, -0.2, offset * 0.03);
        stalk.add(part("cylinder", "greenDeep", { pos: [0, 0.16, 0], scale: [0.011, 0.32, 0.011] }));
        stalk.add(part("sphere", "gold", { pos: [0, 0.36, 0], scale: [0.035, 0.075, 0.035] }));
        group.add(stalk);
        return { stalk, phase: index * 0.9 };
      });
      return {
        group,
        update: (t) => {
          stalks.forEach(({ stalk, phase }) => {
            stalk.rotation.z = Math.sin(t * 1.7 + phase) * 0.16;
          });
        },
      };
    },

    // The mouse the pit wants gone.
    mouse: () => {
      const group = new THREE.Group();
      group.add(part("sphere", "grey", { pos: [0, 0, 0], scale: [0.16, 0.11, 0.11] }));
      const head = part("sphere", "grey", { pos: [0.16, 0.02, 0], scale: [0.09, 0.085, 0.085] });
      group.add(head);
      head.add(part("cone", "pinkDeep", { pos: [0.08, -0.01, 0], scale: [0.03, 0.06, 0.03], rot: [0, 0, -Math.PI / 2] }));
      [-1, 1].forEach((side) => {
        head.add(part("circle", "pink", { pos: [-0.01, 0.07, side * 0.06], scale: 0.055, rot: [0, side * 0.9, 0] }));
      });
      const tail = limb("greyDark", {
        pos: [-0.16, 0.02, 0],
        radius: 0.009,
        length: 0.26,
        rot: [0, 0, -1.9],
      });
      group.add(tail);
      const legs = [];
      [-0.08, 0.08].forEach((x, row) => {
        [-1, 1].forEach((side) => {
          const leg = limb("grey", { pos: [x, -0.08, side * 0.06], radius: 0.018, length: 0.07 });
          legs.push({ leg, phase: row * Math.PI + (side > 0 ? 0 : Math.PI / 2) });
          group.add(leg);
        });
      });
      return {
        group,
        update: (t) => {
          legs.forEach(({ leg, phase }) => {
            leg.rotation.x = Math.sin(t * 13 + phase) * 0.5;
          });
          tail.rotation.y = Math.sin(t * 6) * 0.5;
          head.rotation.y = Math.sin(t * 4.4) * 0.22;
        },
      };
    },

    // The cat, who asks for milk.
    cat: () => {
      const group = new THREE.Group();
      group.add(part("sphere", "greyDark", { pos: [0, 0, 0], scale: [0.19, 0.13, 0.13] }));
      const head = new THREE.Group();
      head.position.set(0.2, 0.06, 0);
      head.add(part("sphere", "greyDark", { pos: [0, 0, 0], scale: [0.11, 0.1, 0.1] }));
      [-1, 1].forEach((side) => {
        head.add(part("cone", "greyDark", { pos: [-0.01, 0.1, side * 0.055], scale: [0.04, 0.08, 0.04] }));
      });
      head.add(part("sphere", "pink", { pos: [0.1, -0.02, 0], scale: [0.025, 0.02, 0.03] }));
      group.add(head);
      const tail = limb("greyDark", {
        pos: [-0.19, 0.06, 0],
        radius: 0.02,
        length: 0.24,
        rot: [0, 0, -2.5],
      });
      group.add(tail);
      const legs = [];
      [-0.1, 0.1].forEach((x, row) => {
        [-1, 1].forEach((side) => {
          const leg = limb("greyDark", { pos: [x, -0.1, side * 0.07], radius: 0.024, length: 0.1 });
          legs.push({ leg, phase: row * Math.PI });
          group.add(leg);
        });
      });
      // The bowl it is lapping from.
      const bowl = part("cylinder", "white", { pos: [0.34, -0.14, 0], scale: [0.09, 0.03, 0.09] });
      group.add(bowl);
      return {
        group,
        update: (t) => {
          // Head dips to the bowl and back up again.
          const lap = (Math.sin(t * 2.6) + 1) / 2;
          head.position.y = 0.06 - lap * 0.1;
          head.position.x = 0.2 + lap * 0.05;
          head.rotation.z = -lap * 0.5;
          tail.rotation.x = Math.sin(t * 1.8) * 0.5;
          legs.forEach(({ leg, phase }) => {
            leg.rotation.x = Math.sin(t * 1.6 + phase) * 0.06;
          });
        },
      };
    },

    // The cow, who asks for grass.
    cow: () => {
      const group = new THREE.Group();
      group.add(part("sphere", "white", { pos: [0, 0, 0], scale: [0.24, 0.17, 0.16] }));
      [[-0.08, 0.08, 0.12], [0.1, -0.02, 0.13]].forEach(([x, y, z]) => {
        group.add(part("sphere", "charcoal", { pos: [x, y, z], scale: [0.07, 0.05, 0.02] }));
      });
      const head = new THREE.Group();
      head.position.set(0.26, 0.06, 0);
      head.add(part("sphere", "white", { pos: [0, 0, 0], scale: [0.12, 0.1, 0.1] }));
      head.add(part("sphere", "pink", { pos: [0.1, -0.03, 0], scale: [0.045, 0.04, 0.05] }));
      [-1, 1].forEach((side) => {
        head.add(part("cone", "cream", { pos: [-0.03, 0.1, side * 0.06], scale: [0.025, 0.06, 0.025], rot: [side * 0.5, 0, 0] }));
      });
      group.add(head);
      const legs = [];
      [-0.13, 0.12].forEach((x, row) => {
        [-1, 1].forEach((side) => {
          const leg = limb("white", { pos: [x, -0.13, side * 0.09], radius: 0.03, length: 0.15 });
          legs.push({ leg, phase: row * Math.PI });
          group.add(leg);
        });
      });
      const tail = limb("white", { pos: [-0.24, 0.1, 0], radius: 0.014, length: 0.22, rot: [0, 0, -0.2] });
      group.add(tail);
      return {
        group,
        update: (t) => {
          // Grazing: the head drops to the ground and chews.
          const graze = (Math.sin(t * 1.1) + 1) / 2;
          head.position.y = 0.06 - graze * 0.16;
          head.rotation.z = -graze * 0.7;
          tail.rotation.x = Math.sin(t * 2.2) * 0.45;
          legs.forEach(({ leg, phase }) => {
            leg.rotation.x = Math.sin(t * 1.3 + phase) * 0.05;
          });
        },
      };
    },

    // The grass the cow is given.
    grass: () => {
      const group = new THREE.Group();
      const blades = [];
      for (let i = 0; i < 6; i += 1) {
        const angle = (i / 6) * Math.PI * 2;
        const blade = new THREE.Group();
        blade.position.set(Math.cos(angle) * 0.05, -0.14, Math.sin(angle) * 0.05);
        blade.rotation.z = Math.cos(angle) * 0.35;
        blade.rotation.x = Math.sin(angle) * 0.35;
        blade.add(part("cone", i % 2 ? "green" : "greenDeep", { pos: [0, 0.13, 0], scale: [0.022, 0.28, 0.014] }));
        group.add(blade);
        blades.push({ blade, base: { z: blade.rotation.z, x: blade.rotation.x }, phase: i });
      }
      return {
        group,
        update: (t) => {
          blades.forEach(({ blade, base, phase }) => {
            blade.rotation.z = base.z + Math.sin(t * 2.1 + phase) * 0.12;
            blade.rotation.x = base.x + Math.cos(t * 1.8 + phase) * 0.1;
          });
        },
      };
    },

    // The milk the cow gives, as a falling drop.
    milk: () => {
      const group = new THREE.Group();
      const drop = new THREE.Group();
      drop.add(part("sphere", "white", { pos: [0, -0.04, 0], scale: [0.095, 0.09, 0.095] }));
      drop.add(part("cone", "white", { pos: [0, 0.09, 0], scale: [0.075, 0.16, 0.075] }));
      group.add(drop);
      return {
        group,
        update: (t) => {
          // A drop wobbling as it travels.
          const wobble = Math.sin(t * 7);
          drop.scale.set(1 + wobble * 0.08, 1 - wobble * 0.1, 1 + wobble * 0.08);
          group.rotation.z = Math.sin(t * 2.4) * 0.12;
        },
      };
    },

    // The bristle the pig finally hands over.
    bristle: () => {
      const group = new THREE.Group();
      const hairs = [];
      for (let i = 0; i < 4; i += 1) {
        const hair = new THREE.Group();
        hair.rotation.z = (i - 1.5) * 0.16;
        hair.add(part("cone", "tan", { pos: [0, 0.12, 0], scale: [0.011, 0.3, 0.011] }));
        group.add(hair);
        hairs.push({ hair, base: hair.rotation.z, phase: i });
      }
      return {
        group,
        update: (t) => {
          hairs.forEach(({ hair, base, phase }) => {
            hair.rotation.z = base + Math.sin(t * 4 + phase) * 0.05;
          });
        },
      };
    },
  };

  const clones = [];

  // Parts within one rig share a material so a fade applies evenly, but each
  // rig gets its own copies: otherwise fading the cat would fade the milk.
  const build = (name) => {
    const built = builders[name]?.();
    if (!built) return null;
    const swapped = new Map();
    built.group.traverse((node) => {
      if (!node.material) return;
      let clone = swapped.get(node.material);
      if (!clone) {
        clone = node.material.clone();
        swapped.set(node.material, clone);
        clones.push(clone);
      }
      node.material = clone;
    });
    return built;
  };

  return {
    build,
    dust: (name) => DUST[name] || DUST.story,
    shard: (shape) => unit[shape === "drop" ? "sphere" : "tetra"],
    colorOf: (key) => PALETTE[key] || key,
    dispose: () => {
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((entry) => entry.dispose());
      clones.forEach((entry) => entry.dispose());
      materials.clear();
      clones.length = 0;
    },
  };
};

// What each character kicks up when it takes over, and what each value scatters
// when it lands.
const DUST = {
  story: { color: "cream", shape: "shard" },
  ant: { color: "#7db7ff", shape: "drop" },
  flea: { color: "tan", shape: "shard" },
  rope: { color: "tan", shape: "shard" },
  pig: { color: "pink", shape: "shard" },
  acorn: { color: "green", shape: "shard" },
  crow: { color: "charcoal", shape: "shard" },
  chick: { color: "yellow", shape: "drop" },
  millet: { color: "gold", shape: "drop" },
  mouse: { color: "grey", shape: "shard" },
  cat: { color: "white", shape: "drop" },
  cow: { color: "green", shape: "shard" },
  grass: { color: "green", shape: "shard" },
  milk: { color: "white", shape: "drop" },
  bristle: { color: "tan", shape: "shard" },
};

// What each frame hands back when it returns, so the travelling value is the
// grass, the milk or the rope itself.
export const FRAME_VALUES = [
  "",
  "flea",
  "ant",
  "rope",
  "bristle",
  "acorn",
  "crow",
  "chick",
  "millet",
  "mouse",
  "milk",
  "grass",
];
