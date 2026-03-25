/**
 * WeatherLayer - PixiJS-based weather effects
 *
 * Renders particle-based weather (rain, snow, storm, cherry blossoms)
 * and overlay-based weather (fog, mist) using WebGL.
 *
 * Features:
 * - Particle systems with physics simulation
 * - Fog/mist overlays with scrolling animation and feathered edges
 * - Smooth crossfade transitions between weather states
 * - Efficient viewport-based particle culling
 * - GPU-accelerated rendering
 *
 * Usage:
 *   const weatherLayer = new WeatherLayer(viewportWidth, viewportHeight);
 *   app.stage.addChild(weatherLayer.getContainer());
 *   weatherLayer.setWeather('rain');
 *   // In game loop:
 *   weatherLayer.update(deltaTime);
 */

import * as PIXI from 'pixi.js';
import { TIMING } from '../../constants';
import { textureManager } from '../TextureManager';
import { particleAssets } from '../../assets';
import { gameState } from '../../GameState';
import {
  WeatherType,
  PARTICLE_CONFIGS,
  FOG_CONFIGS,
  ParticleConfig,
} from '../../data/weatherConfig';
import { Z_WEATHER_PARTICLES, Z_WEATHER_TINT } from '../../zIndex';

// Edge feathering for fog/mist — how many pixels at each edge fade to transparent
const FOG_EDGE_FEATHER = 120;

interface Particle {
  sprite: PIXI.Sprite;
  velocityX: number;
  velocityY: number;
  life: number;
  maxLife: number;
}

/**
 * Create an alpha mask texture with feathered edges.
 * Fully opaque in the centre, fading to transparent at all four edges.
 * Per-pixel alpha = product of horizontal and vertical distance-to-edge factors,
 * so corners fade correctly without double-darkening.
 */
function createFogEdgeMask(width: number, height: number, feather: number): PIXI.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  for (let y = 0; y < height; y++) {
    let fy = 1;
    if (y < feather) fy = y / feather;
    else if (y > height - feather) fy = (height - y) / feather;

    for (let x = 0; x < width; x++) {
      let fx = 1;
      if (x < feather) fx = x / feather;
      else if (x > width - feather) fx = (width - x) / feather;

      const alpha = Math.floor(fx * fy * 255);
      const idx = (y * width + x) * 4;
      data[idx] = 255;
      data[idx + 1] = 255;
      data[idx + 2] = 255;
      data[idx + 3] = alpha;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return PIXI.Texture.from(canvas);
}

export class WeatherLayer {
  private container: PIXI.Container;
  private particleContainer: PIXI.Container;
  private fogContainer: PIXI.Container;

  private currentWeather: WeatherType = 'clear';
  private particles: Particle[] = [];
  private particlePool: PIXI.Sprite[] = [];

  private fogSprite: PIXI.TilingSprite | null = null;
  private fogMaskSprite: PIXI.Sprite | null = null;
  private fogMaskTexture: PIXI.Texture | null = null;

  private viewportWidth: number;
  private viewportHeight: number;

  private particleTextures: Map<WeatherType, PIXI.Texture> = new Map();
  private fogTextures: Map<WeatherType, PIXI.Texture> = new Map();

  private timeSinceLastEmit: number = 0;

  // Transition state machine for smooth crossfades
  private transitionState: 'idle' | 'fading_out' | 'fading_in' = 'idle';
  private transitionProgress = 0;
  private pendingWeather: WeatherType = 'clear';
  private emitRateMultiplier = 1.0;

  constructor(viewportWidth: number, viewportHeight: number) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;

    // Main container - must have a high z-index on the stage so weather
    // renders above all game world elements (tiles, sprites, buildings)
    this.container = new PIXI.Container();
    this.container.sortableChildren = true;
    this.container.zIndex = Z_WEATHER_PARTICLES;

    // Particle container (for rain, snow, etc.)
    this.particleContainer = new PIXI.Container();
    this.particleContainer.zIndex = Z_WEATHER_PARTICLES;
    this.container.addChild(this.particleContainer);

    // Fog container (for fog, mist overlays)
    this.fogContainer = new PIXI.Container();
    this.fogContainer.zIndex = Z_WEATHER_TINT;
    this.container.addChild(this.fogContainer);
  }

  /**
   * Load weather textures
   */
  async loadTextures(): Promise<void> {
    try {
      // Load particle textures using proper asset URLs (includes base path)
      const rainTexture = await textureManager.loadTexture('rain_particle', particleAssets.rain);
      const snowTexture = await textureManager.loadTexture('snow_particle', particleAssets.snow);

      if (rainTexture) {
        this.particleTextures.set('rain', rainTexture);
        this.particleTextures.set('storm', rainTexture); // Reuse rain for storm
      } else {
        console.error('[WeatherLayer] ✗ Failed to load rain texture');
      }

      if (snowTexture) {
        this.particleTextures.set('snow', snowTexture);
        this.particleTextures.set('cherry_blossoms', snowTexture); // Placeholder for cherry blossoms
      } else {
        console.error('[WeatherLayer] ✗ Failed to load snow texture');
      }

      // Load fog textures using proper asset URLs (includes base path)
      const fogTexture = await textureManager.loadTexture('fog_overlay', particleAssets.fog);
      const mistTexture = await textureManager.loadTexture('mist_overlay', particleAssets.mist);

      if (fogTexture) {
        this.fogTextures.set('fog', fogTexture);
      } else {
        console.error('[WeatherLayer] ✗ Failed to load fog texture');
      }

      if (mistTexture) {
        this.fogTextures.set('mist', mistTexture);
      } else {
        console.error('[WeatherLayer] ✗ Failed to load mist texture');
      }

      console.log(
        '[WeatherLayer] Texture loading complete. Available textures:',
        Array.from(this.particleTextures.keys()),
        'fog textures:',
        Array.from(this.fogTextures.keys())
      );
    } catch (error) {
      console.error('[WeatherLayer] Error loading textures:', error);
    }
  }

  /**
   * Set current weather with smooth crossfade transition.
   * Pass immediate=true to skip the fade (e.g. entering an indoor map).
   */
  setWeather(weather: WeatherType, immediate = false): void {
    if (this.currentWeather === weather) {
      return;
    }

    console.log(
      `[WeatherLayer] Transitioning weather from ${this.currentWeather} to ${weather}${immediate ? ' (immediate)' : ''}`
    );

    // Instant switch — no fade (used when entering indoor/cave maps)
    if (immediate) {
      this._completeTransition();
      this.currentWeather = weather;
      if (weather !== 'clear') {
        if (weather === 'fog' || weather === 'mist') {
          this.setupFog(weather);
        } else {
          this.setupParticles(weather);
        }
      }
      return;
    }

    // If already transitioning, complete immediately and start fresh
    if (this.transitionState !== 'idle') {
      this._completeTransition();
    }

    // From clear: skip fade-out, just fade in the new weather
    if (this.currentWeather === 'clear') {
      this.currentWeather = weather;
      if (weather === 'fog' || weather === 'mist') {
        this.setupFog(weather);
        if (this.fogSprite) this.fogSprite.alpha = 0;
      } else {
        this.setupParticles(weather);
        this.emitRateMultiplier = 0;
      }
      this.transitionState = 'fading_in';
      this.transitionProgress = 0;
      return;
    }

    // To clear or to another weather type: fade out first
    this.pendingWeather = weather;
    this.transitionState = 'fading_out';
    this.transitionProgress = 0;
  }

  /**
   * Immediately complete any in-progress transition
   */
  private _completeTransition(): void {
    this.clearParticles();
    this.clearFog();
    this.emitRateMultiplier = 1.0;
    this.transitionState = 'idle';
    this.transitionProgress = 0;
  }

  /**
   * Setup particle system for weather type
   */
  private setupParticles(weather: WeatherType): void {
    const config = PARTICLE_CONFIGS[weather];
    if (!config) {
      return;
    }

    // Pre-create particle pool for performance
    const texture = this.particleTextures.get(weather);
    if (!texture) {
      console.error(
        `[WeatherLayer] No texture loaded for weather: ${weather}. Available textures:`,
        Array.from(this.particleTextures.keys())
      );
      console.error('[WeatherLayer] Skipping particle setup. Weather effects will not be visible.');
      return;
    }

    // Create initial particle pool
    for (let i = 0; i < config.maxParticles; i++) {
      const sprite = new PIXI.Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.visible = false;
      this.particlePool.push(sprite);
      this.particleContainer.addChild(sprite);
    }

    console.log(
      `[WeatherLayer] ✓ Created particle pool: ${config.maxParticles} sprites for ${weather}`
    );
  }

  /**
   * Setup fog overlay for weather type
   */
  private setupFog(weather: 'fog' | 'mist'): void {
    const config = FOG_CONFIGS[weather];
    const texture = this.fogTextures.get(weather);

    if (!config || !texture) {
      return;
    }

    // Create tiling fog sprite (seamless scrolling)
    this.fogSprite = new PIXI.TilingSprite({
      texture,
      width: this.viewportWidth,
      height: this.viewportHeight,
    });
    this.fogSprite.alpha = config.alpha;
    this.fogSprite.tileScale.set(config.scale, config.scale);

    this.fogContainer.addChild(this.fogSprite);

    // Apply feathered edge mask to prevent sharp rectangular cutoff
    this._applyFogMask();

  }

  /**
   * Create and apply an alpha mask with feathered edges to the fog sprite.
   * Prevents the hard rectangular boundary that's visible at viewport edges.
   */
  private _applyFogMask(): void {
    if (!this.fogSprite) return;

    // Clean up old mask
    if (this.fogMaskTexture) {
      this.fogMaskTexture.destroy(true);
      this.fogMaskTexture = null;
    }
    if (this.fogMaskSprite) {
      this.fogMaskSprite.destroy();
      this.fogMaskSprite = null;
    }

    this.fogMaskTexture = createFogEdgeMask(
      this.viewportWidth,
      this.viewportHeight,
      FOG_EDGE_FEATHER
    );
    this.fogMaskSprite = new PIXI.Sprite(this.fogMaskTexture);
    this.fogSprite.mask = this.fogMaskSprite;
    this.fogContainer.addChild(this.fogMaskSprite);
  }

  /**
   * Update weather effects (called each frame)
   */
  update(deltaTime: number): void {
    // Drive the transition state machine
    if (this.transitionState !== 'idle') {
      this._updateTransition(deltaTime);
    }

    if (this.currentWeather === 'clear' && this.transitionState === 'idle') return;

    // Update particles
    if (this.currentWeather !== 'fog' && this.currentWeather !== 'mist') {
      this.updateParticles(deltaTime);
    }

    // Update fog scroll
    if (this.currentWeather === 'fog' || this.currentWeather === 'mist') {
      this.updateFog(deltaTime);
    }
  }

  /**
   * Advance the crossfade transition state machine.
   * Fading out: reduce emit rate / fog alpha toward 0, then switch to new weather.
   * Fading in: ramp emit rate / fog alpha from 0 to full.
   */
  private _updateTransition(deltaTime: number): void {
    this.transitionProgress += deltaTime / TIMING.WEATHER_TRANSITION_S;

    if (this.transitionState === 'fading_out') {
      const fadeOut = Math.max(0, 1 - this.transitionProgress);
      this.emitRateMultiplier = fadeOut;

      // Fade fog alpha
      if (this.fogSprite) {
        const config = FOG_CONFIGS[this.currentWeather];
        if (config) {
          this.fogSprite.alpha = config.alpha * fadeOut;
        }
      }

      if (this.transitionProgress >= 1) {
        // Fade-out complete — clear old effects and begin fade-in
        this.clearParticles();
        this.clearFog();
        this.currentWeather = this.pendingWeather;

        if (this.pendingWeather === 'clear') {
          // Done — no fade-in needed
          this.transitionState = 'idle';
          this.transitionProgress = 0;
          this.emitRateMultiplier = 1.0;
        } else {
          // Set up new effects and begin fade-in
          if (this.pendingWeather === 'fog' || this.pendingWeather === 'mist') {
            this.setupFog(this.pendingWeather);
            if (this.fogSprite) this.fogSprite.alpha = 0;
          } else {
            this.setupParticles(this.pendingWeather);
            this.emitRateMultiplier = 0;
          }
          this.transitionState = 'fading_in';
          this.transitionProgress = 0;
        }
      }
    } else if (this.transitionState === 'fading_in') {
      const fadeIn = Math.min(1, this.transitionProgress);
      this.emitRateMultiplier = fadeIn;

      // Fade fog alpha
      if (this.fogSprite) {
        const config = FOG_CONFIGS[this.currentWeather];
        if (config) {
          this.fogSprite.alpha = config.alpha * fadeIn;
        }
      }

      if (this.transitionProgress >= 1) {
        // Fade-in complete
        this.transitionState = 'idle';
        this.transitionProgress = 0;
        this.emitRateMultiplier = 1.0;
      }
    }
  }

  /**
   * Update particle systems
   */
  private updateParticles(deltaTime: number): void {
    const config = PARTICLE_CONFIGS[this.currentWeather];
    if (!config) return;

    // Get drift speed multiplier from game state
    const driftSpeed = gameState.getWeatherDriftSpeed();

    // Emit new particles (scaled by transition multiplier)
    this.timeSinceLastEmit += deltaTime;
    const effectiveEmitRate = config.emitRate * this.emitRateMultiplier;

    if (effectiveEmitRate > 0) {
      const emitInterval = 1 / effectiveEmitRate;
      while (
        this.timeSinceLastEmit >= emitInterval &&
        this.particles.length < config.maxParticles
      ) {
        this.emitParticle(config);
        this.timeSinceLastEmit -= emitInterval;
      }
    } else {
      // Not emitting — reset accumulator so we don't burst when rate resumes
      this.timeSinceLastEmit = 0;
    }

    // Update existing particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];

      // Update lifetime
      particle.life -= deltaTime;

      // Remove dead particles
      if (particle.life <= 0) {
        this.removeParticle(i);
        continue;
      }

      // Apply velocity and gravity (modified by drift speed)
      particle.velocityX += config.gravity.x * deltaTime * driftSpeed;
      particle.velocityY += config.gravity.y * deltaTime * driftSpeed;

      particle.sprite.x += particle.velocityX * deltaTime * driftSpeed;
      particle.sprite.y += particle.velocityY * deltaTime * driftSpeed;

      // Fade out near end of life
      const lifeRatio = particle.life / particle.maxLife;
      particle.sprite.alpha =
        Math.min(1, lifeRatio * 2) *
        (config.alpha.min + (config.alpha.max - config.alpha.min) * Math.random());

      // Cull particles outside viewport
      if (
        particle.sprite.x < -100 ||
        particle.sprite.x > this.viewportWidth + 100 ||
        particle.sprite.y > this.viewportHeight + 100
      ) {
        this.removeParticle(i);
      }
    }
  }

  /**
   * Emit a new particle
   */
  private emitParticle(config: ParticleConfig): void {
    // Get sprite from pool or create new
    let sprite: PIXI.Sprite | undefined = this.particlePool.pop();

    if (!sprite) {
      const texture = this.particleTextures.get(this.currentWeather);
      if (!texture) {
        console.error(
          `[WeatherLayer] Cannot emit particle - no texture for ${this.currentWeather}`
        );
        return;
      }
      sprite = new PIXI.Sprite(texture);
      sprite.anchor.set(0.5);
      this.particleContainer.addChild(sprite);
    }

    // Random position at top of viewport (or slightly above)
    const x = Math.random() * this.viewportWidth;
    const y = -50 + Math.random() * -100; // Start above viewport

    // Random velocity
    const velocityX =
      config.velocity.x.min + Math.random() * (config.velocity.x.max - config.velocity.x.min);
    const velocityY =
      config.velocity.y.min + Math.random() * (config.velocity.y.max - config.velocity.y.min);

    // Random scale
    const scale = config.scale.min + Math.random() * (config.scale.max - config.scale.min);

    // Setup sprite
    sprite.x = x;
    sprite.y = y;
    sprite.scale.set(scale);
    sprite.alpha = config.alpha.min + Math.random() * (config.alpha.max - config.alpha.min);
    sprite.visible = true;

    // Create particle
    const particle: Particle = {
      sprite,
      velocityX,
      velocityY,
      life: config.lifespan,
      maxLife: config.lifespan,
    };

    this.particles.push(particle);
  }

  /**
   * Remove particle and return sprite to pool
   */
  private removeParticle(index: number): void {
    const particle = this.particles[index];
    particle.sprite.visible = false;
    this.particlePool.push(particle.sprite);
    this.particles.splice(index, 1);
  }

  /**
   * Update fog scroll animation
   */
  private updateFog(deltaTime: number): void {
    if (!this.fogSprite) return;

    const config = FOG_CONFIGS[this.currentWeather];
    if (!config) return;

    // Get drift speed multiplier from game state
    const driftSpeed = gameState.getWeatherDriftSpeed();

    // Scroll fog horizontally using tilePosition (seamless wrapping, modified by drift speed)
    this.fogSprite.tilePosition.x += config.scrollSpeed * deltaTime * driftSpeed;

    // Optional: Wrap tilePosition to prevent floating-point precision issues over time
    if (Math.abs(this.fogSprite.tilePosition.x) > 10000) {
      this.fogSprite.tilePosition.x = 0;
    }
  }

  /**
   * Clear all particles
   */
  private clearParticles(): void {
    // Return all particles to pool
    for (const particle of this.particles) {
      particle.sprite.visible = false;
      this.particlePool.push(particle.sprite);
    }
    this.particles = [];
    this.timeSinceLastEmit = 0;

    // Destroy pool sprites
    for (const sprite of this.particlePool) {
      sprite.destroy();
    }
    this.particlePool = [];

    // Clear container
    this.particleContainer.removeChildren();
  }

  /**
   * Clear fog overlay and its edge mask
   */
  private clearFog(): void {
    if (this.fogSprite) {
      this.fogSprite.mask = null;
      this.fogSprite.destroy();
      this.fogSprite = null;
    }
    if (this.fogMaskSprite) {
      this.fogMaskSprite.destroy();
      this.fogMaskSprite = null;
    }
    if (this.fogMaskTexture) {
      this.fogMaskTexture.destroy(true);
      this.fogMaskTexture = null;
    }
    this.fogContainer.removeChildren();
  }

  /**
   * Update viewport size (for window resize)
   */
  resize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;

    // Recreate fog if active (mask will be regenerated via setupFog)
    if (this.currentWeather === 'fog' || this.currentWeather === 'mist') {
      const currentAlpha = this.fogSprite?.alpha ?? 1;
      this.clearFog();
      this.setupFog(this.currentWeather as 'fog' | 'mist');
      // Preserve transition alpha if mid-transition
      if (this.fogSprite && this.transitionState !== 'idle') {
        this.fogSprite.alpha = currentAlpha;
      }
    }
  }

  /**
   * Get the container for adding to stage
   */
  getContainer(): PIXI.Container {
    return this.container;
  }

  /**
   * Get current weather
   */
  getWeather(): WeatherType {
    return this.currentWeather;
  }

  /**
   * Show or hide weather effects
   * Use this to hide weather in indoor locations
   */
  setVisible(visible: boolean): void {
    this.container.visible = visible;
  }

  /**
   * Weather layer doesn't follow camera (fullscreen effect)
   * This method exists for consistency with other layers but does nothing
   */
  updateCamera(_cameraX: number, _cameraY: number): void {
    // Weather is viewport-relative, doesn't follow camera
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.clearParticles();
    this.clearFog();
    this.particleTextures.clear();
    this.fogTextures.clear();
    this.container.destroy({ children: true });
  }
}
