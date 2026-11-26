import type { FrameInfo, TypographyOverlayParams } from '../types';

export const DEFAULT_TYPOGRAPHY_PARAMS: TypographyOverlayParams = {
  enabled: true,
  title: 'FLORA MORTIS',
  subtitle: 'GENESIS SPECIMEN 01',
  watermark: '@ascii.studio',
  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  titleSize: 42,
  subtitleSize: 20,
  watermarkSize: 18,
  color: '#ffffff',
  opacity: 0.9,
  position: 'bottom',
  fadeInDuration: 0.8,
  fadeOutDuration: 0.8,
  subtleGlow: true,
};

export class TypographyOverlay {
  public draw(
    ctx: CanvasRenderingContext2D,
    params: TypographyOverlayParams,
    frameInfo: FrameInfo
  ): void {
    if (!params.enabled) return;

    const {
      title,
      subtitle,
      watermark,
      fontFamily,
      titleSize,
      subtitleSize,
      watermarkSize,
      color,
      opacity,
      position,
      fadeInDuration,
      fadeOutDuration,
      subtleGlow,
    } = params;

    // Calculate fade in / fade out alpha
    let alpha = 1.0;
    if (fadeInDuration > 0 && frameInfo.time < fadeInDuration) {
      alpha = Math.min(1.0, frameInfo.time / fadeInDuration);
    } else if (fadeOutDuration > 0 && frameInfo.duration - frameInfo.time < fadeOutDuration) {
      alpha = Math.max(0.0, (frameInfo.duration - frameInfo.time) / fadeOutDuration);
    }

    const effectiveOpacity = opacity * alpha;
    if (effectiveOpacity <= 0.001) return;

    ctx.save();
    ctx.globalAlpha = effectiveOpacity;

    // Responsive scaling based on reference 1080px width
    const scale = frameInfo.width / 1080;
    const scaledTitle = Math.max(12, Math.round(titleSize * scale));
    const scaledSubtitle = Math.max(9, Math.round(subtitleSize * scale));
    const scaledWatermark = Math.max(8, Math.round(watermarkSize * scale));

    if (subtleGlow) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 10 * scale;
    } else {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 4 * scale;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2 * scale;
    }

    ctx.fillStyle = color;
    ctx.textAlign = 'center';

    // Position calculations with social media safe margins
    const safeMarginX = frameInfo.width * 0.08;
    const safeTop = frameInfo.height * 0.12;
    const safeBottom = frameInfo.height * 0.82; // Leave room for TikTok/Reels captions

    let contentY = safeBottom;
    if (position === 'top') {
      contentY = safeTop;
    } else if (position === 'center') {
      contentY = frameInfo.height * 0.5;
    }

    // Title
    if (title && title.trim().length > 0) {
      ctx.font = `700 ${scaledTitle}px ${fontFamily}`;
      ctx.fillText(title.toUpperCase(), frameInfo.width / 2, contentY);
    }

    // Subtitle
    if (subtitle && subtitle.trim().length > 0) {
      ctx.font = `500 ${scaledSubtitle}px ${fontFamily}`;
      const subtitleOffset = position === 'top' ? scaledTitle * 0.9 : -scaledTitle * 0.85;
      ctx.fillText(subtitle.toUpperCase(), frameInfo.width / 2, contentY + subtitleOffset);
    }

    // Subtle Watermark in bottom corner / safe zone
    if (watermark && watermark.trim().length > 0) {
      ctx.font = `400 ${scaledWatermark}px ${fontFamily}`;
      ctx.textAlign = 'right';
      ctx.fillText(watermark, frameInfo.width - safeMarginX, frameInfo.height - frameInfo.height * 0.05);
    }

    ctx.restore();
  }

  /**
   * Draws preview safe-area guidelines (TikTok / Instagram Reels zones).
   * Note: This is NEVER called during video export, only in UI preview mode!
   */
  public drawSafeAreas(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    aspectRatio: string
  ): void {
    if (aspectRatio !== '9:16') return;

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 60, 100, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);

    // Top safe zone (header, sound bar)
    const topLimit = height * 0.12;
    // Bottom safe zone (comments, captions, audio marquee)
    const bottomLimit = height * 0.80;
    // Right safe zone (like, comment, share, bookmark buttons)
    const rightLimit = width * 0.85;
    // Left margin
    const leftLimit = width * 0.05;

    // Outer safe box
    ctx.strokeRect(leftLimit, topLimit, rightLimit - leftLimit, bottomLimit - topLimit);

    // Label safe zones
    ctx.font = '12px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255, 60, 100, 0.6)';
    ctx.textAlign = 'left';
    ctx.fillText('9:16 Safe Action Area', leftLimit + 8, topLimit + 18);

    // Right icon action zone
    ctx.fillStyle = 'rgba(255, 60, 100, 0.12)';
    ctx.fillRect(rightLimit, topLimit, width - rightLimit - 4, bottomLimit - topLimit);
    ctx.fillStyle = 'rgba(255, 60, 100, 0.5)';
    ctx.textAlign = 'center';
    ctx.fillText('Social UI', (rightLimit + width) / 2, height * 0.5);

    // Bottom caption zone
    ctx.fillStyle = 'rgba(255, 60, 100, 0.08)';
    ctx.fillRect(leftLimit, bottomLimit, rightLimit - leftLimit, height - bottomLimit - 8);

    ctx.restore();
  }
}
