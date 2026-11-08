import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { effectivePresence, sites, type AssetView, type Site } from './model';

export interface SceneState {
  assets: AssetView[];
  floors: Record<Site, number>;
  selectedId: string | null;
  now: number;
}

export interface SceneColors {
  background: string;
  paper: string;
  primary: string;
  border: string;
  text: string;
  online: string;
  offline: string;
  lost: string;
  unknown: string;
}

export interface HoveredAsset {
  assetId: string;
  x: number;
  y: number;
}

export interface SpacesRenderer {
  update(state: SceneState): void;
  setColors(colors: SceneColors): void;
  reset(): void;
  dispose(): void;
}

const centers: Record<Site, number> = { OpenLife: -6.5, OpenMind: 6.5 };
const floorHeight = (floor: number) => (floor - 1) * 2;

export function cameraFitDistance(radius: number, aspect: number, verticalFovDegrees: number) {
  const verticalHalfAngle = (verticalFovDegrees * Math.PI) / 360;
  const horizontalHalfAngle = Math.atan(Math.tan(verticalHalfAngle) * aspect);
  return (radius * 1.1) / Math.sin(Math.min(verticalHalfAngle, horizontalHalfAngle));
}

/** All positions are schematic; a dense floor scales its instances rather than losing assets. */
export function deviceSlots(count: number): { x: number; z: number; scale: number }[] {
  if (count === 0) return [];
  const columns = Math.ceil(Math.sqrt((count * 6.6) / 4.6));
  const rows = Math.ceil(count / columns);
  const width = 6.6 / columns;
  const depth = 4.6 / rows;
  const scale = Math.min(0.85, width * 0.65, depth * 0.65);
  return Array.from({ length: count }, (_, index) => ({
    x: -3.3 + width * ((index % columns) + 0.5),
    z: -2.3 + depth * (Math.floor(index / columns) + 0.5),
    scale,
  }));
}

function disposeObjects(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse((object) => {
    if (object instanceof THREE.InstancedMesh) object.dispose();
    if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material])
        materials.add(material);
    } else if (object instanceof THREE.Sprite) {
      materials.add(object.material);
      if (object.material.map) textures.add(object.material.map);
    }
  });
  for (const texture of textures) texture.dispose();
  for (const material of materials) material.dispose();
  for (const geometry of geometries) geometry.dispose();
  root.clear();
}

export function createSpacesRenderer(
  canvas: HTMLCanvasElement,
  initialColors: SceneColors,
  callbacks: {
    onSelect(assetId: string): void;
    onHover(asset: HoveredAsset | null): void;
    onLost(): void;
    onReady(): void;
  },
): SpacesRenderer {
  let colors = initialColors;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(colors.background);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 300);
  camera.position.set(20, 20, 26);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = false;
  controls.minDistance = 7;
  controls.maxDistance = 100;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.minPolarAngle = Math.PI * 0.08;
  controls.target.set(0, 2.5, 0);
  controls.listenToKeyEvents(canvas);
  scene.add(new THREE.AmbientLight(0xffffff, 1.8));
  const sunlight = new THREE.DirectionalLight(0xffffff, 2.5);
  sunlight.position.set(8, 20, 10);
  scene.add(sunlight);
  const structure = new THREE.Group();
  const devices = new THREE.Group();
  scene.add(structure, devices);
  const grid = new THREE.GridHelper(36, 36, colors.border, colors.border);
  grid.position.y = -0.28;
  const gridMaterial = grid.material;
  if (!Array.isArray(gridMaterial)) {
    gridMaterial.transparent = true;
    gridMaterial.opacity = 0.35;
  }
  scene.add(grid);

  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(-2.5, 0.55, 1),
    new THREE.Vector3(0, 3.5, 1),
    new THREE.Vector3(2.5, 0.55, 1),
  );
  const link = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(curve.getPoints(60)),
    new THREE.LineDashedMaterial({ color: colors.unknown, dashSize: 0.22, gapSize: 0.16 }),
  );
  link.computeLineDistances();
  scene.add(link);
  const distances = link.geometry.getAttribute('lineDistance');
  const baseDistances = Float32Array.from(distances.array);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const transform = new THREE.Object3D();
  const pickMeshes = new Map<THREE.Object3D, AssetView[]>();
  const targets: { assetId: string; site: Site; floor: number; position: THREE.Vector3 }[] = [];
  let disposed = false;
  let lost = false;
  let animation: number | undefined;
  let lastFrame = -Infinity;
  let currentState: SceneState | null = null;
  let ready = false;
  const homeSphere = new THREE.Sphere();
  let previousFit: number | undefined;
  let width = 1;
  let height = 1;
  let gesture: { pointerId: number; x: number; y: number; moved: boolean } | null = null;
  const pointers = new Set<number>();

  function diagnostics() {
    canvas.dataset.camera = JSON.stringify({
      position: camera.position.toArray(),
      target: controls.target.toArray(),
      zoom: camera.zoom,
    });
    canvas.dataset.pickTargets = JSON.stringify(
      targets.flatMap((target) => {
        const projected = target.position.clone().project(camera);
        if (Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1 || Math.abs(projected.z) > 1)
          return [];
        return [
          {
            assetId: target.assetId,
            site: target.site,
            floor: target.floor,
            x: ((projected.x + 1) / 2) * width,
            y: ((1 - projected.y) / 2) * height,
          },
        ];
      }),
    );
  }

  function render(project = true) {
    if (disposed || lost || document.hidden) return;
    if (renderer.getContext().isContextLost()) {
      markLost();
      return;
    }
    try {
      renderer.render(scene, camera);
    } catch {
      markLost();
      return;
    }
    if (project) diagnostics();
    if (currentState && !ready) {
      ready = true;
      callbacks.onReady();
    }
  }

  function canAnimate() {
    return !disposed && !lost && !document.hidden;
  }

  function animate(time: number) {
    animation = undefined;
    if (!canAnimate()) {
      canvas.dataset.linkAnimation = 'paused';
      return;
    }
    if (time - lastFrame >= 1000 / 30) {
      const phase = (time / 1200) % 0.38;
      for (let index = 0; index < distances.count; index++)
        distances.setX(index, baseDistances[index] + phase);
      distances.needsUpdate = true;
      render(false);
      lastFrame = time;
    }
    animation = requestAnimationFrame(animate);
  }

  function animationState() {
    if (animation !== undefined) cancelAnimationFrame(animation);
    animation = undefined;
    const running = canAnimate();
    canvas.dataset.linkAnimation = running ? 'running' : 'paused';
    if (running) animation = requestAnimationFrame(animate);
    render();
  }

  function box(
    size: [number, number, number],
    at: [number, number, number],
    color: string,
    opacity = 0.04,
    outlineOpacity = 0.5,
    outlineColor = colors.text,
  ) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(...size),
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.85,
        transparent: true,
        opacity,
        depthWrite: false,
      }),
    );
    mesh.position.set(...at);
    const outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(mesh.geometry),
      new THREE.LineBasicMaterial({
        color: outlineColor,
        transparent: true,
        opacity: outlineOpacity,
        depthWrite: false,
      }),
    );
    outline.renderOrder = 1;
    mesh.add(outline);
    structure.add(mesh);
    return mesh;
  }

  function label(text: string, x: number, y: number, z: number) {
    const surface = document.createElement('canvas');
    surface.width = 512;
    surface.height = 96;
    const context = surface.getContext('2d');
    if (!context) return;
    context.fillStyle = colors.text;
    context.font = '600 48px sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, 256, 48);
    const texture = new THREE.CanvasTexture(surface);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false }));
    sprite.position.set(x, y, z);
    sprite.scale.set(5.4, 1.02, 1);
    structure.add(sprite);
  }

  function update(state: SceneState) {
    if (disposed || lost) return;
    const firstState = currentState === null;
    currentState = state;
    callbacks.onHover(null);
    disposeObjects(structure);
    disposeObjects(devices);
    pickMeshes.clear();
    targets.length = 0;
    for (const site of sites) {
      const x = centers[site];
      const selectedFloor = state.floors[site];
      const levels = site === 'OpenLife' ? [1] : [1, 2, 3, 4];
      for (const level of levels) {
        const y = floorHeight(level);
        const active = level === selectedFloor;
        box(
          [8, 0.22, 6],
          [x, y, 0],
          active ? colors.primary : colors.border,
          active ? 0.12 : 0.035,
          active ? 0.9 : 0.6,
          active ? colors.primary : colors.text,
        );
        box([7.75, 0.04, 5.75], [x, y + 0.13, 0], colors.paper, 0.02, 0.15);
        box([8, 1.65, 0.1], [x, y + 0.98, -2.95], colors.border);
        box([8, 1.65, 0.1], [x, y + 0.98, 2.95], colors.border);
        box([0.1, 1.65, 6], [x - 3.95, y + 0.98, 0], colors.border);
        box([0.1, 1.65, 6], [x + 3.95, y + 0.98, 0], colors.border);
        box([2.8, 0.45, 0.08], [x + 2.5, y + 0.4, -0.2], colors.border, 0.025);
        box([0.08, 0.45, 2.2], [x - 0.4, y + 0.4, 1.75], colors.border, 0.025);
        label(`${level}F`, x + 4.55, y + 0.15, 0);
        addResidents(site, level, state);
      }
      const top = floorHeight(levels[levels.length - 1]) + 1.85;
      const silhouette = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(8.1, top + 0.12, 6.1)),
        new THREE.LineBasicMaterial({
          color: colors.text,
          transparent: true,
          opacity: 0.9,
          depthWrite: false,
        }),
      );
      silhouette.position.set(x, (top - 0.12) / 2, 0);
      silhouette.renderOrder = 1;
      structure.add(silhouette);
      if (site === 'OpenLife') {
        for (const side of [-1, 1]) {
          const roof = box(
            [8.4, 0.06, Math.hypot(3.2, 1.1)],
            [x, top + 0.55, side * 1.6],
            colors.border,
            0.035,
            0.8,
          );
          roof.rotation.x = side * Math.atan(1.1 / 3.2);
        }
      } else box([8.4, 0.12, 6.4], [x, top, 0], colors.border, 0.04, 0.8);
      label(site, x, site === 'OpenLife' ? 3.3 : 8.5, -2.9);
    }
    const bounds = new THREE.Box3().setFromObject(structure);
    bounds.union(new THREE.Box3().setFromObject(devices));
    bounds.getBoundingSphere(homeSphere);
    if (firstState) reset();
    else render();
  }

  function addResidents(site: Site, level: number, state: SceneState) {
    const x = centers[site];
    const residents = state.assets.filter(
      (asset) =>
        !asset.demoKind && asset.placement.site === site && asset.placement.floor === level,
    );
    if (!residents.length) return;
    const body = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: colors.paper, roughness: 0.7, metalness: 0.15 }),
      residents.length,
    );
    const lights = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1, 8, 6),
      new THREE.MeshBasicMaterial(),
      residents.length,
    );
    const slots = deviceSlots(residents.length);
    residents.forEach((asset, index) => {
      const slot = slots[index];
      const y = floorHeight(level) + 0.18;
      const deviceHeight =
        slot.scale * (asset.category === 'disk' || asset.category === 'board' ? 0.4 : 1.15);
      transform.position.set(x + slot.x, y + deviceHeight / 2, slot.z);
      transform.scale.set(slot.scale, deviceHeight, slot.scale * 0.8);
      transform.updateMatrix();
      body.setMatrixAt(index, transform.matrix);
      body.setColorAt(
        index,
        new THREE.Color(asset.assetId === state.selectedId ? colors.primary : colors.border),
      );
      const status = effectivePresence(asset, state.now).status;
      const lightPosition = new THREE.Vector3(
        x + slot.x,
        y + deviceHeight + slot.scale * 0.13,
        slot.z,
      );
      transform.position.copy(lightPosition);
      transform.scale.setScalar(slot.scale * 0.13);
      transform.updateMatrix();
      lights.setMatrixAt(index, transform.matrix);
      lights.setColorAt(index, new THREE.Color(colors[status]));
      targets.push({
        assetId: asset.assetId,
        site,
        floor: level,
        position: new THREE.Vector3(x + slot.x, y + deviceHeight / 2, slot.z),
      });
      if (asset.assetId === state.selectedId) {
        const outline = new THREE.Box3Helper(
          new THREE.Box3(
            new THREE.Vector3(x + slot.x - slot.scale * 0.6, y - 0.02, slot.z - slot.scale * 0.5),
            new THREE.Vector3(
              x + slot.x + slot.scale * 0.6,
              y + deviceHeight + slot.scale * 0.3,
              slot.z + slot.scale * 0.5,
            ),
          ),
          new THREE.Color(colors.primary),
        );
        devices.add(outline);
      }
    });
    body.instanceMatrix.needsUpdate = true;
    lights.instanceMatrix.needsUpdate = true;
    body.computeBoundingSphere();
    lights.computeBoundingSphere();
    devices.add(body, lights);
    pickMeshes.set(body, residents);
    pickMeshes.set(lights, residents);
  }

  function reset() {
    if (disposed || lost || !currentState) return;
    const distance = cameraFitDistance(homeSphere.radius, camera.aspect, camera.fov);
    previousFit = distance;
    controls.target.copy(homeSphere.center);
    camera.position
      .copy(new THREE.Vector3(0.6, 0.75, 1).normalize().multiplyScalar(distance))
      .add(controls.target);
    updateCameraLimits(distance);
    controls.update();
    render();
  }

  function updateCameraLimits(distance: number) {
    controls.minDistance = distance * 0.15;
    controls.maxDistance = distance * 4;
    camera.far = Math.max(300, distance * 6);
    camera.updateProjectionMatrix();
  }

  function resize() {
    if (disposed || lost) return;
    const bounds = canvas.getBoundingClientRect();
    width = Math.max(1, bounds.width);
    height = Math.max(1, bounds.height);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (previousFit !== undefined) {
      const nextFit = cameraFitDistance(homeSphere.radius, camera.aspect, camera.fov);
      const offset = camera.position
        .clone()
        .sub(controls.target)
        .multiplyScalar(nextFit / previousFit);
      camera.position.copy(controls.target).add(offset);
      previousFit = nextFit;
      updateCameraLimits(nextFit);
      controls.update();
    }
    render();
  }

  function pick(event: PointerEvent): string | undefined {
    if (disposed || lost) return;
    const bounds = canvas.getBoundingClientRect();
    pointer.set(
      ((event.clientX - bounds.left) / width) * 2 - 1,
      1 - ((event.clientY - bounds.top) / height) * 2,
    );
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects([...pickMeshes.keys()], false)[0];
    if (!hit || hit.instanceId === undefined) return;
    return pickMeshes.get(hit.object)?.[hit.instanceId]?.assetId;
  }

  function pointerDown(event: PointerEvent) {
    if (disposed || lost) return;
    pointers.add(event.pointerId);
    if (pointers.size > 1) {
      if (gesture) gesture.moved = true;
    } else if (event.button === 0) {
      canvas.focus({ preventScroll: true });
      gesture = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    }
  }

  function pointerMove(event: PointerEvent) {
    if (disposed || lost) return;
    if (gesture && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 5)
      gesture.moved = true;
    if (pointers.size) {
      callbacks.onHover(null);
      canvas.style.cursor = 'grabbing';
      return;
    }
    const assetId = pick(event);
    canvas.style.cursor = assetId ? 'pointer' : 'grab';
    const bounds = canvas.getBoundingClientRect();
    callbacks.onHover(
      assetId ? { assetId, x: event.clientX - bounds.left, y: event.clientY - bounds.top } : null,
    );
  }

  function pointerUp(event: PointerEvent) {
    if (disposed || lost) return;
    const shortClick =
      gesture?.pointerId === event.pointerId && !gesture.moved && pointers.size === 1;
    pointers.delete(event.pointerId);
    if (gesture?.pointerId === event.pointerId) gesture = null;
    canvas.style.cursor = 'grab';
    if (shortClick) {
      const assetId = pick(event);
      if (assetId) callbacks.onSelect(assetId);
    }
  }

  function cancelPointer(event: PointerEvent) {
    if (disposed || lost) return;
    pointers.delete(event.pointerId);
    gesture = null;
    callbacks.onHover(null);
  }

  function leave() {
    if (disposed || lost) return;
    callbacks.onHover(null);
  }

  function wheel() {
    if (disposed || lost) return;
    if (gesture) gesture.moved = true;
  }

  function contextLost(event: Event) {
    event.preventDefault();
    markLost();
  }

  function markLost() {
    if (disposed || lost) return;
    lost = true;
    controls.enabled = false;
    pointers.clear();
    gesture = null;
    canvas.dataset.pickTargets = '[]';
    animationState();
    callbacks.onHover(null);
    callbacks.onLost();
  }

  function keyDown(event: KeyboardEvent) {
    if (disposed || lost) return;
    if (event.key === 'Home') {
      event.preventDefault();
      reset();
    }
  }

  const changed = () => render();
  controls.addEventListener('change', changed);
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', cancelPointer);
  canvas.addEventListener('pointerleave', leave);
  canvas.addEventListener('wheel', wheel, { passive: true });
  canvas.addEventListener('keydown', keyDown);
  canvas.addEventListener('webglcontextlost', contextLost);
  document.addEventListener('visibilitychange', animationState);
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  animationState();

  return {
    update,
    setColors(nextColors) {
      if (disposed || lost) return;
      colors = nextColors;
      renderer.setClearColor(colors.background);
      for (const material of Array.isArray(gridMaterial) ? gridMaterial : [gridMaterial])
        material.color.set(colors.border);
      link.material.color.set(colors.unknown);
      if (currentState) update(currentState);
      else render();
    },
    reset,
    dispose() {
      if (disposed) return;
      disposed = true;
      canvas.dataset.linkAnimation = 'paused';
      canvas.dataset.pickTargets = '[]';
      pointers.clear();
      gesture = null;
      if (animation !== undefined) cancelAnimationFrame(animation);
      observer.disconnect();
      controls.removeEventListener('change', changed);
      controls.dispose();
      canvas.removeEventListener('pointerdown', pointerDown);
      canvas.removeEventListener('pointermove', pointerMove);
      canvas.removeEventListener('pointerup', pointerUp);
      canvas.removeEventListener('pointercancel', cancelPointer);
      canvas.removeEventListener('pointerleave', leave);
      canvas.removeEventListener('wheel', wheel);
      canvas.removeEventListener('keydown', keyDown);
      canvas.removeEventListener('webglcontextlost', contextLost);
      document.removeEventListener('visibilitychange', animationState);
      disposeObjects(scene);
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
