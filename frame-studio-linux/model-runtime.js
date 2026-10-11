import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

function readAnimationsDuration(clips) {
  return (clips || []).reduce((max, clip) => Math.max(max, Number(clip.duration) || 0), 0);
}

async function parseModel(source) {
  return new Promise((resolve, reject) => {
    try {
      const loader = new GLTFLoader();
      loader.parse(source, '', resolve, reject);
    } catch (error) { reject(error); }
  });
}

async function create(source, options = {}) {
  const width = clamp(Math.round(Number(options.width) || 768), 128, 1536);
  const height = clamp(Math.round(Number(options.height) || 512), 128, 1536);
  const gltf = await parseModel(source);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;

  const scene = new THREE.Scene();
  const ambient = new THREE.HemisphereLight(0xffffff, 0x303044, 2.0);
  scene.add(ambient);
  const keyLight = new THREE.DirectionalLight(0xffffff, 3.0);
  keyLight.position.set(4, 7, 5);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xb9c9ff, 1.1);
  fillLight.position.set(-5, 1, -4);
  scene.add(fillLight);
  scene.add(gltf.scene);

  const bounds = new THREE.Box3().setFromObject(gltf.scene);
  if (bounds.isEmpty()) throw new Error('The model contains no renderable geometry.');
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const largest = Math.max(size.x, size.y, size.z, 0.001);
  const scale = 2.25 / largest;
  gltf.scene.scale.multiplyScalar(scale);
  gltf.scene.position.sub(center.multiplyScalar(scale));
  const scaledBounds = new THREE.Box3().setFromObject(gltf.scene);
  const sphere = scaledBounds.getBoundingSphere(new THREE.Sphere());
  const radius = Math.max(0.5, sphere.radius);
  const camera = new THREE.PerspectiveCamera(35, width / height, 0.01, Math.max(1000, radius * 100));
  camera.position.set(radius * 0.9, radius * 0.58, radius * 3.2);
  camera.lookAt(scaledBounds.getCenter(new THREE.Vector3()));
  scene.add(camera);

  const animations = gltf.animations || [];
  const duration = readAnimationsDuration(animations);
  const mixer = animations.length ? new THREE.AnimationMixer(gltf.scene) : null;
  if (mixer) for (const animation of animations) mixer.clipAction(animation).play();
  let disposed = false;
  let lastTime = NaN;
  function renderAt(time = 0) {
    if (disposed) return canvas;
    const t = Math.max(0, Number(time) || 0);
    if (mixer && t !== lastTime) mixer.setTime(duration > 0 ? t % duration : 0);
    lastTime = t;
    renderer.render(scene, camera);
    return canvas;
  }
  renderAt(0);
  return {
    canvas, width, height, duration, hasAnimation: animations.length > 0,
    renderAt,
    dispose() {
      if (disposed) return;
      disposed = true;
      mixer?.stopAllAction();
      scene.traverse(node => {
        if (node.geometry) node.geometry.dispose();
        if (node.material) {
          const materials = Array.isArray(node.material) ? node.material : [node.material];
          for (const material of materials) {
            for (const value of Object.values(material)) if (value && value.isTexture) value.dispose();
            material.dispose();
          }
        }
      });
      renderer.dispose();
    }
  };
}

window.FrameModelRuntime = Object.freeze({ create });
