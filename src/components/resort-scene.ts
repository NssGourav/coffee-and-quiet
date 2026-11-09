import * as THREE from "three";

// A small, self-contained scene: no downloaded models, textures or external APIs.
export function createResortScene(
  canvas: HTMLCanvasElement,
  onUnavailable: () => void,
) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#b8cdb6");
  scene.fog = new THREE.Fog("#b8cdb6", 27, 62);
  const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 100);
  const target = new THREE.Vector3(0, 0.6, -1.2);
  scene.add(new THREE.HemisphereLight(0xfff4da, 0x3d6351, 2.5));
  const sun = new THREE.DirectionalLight(0xffe5b7, 3.2);
  sun.position.set(-12, 20, 8);
  scene.add(sun);

  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const material = (color: string) => {
    const result = new THREE.MeshStandardMaterial({
      color,
      roughness: 1,
      flatShading: true,
    });
    materials.add(result);
    return result;
  };
  function mesh(
    geometry: THREE.BufferGeometry,
    surface: THREE.Material,
    parent: THREE.Object3D = scene,
  ) {
    geometries.add(geometry);
    materials.add(surface);
    const object = new THREE.Mesh(geometry, surface);
    parent.add(object);
    return object;
  }
  const hillHeight = (x: number, z: number) =>
    0.65 * Math.sin(x * 0.25 + z * 0.12) +
    0.55 * Math.cos(z * 0.35) +
    4.8 * Math.exp(-((x + 9) ** 2 / 70 + (z + 12) ** 2 / 35)) +
    5.6 * Math.exp(-((x - 11) ** 2 / 70 + (z + 16) ** 2 / 48));

  const terrain = new THREE.PlaneGeometry(70, 70, 90, 90);
  terrain.rotateX(-Math.PI / 2);
  const positions = terrain.attributes.position;
  const colors = [];
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i),
      z = positions.getZ(i);
    positions.setY(i, hillHeight(x, z));
    const color = new THREE.Color("#4e7957").lerp(
      new THREE.Color("#97a76d"),
      (Math.sin(x * 0.46 + z * 0.32) + 1) * 0.22,
    );
    colors.push(color.r, color.g, color.b);
  }
  terrain.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  terrain.computeVertexNormals();
  mesh(
    terrain,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 1,
      flatShading: true,
    }),
  );

  // Curved footpath leading up to the little estate house.
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(7, 0, 19),
    new THREE.Vector3(6, 0, 10),
    new THREE.Vector3(-1, 0, 7),
    new THREE.Vector3(-2, 0, 4),
    new THREE.Vector3(0, 0, 1.7),
  ]);
  const ribbon = [],
    indices = [];
  for (let i = 0; i <= 90; i++) {
    const t = i / 90,
      p = path.getPoint(t),
      tangent = path.getTangent(t);
    const width = 0.32 + (1 - t) * 0.18;
    for (const side of [-1, 1]) {
      const x = p.x + tangent.z * width * side,
        z = p.z - tangent.x * width * side;
      ribbon.push(x, hillHeight(x, z) + 0.035, z);
    }
    if (i < 90) {
      const n = i * 2;
      indices.push(n, n + 2, n + 1, n + 1, n + 2, n + 3);
    }
  }
  const pathGeometry = new THREE.BufferGeometry();
  pathGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(ribbon, 3),
  );
  pathGeometry.setIndex(indices);
  pathGeometry.computeVertexNormals();
  const pathMaterial = material("#c8b58b");
  pathMaterial.side = THREE.DoubleSide;
  mesh(pathGeometry, pathMaterial);

  const lodge = new THREE.Group();
  lodge.position.set(0, hillHeight(0, 0) + 0.1, 0);
  scene.add(lodge);
  const cream = material("#e7d8ad"),
    wood = material("#665744"),
    roof = material("#a36e50"),
    glass = material("#e5bf75");
  mesh(new THREE.BoxGeometry(4.5, 0.35, 3.8), wood, lodge).position.y = 0;
  mesh(new THREE.BoxGeometry(3.7, 1.75, 2.8), cream, lodge).position.y = 0.98;
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-2.2, 0);
  roofShape.lineTo(0, 1.45);
  roofShape.lineTo(2.2, 0);
  roofShape.closePath();
  const roofMesh = mesh(
    new THREE.ExtrudeGeometry(roofShape, { depth: 3.35, bevelEnabled: false }),
    roof,
    lodge,
  );
  roofMesh.position.set(0, 1.8, -1.675);
  mesh(new THREE.BoxGeometry(0.65, 1.3, 0.06), wood, lodge).position.set(
    0,
    0.8,
    1.43,
  );
  for (const x of [-1.15, 1.15]) {
    mesh(new THREE.BoxGeometry(0.8, 0.8, 0.07), wood, lodge).position.set(
      x,
      1.1,
      1.44,
    );
    mesh(new THREE.BoxGeometry(0.63, 0.63, 0.08), glass, lodge).position.set(
      x,
      1.1,
      1.48,
    );
    mesh(new THREE.BoxGeometry(0.045, 0.66, 0.09), wood, lodge).position.set(
      x,
      1.1,
      1.5,
    );
  }
  mesh(new THREE.BoxGeometry(0.45, 1.5, 0.55), cream, lodge).position.set(
    1.2,
    2.5,
    -0.65,
  );

  const trunk = material("#655f44");
  const leaves = [
    material("#28563f"),
    material("#3a6847"),
    material("#62814c"),
  ];
  const trunkGeometry = new THREE.CylinderGeometry(0.07, 0.12, 1.4, 5);
  const crownGeometry = new THREE.IcosahedronGeometry(1, 1);
  // Deterministic placement keeps the scene stable across visits and resizes.
  for (let i = 0; i < 75; i++) {
    const x = Math.sin(i * 127.1) * 17,
      z = Math.cos(i * 311.7) * 17 - 5;
    if ((Math.abs(x) < 4.8 && z > -3.5 && z < 6) || (z > 4 && x > -4 && x < 9))
      continue;
    const tree = new THREE.Group();
    const scale = 0.7 + (Math.sin(i * 43) + 1) * 0.45;
    tree.position.set(x, hillHeight(x, z), z);
    tree.scale.setScalar(scale);
    scene.add(tree);
    mesh(trunkGeometry, trunk, tree).position.y = 0.65;
    const crown = mesh(crownGeometry, leaves[i % leaves.length], tree);
    crown.position.y = 1.65;
    crown.scale.set(0.8, 1.3, 0.8);
    crown.rotation.y = i;
  }
  // Coffee shrubs in planted rows on the left hillside.
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 12; col++) {
      const x = -12 + col * 0.65,
        z = 1 + row * 1.1 + Math.sin(col * 0.3) * 0.6;
      const shrub = mesh(crownGeometry, leaves[(row + col) % 3]);
      shrub.position.set(x, hillHeight(x, z) + 0.28, z);
      shrub.scale.set(0.38, 0.45, 0.38);
    }
  }

  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  let paused = false,
    visible = true,
    lost = false,
    disposed = false;
  let pointerX = 0,
    pointerY = 0,
    viewX = 0,
    viewY = 0,
    lastTime = 0,
    elapsed = 0;
  function render(time: number) {
    if (disposed || lost) return;
    const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
    lastTime = time;
    if (!paused && !motion.matches) elapsed += dt;
    viewX += (pointerX - viewX) * 0.035;
    viewY += (pointerY - viewY) * 0.035;
    camera.position.set(
      15 + Math.sin(elapsed * 0.1) * 0.75 + viewX,
      12 + viewY * 0.5,
      21,
    );
    camera.lookAt(target);
    renderer.render(scene, camera);
  }
  function syncMotion() {
    lastTime = 0;
    renderer.setAnimationLoop(
      !paused && !motion.matches && visible && !document.hidden && !lost
        ? render
        : null,
    );
    if (visible && !document.hidden && !lost) render(0);
  }
  function resize() {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Keep the lodge in view in the wide, compact mobile landscape.
    camera.fov = camera.aspect > 1.5 ? 43 : 39;
    camera.updateProjectionMatrix();
    render(0);
  }
  function move(event: PointerEvent) {
    if (motion.matches || paused || event.pointerType === "touch") return;
    const rect = canvas.getBoundingClientRect();
    pointerX = ((event.clientX - rect.left) / rect.width - 0.5) * 1.6;
    pointerY = ((event.clientY - rect.top) / rect.height - 0.5) * 1.1;
  }
  function leave() {
    pointerX = 0;
    pointerY = 0;
  }
  function loseContext(event: Event) {
    event.preventDefault();
    lost = true;
    renderer.setAnimationLoop(null);
    onUnavailable();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    syncMotion();
  });
  intersection.observe(canvas);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerleave", leave);
  canvas.addEventListener("webglcontextlost", loseContext);
  motion.addEventListener("change", syncMotion);
  document.addEventListener("visibilitychange", syncMotion);
  resize();
  syncMotion();
  return {
    setPaused(value: boolean) {
      paused = value;
      syncMotion();
    },
    dispose() {
      disposed = true;
      renderer.setAnimationLoop(null);
      observer.disconnect();
      intersection.disconnect();
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerleave", leave);
      canvas.removeEventListener("webglcontextlost", loseContext);
      motion.removeEventListener("change", syncMotion);
      document.removeEventListener("visibilitychange", syncMotion);
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((surface) => surface.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
