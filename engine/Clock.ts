import type { FrameInfo } from './types';

export class AnimationClock {
  private fps: number = 30;
  private duration: number = 6.0; // 6 seconds default
  private currentFrame: number = 0;
  private currentTime: number = 0;
  private isPlaying: boolean = true;
  private isLooping: boolean = true;
  private onTickCallbacks: Set<(info: FrameInfo) => void> = new Set();

  constructor(fps = 30, duration = 6.0) {
    this.fps = fps;
    this.duration = duration;
    this.currentFrame = 0;
    this.currentTime = 0;
  }

  public get totalFrames(): number {
    return Math.max(1, Math.round(this.duration * this.fps));
  }

  public get frame(): number {
    return this.currentFrame;
  }

  public get time(): number {
    return this.currentTime;
  }

  public get isPaused(): boolean {
    return !this.isPlaying;
  }

  public get running(): boolean {
    return this.isPlaying;
  }

  public getFps(): number {
    return this.fps;
  }

  public getDuration(): number {
    return this.duration;
  }

  public setFps(fps: number): void {
    this.fps = fps;
    this.seek(this.currentTime);
  }

  public setDuration(duration: number): void {
    this.duration = Math.max(0.1, duration);
    if (this.currentTime >= this.duration) {
      this.seek(0);
    }
  }

  public setLoop(loop: boolean): void {
    this.isLooping = loop;
  }

  public play(): void {
    this.isPlaying = true;
  }

  public pause(): void {
    this.isPlaying = false;
  }

  public togglePlay(): boolean {
    this.isPlaying = !this.isPlaying;
    return this.isPlaying;
  }

  public seek(time: number): void {
    const total = this.totalFrames;
    if (this.isLooping) {
      // Loop modulo
      let wrapped = time % this.duration;
      if (wrapped < 0) wrapped += this.duration;
      this.currentTime = wrapped;
      this.currentFrame = Math.floor(wrapped * this.fps) % total;
    } else {
      this.currentTime = Math.max(0, Math.min(this.duration, time));
      this.currentFrame = Math.min(total - 1, Math.floor(this.currentTime * this.fps));
    }
  }

  public seekFrame(frame: number): void {
    const total = this.totalFrames;
    if (this.isLooping) {
      let f = frame % total;
      if (f < 0) f += total;
      this.currentFrame = f;
      this.currentTime = f / this.fps;
    } else {
      this.currentFrame = Math.max(0, Math.min(total - 1, frame));
      this.currentTime = this.currentFrame / this.fps;
    }
  }

  public stepFrame(delta: number): void {
    this.seekFrame(this.currentFrame + delta);
  }

  /**
   * Advance clock during live interactive playback by real delta seconds
   */
  public advance(deltaSeconds: number): void {
    if (!this.isPlaying) return;
    this.seek(this.currentTime + deltaSeconds);
  }

  public getFrameInfo(width: number, height: number): FrameInfo {
    const total = this.totalFrames;
    const progress = total > 1 ? this.currentFrame / total : 0;
    return {
      frame: this.currentFrame,
      time: this.currentTime,
      duration: this.duration,
      progress,
      fps: this.fps,
      width,
      height,
      aspectRatio: height > 0 ? width / height : 1,
    };
  }

  public getExplicitFrameInfo(frameIndex: number, width: number, height: number): FrameInfo {
    const total = this.totalFrames;
    const boundedFrame = ((frameIndex % total) + total) % total;
    const time = boundedFrame / this.fps;
    const progress = total > 1 ? boundedFrame / total : 0;
    return {
      frame: boundedFrame,
      time,
      duration: this.duration,
      progress,
      fps: this.fps,
      width,
      height,
      aspectRatio: height > 0 ? width / height : 1,
    };
  }
}
