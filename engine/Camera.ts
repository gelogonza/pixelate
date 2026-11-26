import * as THREE from 'three';
import type { CameraParams, FrameInfo } from './types';

export const DEFAULT_CAMERA_PARAMS: CameraParams = {
  distance: 5.5,
  fov: 45,
  elevation: 20, // degrees above equator
  azimuth: 35,   // degrees around Y
  autoRotate: true,
  autoRotateSpeed: 15, // degrees per second
  targetY: 0.2,
};

export class StudioCameraController {
  private camera: THREE.PerspectiveCamera;
  private target: THREE.Vector3 = new THREE.Vector3(0, 0.2, 0);

  constructor(fov = 45, aspect = 9 / 16, near = 0.1, far = 1000) {
    this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    this.camera.position.set(0, 2, 5.5);
    this.camera.lookAt(this.target);
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  public update(params: CameraParams, frameInfo: FrameInfo): void {
    const {
      distance,
      fov,
      elevation,
      azimuth,
      autoRotate,
      autoRotateSpeed,
      targetY,
    } = params;

    if (this.camera.fov !== fov) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }

    this.target.set(0, targetY ?? 0.2, 0);

    // Calculate rotation angle deterministically based on frameInfo.time
    let currentAzimuth = azimuth;
    if (autoRotate) {
      currentAzimuth += frameInfo.time * autoRotateSpeed;
    }

    const phi = THREE.MathUtils.degToRad(90 - elevation);
    const theta = THREE.MathUtils.degToRad(currentAzimuth);

    const x = distance * Math.sin(phi) * Math.sin(theta);
    const y = distance * Math.cos(phi) + this.target.y;
    const z = distance * Math.sin(phi) * Math.cos(theta);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.target);
  }

  public resize(width: number, height: number): void {
    this.camera.aspect = height > 0 ? width / height : 1;
    this.camera.updateProjectionMatrix();
  }
}
