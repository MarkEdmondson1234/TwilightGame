/**
 * WeatherLayer - PixiJS-based weather effects
 *
 * Renders particle-based weather (rain, snow, storm, cherry blossoms)
 * and overlay-based weather (fog, mist) using WebGL.
 *
 * Features:
 * - Particle systems with physics simulation
 * - Fog/mist overlays with scrolling animation
 * - Efficient viewport-based particle culling
 * - GPU-accelerated rendering
 * - Smooth weather transitions
 *
 * Usage:
 *   const weatherLayer = new WeatherLayer(viewportWidth, viewportHeight);
 *   app.stage.addChild(weatherLayer.getContainer());
 *   weatherLayer.setWeather('rain');
 *   // In game loop:
 *   weatherLayer.update(deltaTime);
 */

import * as PIXI from 'pixi.js';
import { TILE_SIZE } from '../../constants';
import { textureManager } from '../TextureManager';
import { particleAssets } from '../../assets';
import { gameState } from '../../GameState';
import {
  WeatherType,
  PARTICLE_CONFIGS,
  FOG_CONFIGS,
  ParticleConfig,
} from '../../data/weatherConfig';

interface Particle {
  sprite: PIXI.Sprite;
  velocityX: number;
  velocityY: number;
  life: number;
  maxLife: number;
}

export class WeatherLayer {
  private container: PIXI.Container;
  private particleContainer: PIXI.Container;
  private fogContainer: PIXI.Container;

  private currentWeather: WeatherType = 'clear';
  private particles: Particle[] = [];
  private particlePool: PIXI.Sprite[] = [];

  private fogSprite: PIXI.TilingSprite | null = null;

  private viewportWidth: number;
  private viewportHeight: number;

  private particleTextures: Map<WeatherType, PIXI.Texture> = new Map();
  private fogTextures: Map<WeatherType, PIXI.Texture> = new Map();

  private timeSinceLastEmit: number = 0;

  constructor(viewportWidth: number, viewportHeight: number) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;

    // Main container
    this.container = new PIXI.Container();
    this.container.sortableChildren = true;

    // Particle container (for rain, snow, etc.)
    this.particleContainer = new PIXI.Container();
    this.particleContainer.zIndex = 1000; // Above everything except UI
    this.container.addChild(this.particleContainer);

    // Fog container (for fog, mist overlays)
    this.fogContainer = new PIXI.Container();
    this.fogContainer.zIndex = 999; // Behind particles
    this.container.addChild(this.fogContainer);
  }

  /**
   * Load weather textures
   */
  async loadTextures(): Promise<void> {
    console.log('[WeatherLayer] Loading weather textures...');

    try {
      // Load particle textures using proper asset URLs (includes base path)
      console.log('[WeatherLayer] Requesting rain texture from textureManager...');
      console.log('[WeatherLayer] Rain asset URL:', particleAssets.rain);
      const rainTexture = await textureManager.loadTexture(
        'rain_particle',
        particleAssets.rain
      );
      console.log('[WeatherLayer] Rain texture result:', rainTexture ? 'SUCCESS' : 'NULL');

      console.log('[WeatherLayer] Requesting snow texture from textureManager...');
      console.log('[WeatherLayer] Snow asset URL:', particleAssets.snow);
      const snowTexture = await textureManager.loadTexture(
        'snow_particle',
        particleAssets.snow
      );
      console.log('[WeatherLayer] Snow texture result:', snowTexture ? 'SUCCESS' : 'NULL');

      if (rainTexture) {
        this.particleTextures.set('rain', rainTexture);
        this.particleTextures.set('storm', rainTexture); // Reuse rain for storm
        console.log('[WeatherLayer] ✓ Rain/Storm textures loaded');
      } else {
        console.error('[WeatherLayer] ✗ Failed to load rain texture');
      }

      if (snowTexture) {
        this.particleTextures.set('snow', snowTexture);
        this.particleTextures.set('cherry_blossoms', snowTexture); // Placeholder for cherry blossoms
        console.log('[WeatherLayer] ✓ Snow/Cherry Blossom textures loaded');
      } else {
        console.error('[WeatherLayer] ✗ Failed to load snow texture');
      }

      // Load fog textures using proper asset URLs (includes base path)
      console.log('[WeatherLayer] Requesting fog texture...');
      console.log('[WeatherLayer] Fog asset URL:', particleAssets.fog);
      const fogTexture = await textureManager.loadTexture(
        'fog_overlay',
        particleAssets.fog
      );
      console.log('[WeatherLayer] Fog texture result:', fogTexture ? 'SUCCESS' : 'NULL');

      console.log('[WeatherLayer] Requesting mist texture...');
      console.log('[WeatherLayer] Mist asset URL:', particleAssets.mist);
      const mistTexture = await textureManager.loadTexture(
        'mist_overlay',
        particleAssets.mist
      );
      console.log('[WeatherLayer] Mist texture result:', mistTexture ? 'SUCCESS' : 'NULL');

      if (fogTexture) {
        this.fogTextures.set('fog', fogTexture);
        console.log('[WeatherLayer] ✓ Fog texture loaded');
      } else {
        console.error('[WeatherLayer] ✗ Failed to load fog texture');
      }

      if (mistTexture) {
        this.fogTextures.set('mist', mistTexture);
        console.log('[WeatherLayer] ✓ Mist texture loaded');
      } else {
        console.error('[WeatherLayer] ✗ Failed to load mist texture');
      }

      console.log('[WeatherLayer] Texture loading complete. Available textures:',
        Array.from(this.particleTextures.keys()),
        'fog textures:',
        Array.from(this.fogTextures.keys())
      );
    } catch (error) {
      console.error('[WeatherLayer] Error loading textures:', error);
    }
  }

  /**
   * Set current weather and update effects
   */
  setWeather(weather: WeatherType): void {
    if (this.currentWeather === weather) {
      console.log(`[WeatherLayer] Weather already set to ${weather}, skipping`);
      return;
    }

    console.log(`[WeatherLayer] Changing weather from ${this.currentWeather} to ${weather}`);
    this.currentWeather = weather;

    // Clear existing effects
    this.clearParticles();
    this.clearFog();

    // Setup new effects
    if (weather === 'fog' || weather === 'mist') {
      console.log(`[WeatherLayer] Setting up ${weather} overlay`);
      this.setupFog(weather);
    } else if (weather !== 'clear') {
      console.log(`[WeatherLayer] Setting up ${weather} particles`);
      this.setupParticles(weather);
    } else {
      console.log(`[WeatherLayer] Clearing all weather effects (clear weather)`);
    }
  }

  /**
   * Setup particle system for weather type
   */
  private setupParticles(weather: WeatherType): void {
    const config = PARTICLE_CONFIGS[weather];
    if (!config) {
      console.warn(`[WeatherLayer] No particle config for weather: ${weather}`);
      return;
    }

    // Pre-create particle pool for performance
    const texture = this.particleTextures.get(weather);
    if (!texture) {
      console.error(`[WeatherLayer] No texture loaded for weather: ${weather}. Available textures:`, Array.from(this.particleTextures.keys()));
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

    console.log(`[WeatherLayer] ✓ Created particle pool: ${config.maxParticles} sprites for ${weather}`);
    console.log(`[WeatherLayer] Particle container has ${this.particleContainer.children.length} children`);
  }

  /**
   * Setup fog overlay for weather type
   */
  private setupFog(weather: 'fog' | 'mist'): void {
    const config = FOG_CONFIGS[weather];
    const texture = this.fogTextures.get(weather);

    if (!config || !texture) {
      console.warn(`[WeatherLayer] No fog config or texture for weather: ${weather}`);
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

    console.log(`[WeatherLayer] Setup fog overlay for ${weather} using TilingSprite`);
  }

  /**
   * Update weather effects (called each frame)
   */
  update(deltaTime: number): void {
    if (this.currentWeather === 'clear') return;

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
   * Update particle systems
   */
  private updateParticles(deltaTime: number): void {
    const config = PARTICLE_CONFIGS[this.currentWeather];
    if (!config) return;

    // Get drift speed multiplier from game state
    const driftSpeed = gameState.getWeatherDriftSpeed();

    // Emit new particles
    this.timeSinceLastEmit += deltaTime;
    const emitInterval = 1 / config.emitRate;

    let emittedCount = 0;
    while (this.timeSinceLastEmit >= emitInterval && this.particles.length < config.maxParticles) {
      this.emitParticle(config);
      this.timeSinceLastEmit -= emitInterval;
      emittedCount++;
    }

    // Log particle count periodically (every 60 frames)
    if (Math.random() < 0.016) { // ~1% chance per frame = ~1 per second at 60fps
      console.log(`[WeatherLayer] Active particles: ${this.particles.length}/${config.maxParticles} (emitted ${emittedCount} this frame)`);
    }

    // Update existing particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];

      // Update lifetime
      particle.life -= deltaTime;

      // Remove dead particles
      if (particle.life <= 0) {
        this.removeParticle(i, 'lifetime expired');
        continue;
      }

      // Apply velocity and gravity (modified by drift speed)
      particle.velocityX += config.gravity.x * deltaTime * driftSpeed;
      particle.velocityY += config.gravity.y * deltaTime * driftSpeed;

      particle.sprite.x += particle.velocityX * deltaTime * driftSpeed;
      particle.sprite.y += particle.velocityY * deltaTime * driftSpeed;

      // Fade out near end of life
      const lifeRatio = particle.life / particle.maxLife;
      particle.sprite.alpha = Math.min(1, lifeRatio * 2) *
        (config.alpha.min + (config.alpha.max - config.alpha.min) * Math.random());

      // Cull particles outside viewport
      if (
        particle.sprite.x < -100 ||
        particle.sprite.x > this.viewportWidth + 100 ||
        particle.sprite.y > this.viewportHeight + 100
      ) {
        this.removeParticle(i, 'outside viewport bounds');
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
        console.error(`[WeatherLayer] Cannot emit particle - no texture for ${this.currentWeather}`);
        return;
      }
      sprite = new PIXI.Sprite(texture);
      sprite.anchor.set(0.5);
      this.particleContainer.addChild(sprite);
      console.log('[WeatherLayer] Created new sprite (pool was empty)');
    }

    // Random position at top of viewport (or slightly above)
    const x = Math.random() * this.viewportWidth;
    const y = -50 + Math.random() * -100; // Start above viewport

    // Random velocity
    const velocityX = config.velocity.x.min + Math.random() * (config.velocity.x.max - config.velocity.x.min);
    const velocityY = config.velocity.y.min + Math.random() * (config.velocity.y.max - config.velocity.y.min);

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

    // Log first few particles for debugging
    if (this.particles.length <= 5) {
      console.log(`[WeatherLayer] Emitted particle #${this.particles.length}: pos=(${x.toFixed(0)},${y.toFixed(0)}), vel=(${velocityX.toFixed(0)},${velocityY.toFixed(0)}), life=${config.lifespan}s, visible=${sprite.visible}`);
    }
  }

  /**
   * Remove particle and return sprite to pool
   */
  private removeParticle(index: number, reason?: string): void {
    const particle = this.particles[index];

    // Log first few removals for debugging
    if (this.particles.length <= 10) {
      console.log(`[WeatherLayer] Removing particle #${index}: reason=${reason || 'unknown'}, pos=(${particle.sprite.x.toFixed(0)},${particle.sprite.y.toFixed(0)}), life=${particle.life.toFixed(2)}s`);
    }

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
   * Clear fog overlay
   */
  private clearFog(): void {
    if (this.fogSprite) {
      this.fogSprite.destroy();
      this.fogSprite = null;
    }
    this.fogContainer.removeChildren();
  }

  /**
   * Update viewport size (for window resize)
   */
  resize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;

    // Recreate fog if active
    if (this.currentWeather === 'fog' || this.currentWeather === 'mist') {
      this.clearFog();
      this.setupFog(this.currentWeather);
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
    console.log(`[WeatherLayer] Visibility set to ${visible}`);
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
