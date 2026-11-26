import * as THREE from "three";
import type {
  CameraParams,
  FrameInfo,
  GeometrySampleCloud,
  IScene,
  ParameterMap,
} from "./types";
import { StudioCameraController } from "./Camera";
import { createScene } from "./SceneRegistry";

/**
 * Drives one procedural scene and exposes its two consumable forms:
 *
 *   - `raster()`   — a shaded WebGL render on an offscreen canvas, which any
 *                    image-space Pixelate mode can treat as ordinary media.
 *   - `cloud()`    — the dense 3D sample cloud the geometry ASCII renderer needs.
 *
 * Unlike ascii-studio's StudioEngine this owns no animation loop and no preview
 * canvas: Pixelate's useRenderer already schedules frames. Time arrives from the
 * caller, so the host is a pure function of (t, params) and seeks exactly.
 *
 * The scene is passed to consumers by return value rather than smuggled onto the
 * THREE.Scene object, which is how ascii-studio wired it.
 */
export class SceneHost {
  private gl: THREE.WebGLRenderer | null = null;
  private glCanvas: HTMLCanvasElement | null = null;
  private threeScene = new THREE.Scene();
  private cameraController = new StudioCameraController(45, 9 / 16);

  private scene: IScene | null = null;
  private sceneId: string | null = null;

  private width = 1;
  private height = 1;

  private ambient = new THREE.AmbientLight(0xffffff, 1.4);
  private keyLight = new THREE.DirectionalLight(0xffffff, 3.6);
  private fillLight = new THREE.DirectionalLight(0x818cf8, 1.8);
  private lightsAttached = false;

  /** Guards against reporting a cloud built for a stale frame. */
  private cloudFrame = -1;
  private cloudCache: GeometrySampleCloud | null = null;

  constructor() {
    this.keyLight.position.set(5, 8, 5);
    this.fillLight.position.set(-5, -2, -3);
  }

  private ensureGl(): boolean {
    if (this.gl) return true;
    if (typeof document === "undefined") return false;
    this.glCanvas = document.createElement("canvas");
    this.glCanvas.width = Math.max(1, this.width);
    this.glCanvas.height = Math.max(1, this.height);
    try {
      this.gl = new THREE.WebGLRenderer({
        canvas: this.glCanvas,
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
        powerPreference: "high-performance",
      });
    } catch {
      // No WebGL available. The geometry path still works — it never needs a
      // GL context, only the camera matrices — so fail soft.
      this.gl = null;
      return false;
    }
    this.gl.setPixelRatio(1);
    this.gl.setSize(this.width, this.height, false);
    return true;
  }

  /** Swap the active scene. No-op when the id is unchanged. */
  setScene(id: string, params: ParameterMap): void {
    if (this.sceneId === id && this.scene) return;
    this.disposeScene();

    this.threeScene = new THREE.Scene();
    this.lightsAttached = false;
    this.scene = createScene(id);
    this.sceneId = id;
    this.cloudFrame = -1;
    this.cloudCache = null;

    this.ensureGl();
    this.scene.init(
      {
        scene: this.threeScene,
        camera: this.cameraController.getCamera(),
        renderer: this.gl as THREE.WebGLRenderer,
        width: this.width,
        height: this.height,
        pixelRatio: 1,
      },
      params
    );
  }

  getSceneId(): string | null {
    return this.sceneId;
  }

  resize(width: number, height: number): void {
    const w = Math.max(1, Math.floor(width));
    const h = Math.max(1, Math.floor(height));
    if (w === this.width && h === this.height) return;
    this.width = w;
    this.height = h;
    if (this.glCanvas) {
      this.glCanvas.width = w;
      this.glCanvas.height = h;
    }
    this.gl?.setSize(w, h, false);
    this.cameraController.resize(w, h);
    this.scene?.onResize(w, h);
    this.cloudFrame = -1;
  }

  /**
   * Advance the scene and camera to `frameInfo`. Must be called before `raster()`
   * or `cloud()` for that frame. Purely a function of frameInfo.time, so calling
   * it twice with the same time produces the same state.
   */
  update(frameInfo: FrameInfo, sceneParams: ParameterMap, cameraParams: CameraParams): void {
    if (!this.scene) return;
    this.cameraController.update(cameraParams, frameInfo);
    this.scene.update(frameInfo, sceneParams);
    this.cloudFrame = -1;
    this.cloudCache = null;
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.cameraController.getCamera();
  }

  /** Shaded WebGL render of the current state. Returns null without WebGL. */
  raster(backgroundColor: string | null, exposure = 1.15): HTMLCanvasElement | null {
    if (!this.scene) return null;
    if (!this.ensureGl() || !this.gl || !this.glCanvas) return null;

    if (!this.lightsAttached) {
      this.threeScene.add(this.ambient);
      this.threeScene.add(this.keyLight);
      this.threeScene.add(this.fillLight);
      this.lightsAttached = true;
    }

    this.gl.toneMapping = THREE.ACESFilmicToneMapping;
    this.gl.toneMappingExposure = exposure;
    if (backgroundColor) this.gl.setClearColor(backgroundColor, 1);
    else this.gl.setClearColor(0x000000, 0);
    this.gl.render(this.threeScene, this.cameraController.getCamera());
    return this.glCanvas;
  }

  /**
   * Dense surface samples for the geometry ASCII renderer. Prefers the scene's
   * own getSampleCloud(); otherwise walks the THREE scene graph and emits one
   * sample per vertex. The fallback carries no AO, glow or particle identity, so
   * scenes relying on it render visibly sparser — SceneRegistry flags which.
   */
  cloud(frameInfo: FrameInfo, sceneParams: ParameterMap): GeometrySampleCloud | null {
    if (!this.scene) return null;
    if (this.cloudFrame === frameInfo.frame && this.cloudCache) return this.cloudCache;

    let result: GeometrySampleCloud | null = null;

    if (typeof this.scene.getSampleCloud === "function") {
      const c = this.scene.getSampleCloud(frameInfo, sceneParams);
      if (c && c.positions && c.positions.length > 0) result = c;
    }

    if (!result) result = this.sampleMeshes();

    this.cloudFrame = frameInfo.frame;
    this.cloudCache = result;
    return result;
  }

  private sampleMeshes(): GeometrySampleCloud | null {
    const pos: number[] = [];
    const nrm: number[] = [];
    const col: number[] = [];
    const ids: number[] = [];

    const wp = new THREE.Vector3();
    const wn = new THREE.Vector3();

    this.threeScene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry) return;

      const posAttr = mesh.geometry.attributes.position;
      const nrmAttr = mesh.geometry.attributes.normal;
      if (!posAttr) return;

      mesh.updateWorldMatrix(true, false);
      const m = mesh.matrixWorld;
      const nm = new THREE.Matrix3().getNormalMatrix(m);

      let color = new THREE.Color(0.8, 0.8, 0.9);
      const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      if (mat && (mat as THREE.MeshStandardMaterial).color) {
        color = (mat as THREE.MeshStandardMaterial).color;
      }

      for (let i = 0; i < posAttr.count; i++) {
        wp.set(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i)).applyMatrix4(m);
        if (nrmAttr) {
          wn.set(nrmAttr.getX(i), nrmAttr.getY(i), nrmAttr.getZ(i)).applyMatrix3(nm).normalize();
        } else {
          wn.set(0, 0, 1);
        }
        pos.push(wp.x, wp.y, wp.z);
        nrm.push(wn.x, wn.y, wn.z);
        col.push(color.r, color.g, color.b);
        ids.push(i % 10000);
      }
    });

    if (pos.length === 0) return null;

    const count = pos.length / 3;
    return {
      positions: new Float32Array(pos),
      normals: new Float32Array(nrm),
      colors: new Float32Array(col),
      ambientOcclusion: new Float32Array(count).fill(1),
      ids: new Int32Array(ids),
      flying: new Uint8Array(count),
    };
  }

  private disposeScene(): void {
    if (this.scene) {
      try {
        this.scene.dispose();
      } catch {
        /* a scene that never ran init() may not have everything to dispose */
      }
    }
    this.scene = null;
    this.sceneId = null;
    this.lightsAttached = false;
  }

  dispose(): void {
    this.disposeScene();
    this.gl?.dispose();
    this.gl = null;
    this.glCanvas = null;
    this.cloudCache = null;
  }
}
