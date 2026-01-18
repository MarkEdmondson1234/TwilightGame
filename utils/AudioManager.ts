/**
 * AudioManager - Single Source of Truth for all game audio
 *
 * Features:
 * - Web Audio API-based playback (native, no dependencies)
 * - Sound category system (music, ambient, sfx, ui)
 * - Volume controls per category with persistence
 * - Sound pooling for frequently played sounds (footsteps)
 * - Mobile Safari compatibility (auto-resume on user gesture)
 * - Async loading with deduplication
 * - Music crossfade between maps
 * - Settings persistence via localStorage
 *
 * Usage:
 *   await audioManager.loadBatch(audioAssets);
 *   audioManager.playSfx('footstep_grass');
 *   audioManager.playMusic('village_day', { fadeIn: 2000 });
 */

import { TileType } from '../types/core';

// Sound categories with individual volume control
export type SoundCategory = 'master' | 'music' | 'ambient' | 'sfx' | 'ui';

// Surface types for footstep variation
export type SurfaceType = 'grass' | 'stone' | 'wood' | 'carpet' | 'water' | 'soil';

// Audio settings interface for persistence
export interface AudioSettings {
  masterVolume: number; // 0.0 - 1.0
  musicVolume: number; // 0.0 - 1.0
  ambientVolume: number; // 0.0 - 1.0
  sfxVolume: number; // 0.0 - 1.0
  uiVolume: number; // 0.0 - 1.0
  muted: boolean;
}

// Audio effects interface for real-time manipulation
export interface AudioEffects {
  // Low-pass filter (muffle sounds, underwater effect)
  lowPassEnabled: boolean;
  lowPassFrequency: number; // 20-20000 Hz (default: 20000 = no effect)
  lowPassQ: number; // Quality factor 0.1-20 (default: 1)

  // High-pass filter (tinny/distant effect)
  highPassEnabled: boolean;
  highPassFrequency: number; // 20-20000 Hz (default: 20 = no effect)
  highPassQ: number; // Quality factor 0.1-20 (default: 1)

  // Reverb (room ambiance) - simple delay-based
  reverbEnabled: boolean;
  reverbMix: number; // 0.0-1.0 wet/dry mix (default: 0 = no reverb)
  reverbDelay: number; // Delay time in seconds 0.01-1.0 (default: 0.3)
  reverbDecay: number; // Feedback 0.0-0.9 (default: 0.4)

  // Pitch shift (global pitch modifier)
  pitchShift: number; // 0.5-2.0 (default: 1.0 = normal)
}

// Sound asset definition for loading
export interface AudioAssetConfig {
  url: string;
  category?: SoundCategory;
  loop?: boolean;
  baseVolume?: number;
}

// Sound metadata for loaded sounds
interface SoundData {
  buffer: AudioBuffer;
  category: SoundCategory;
  loop: boolean;
  baseVolume: number;
}

// Active sound instance for tracking/stopping
interface ActiveSound {
  id: string;
  source: AudioBufferSourceNode;
  gainNode: GainNode;
  category: SoundCategory;
  startTime: number;
}

// Music track for crossfading
interface MusicTrack {
  source: AudioBufferSourceNode;
  gainNode: GainNode;
  id: string;
}

// Map TileType to SurfaceType for footstep sounds
export const TILE_TO_SURFACE: Partial<Record<TileType, SurfaceType>> = {
  // Outdoor - grass
  [TileType.GRASS]: 'grass',
  [TileType.TUFT]: 'grass',
  [TileType.TUFT_SPARSE]: 'grass',

  // Outdoor - stone
  [TileType.PATH]: 'stone',
  [TileType.ROCK]: 'stone',

  // Water
  [TileType.WATER]: 'water',
  [TileType.WATER_CENTER]: 'water',
  [TileType.WATER_LEFT]: 'water',
  [TileType.WATER_RIGHT]: 'water',
  [TileType.WATER_TOP]: 'water',
  [TileType.WATER_BOTTOM]: 'water',

  // Indoor - wood
  [TileType.FLOOR]: 'wood',
  [TileType.FLOOR_LIGHT]: 'wood',
  [TileType.FLOOR_DARK]: 'wood',

  // Indoor - carpet
  [TileType.CARPET]: 'carpet',
  [TileType.RUG]: 'carpet',

  // Farming - soil
  [TileType.SOIL_FALLOW]: 'soil',
  [TileType.SOIL_TILLED]: 'soil',
  [TileType.SOIL_PLANTED]: 'soil',
  [TileType.SOIL_WATERED]: 'soil',
};

// Default effect settings (no effects applied)
const DEFAULT_EFFECTS: AudioEffects = {
  lowPassEnabled: false,
  lowPassFrequency: 20000,
  lowPassQ: 1,
  highPassEnabled: false,
  highPassFrequency: 20,
  highPassQ: 1,
  reverbEnabled: false,
  reverbMix: 0,
  reverbDelay: 0.3,
  reverbDecay: 0.4,
  pitchShift: 1.0,
};

class AudioManager {
  // Audio context (lazy initialised for mobile compatibility)
  private context: AudioContext | null = null;

  // Category gain nodes
  private masterGain: GainNode | null = null;
  private categoryGains: Map<SoundCategory, GainNode> = new Map();

  // Effect nodes (master chain)
  private lowPassFilter: BiquadFilterNode | null = null;
  private highPassFilter: BiquadFilterNode | null = null;
  private reverbDelay: DelayNode | null = null;
  private reverbFeedback: GainNode | null = null;
  private reverbWetGain: GainNode | null = null;
  private reverbDryGain: GainNode | null = null;

  // Sound cache and loading
  private sounds: Map<string, SoundData> = new Map();
  private loading: Map<string, Promise<AudioBuffer>> = new Map();

  // Active sounds for tracking/stopping
  private activeSounds: Map<string, ActiveSound> = new Map();
  private activeId = 0;

  // Music state (for crossfading)
  private currentMusic: MusicTrack | null = null;

  // Ambient sounds tracking
  private activeAmbients: Map<string, string> = new Map(); // key -> activeSound id

  // Settings
  private settings: AudioSettings = {
    masterVolume: 0.7,
    musicVolume: 0.25,
    ambientVolume: 0.6,
    sfxVolume: 0.8,
    uiVolume: 0.7,
    muted: false,
  };

  // Effects settings
  private effects: AudioEffects = { ...DEFAULT_EFFECTS };

  // Mobile compatibility
  private isResumed = false;

  // Storage key for settings
  private readonly STORAGE_KEY = 'twilight_audio_settings';

  /**
   * Initialise the audio context (must be called after user gesture on mobile)
   */
  async initialise(): Promise<void> {
    if (this.context) return;

    try {
      // Create audio context (with webkit prefix for older Safari)
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.context = new AudioContextClass();

      // Create master gain node
      this.masterGain = this.context.createGain();

      // === Create effect chain ===
      // Audio graph: categoryGains → lowPass → highPass → dry/wet split → masterGain → destination
      //                                                    ↓
      //                                              reverbDelay → reverbFeedback (loop)
      //                                                    ↓
      //                                                 wetGain

      // Low-pass filter (muffle/underwater effect)
      this.lowPassFilter = this.context.createBiquadFilter();
      this.lowPassFilter.type = 'lowpass';
      this.lowPassFilter.frequency.value = this.effects.lowPassFrequency;
      this.lowPassFilter.Q.value = this.effects.lowPassQ;

      // High-pass filter (tinny/distant effect)
      this.highPassFilter = this.context.createBiquadFilter();
      this.highPassFilter.type = 'highpass';
      this.highPassFilter.frequency.value = this.effects.highPassFrequency;
      this.highPassFilter.Q.value = this.effects.highPassQ;

      // Reverb (delay-based)
      this.reverbDelay = this.context.createDelay(2.0);
      this.reverbDelay.delayTime.value = this.effects.reverbDelay;

      this.reverbFeedback = this.context.createGain();
      this.reverbFeedback.gain.value = this.effects.reverbDecay;

      this.reverbWetGain = this.context.createGain();
      this.reverbWetGain.gain.value = this.effects.reverbMix;

      this.reverbDryGain = this.context.createGain();
      this.reverbDryGain.gain.value = 1.0;

      // Connect effect chain
      // Filters → dry/wet split
      this.lowPassFilter.connect(this.highPassFilter);

      // Dry path: filters → dryGain → masterGain
      this.highPassFilter.connect(this.reverbDryGain);
      this.reverbDryGain.connect(this.masterGain);

      // Wet path: filters → delay → feedback loop → wetGain → masterGain
      this.highPassFilter.connect(this.reverbDelay);
      this.reverbDelay.connect(this.reverbFeedback);
      this.reverbFeedback.connect(this.reverbDelay); // Feedback loop
      this.reverbDelay.connect(this.reverbWetGain);
      this.reverbWetGain.connect(this.masterGain);

      // Master to destination
      this.masterGain.connect(this.context.destination);

      // Create category gain nodes (connect to effect chain input)
      const categories: SoundCategory[] = ['music', 'ambient', 'sfx', 'ui'];
      for (const category of categories) {
        const gain = this.context.createGain();
        gain.connect(this.lowPassFilter); // Connect to effect chain
        this.categoryGains.set(category, gain);
      }

      // Load saved settings
      this.loadSettings();
      this.applySettings();

      console.log('[AudioManager] Initialised successfully with effects chain');
    } catch (error) {
      console.error('[AudioManager] Failed to initialise:', error);
    }
  }

  /**
   * Resume audio context (required for mobile Safari)
   * Call this on first user interaction (touch/click)
   */
  async resume(): Promise<void> {
    if (!this.context) {
      await this.initialise();
    }

    if (this.context && this.context.state === 'suspended') {
      try {
        await this.context.resume();
        this.isResumed = true;
        console.log('[AudioManager] Audio context resumed');
      } catch (error) {
        console.error('[AudioManager] Failed to resume:', error);
      }
    }
  }

  /**
   * Check if audio is ready to play
   */
  isReady(): boolean {
    return this.context !== null && this.context.state === 'running';
  }

  /**
   * Load a single sound file
   */
  async loadSound(
    key: string,
    url: string,
    options: { category?: SoundCategory; loop?: boolean; baseVolume?: number } = {}
  ): Promise<AudioBuffer | null> {
    if (!this.context) await this.initialise();
    if (!this.context) return null;

    // Return cached sound
    if (this.sounds.has(key)) {
      return this.sounds.get(key)!.buffer;
    }

    // Return existing promise if loading
    if (this.loading.has(key)) {
      return this.loading.get(key)!;
    }

    // Start loading
    const promise = fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.arrayBuffer();
      })
      .then((arrayBuffer) => this.context!.decodeAudioData(arrayBuffer))
      .then((buffer) => {
        this.sounds.set(key, {
          buffer,
          category: options.category || 'sfx',
          loop: options.loop || false,
          baseVolume: options.baseVolume ?? 1.0,
        });
        this.loading.delete(key);
        return buffer;
      })
      .catch((error) => {
        console.error(`[AudioManager] Failed to load ${key}:`, error);
        this.loading.delete(key);
        throw error;
      });

    this.loading.set(key, promise);
    return promise;
  }

  /**
   * Batch load multiple sounds
   */
  async loadBatch(assets: Record<string, AudioAssetConfig>): Promise<void> {
    const assetCount = Object.keys(assets).length;
    if (assetCount === 0) {
      console.log('[AudioManager] No audio assets to load');
      return;
    }

    console.log(`[AudioManager] Loading ${assetCount} sounds...`);
    const startTime = performance.now();

    const promises = Object.entries(assets).map(
      ([key, config]) =>
        this.loadSound(key, config.url, {
          category: config.category,
          loop: config.loop,
          baseVolume: config.baseVolume,
        }).catch(() => null) // Don't fail entire batch on single error
    );

    await Promise.all(promises);

    const loadTime = (performance.now() - startTime).toFixed(0);
    console.log(`[AudioManager] Loaded ${this.sounds.size} sounds in ${loadTime}ms`);
  }

  /**
   * Play a sound effect (one-shot)
   */
  playSfx(key: string, options: { volume?: number; pitch?: number } = {}): string | null {
    if (!this.context || !this.sounds.has(key) || this.settings.muted) return null;

    const sound = this.sounds.get(key)!;
    const source = this.context.createBufferSource();
    source.buffer = sound.buffer;

    // Apply pitch variation if specified
    if (options.pitch) {
      source.playbackRate.value = options.pitch;
    }

    // Create gain node for this sound
    const gainNode = this.context.createGain();
    const volume = (options.volume ?? 1.0) * sound.baseVolume;
    gainNode.gain.value = volume;

    // Connect through category gain
    const categoryGain = this.categoryGains.get(sound.category);
    if (categoryGain) {
      source.connect(gainNode);
      gainNode.connect(categoryGain);
    }

    // Track active sound
    const id = `sfx_${++this.activeId}`;
    const activeSound: ActiveSound = {
      id,
      source,
      gainNode,
      category: sound.category,
      startTime: this.context.currentTime,
    };
    this.activeSounds.set(id, activeSound);

    // Clean up when done
    source.onended = () => {
      this.activeSounds.delete(id);
    };

    source.start();
    return id;
  }

  /**
   * Play footstep sound with surface variation
   */
  playFootstep(surface: SurfaceType): void {
    const key = `footstep_${surface}`;

    // Check if sound exists, fallback to grass
    const actualKey = this.sounds.has(key) ? key : 'footstep_grass';
    if (!this.sounds.has(actualKey)) return;

    // Add slight pitch variation for naturalness
    const pitch = 0.9 + Math.random() * 0.2; // 0.9 - 1.1

    this.playSfx(actualKey, { pitch });
  }

  /**
   * Get surface type from tile type
   */
  getSurfaceFromTile(tileType: TileType): SurfaceType {
    return TILE_TO_SURFACE[tileType] ?? 'grass';
  }

  /**
   * Play music with optional crossfade
   */
  playMusic(key: string, options: { fadeIn?: number; crossfade?: boolean } = {}): void {
    if (!this.context || !this.sounds.has(key) || this.settings.muted) return;

    const sound = this.sounds.get(key)!;
    const fadeInMs = options.fadeIn ?? 1000;
    const crossfade = options.crossfade ?? true;

    // Don't restart if same music is already playing
    if (this.currentMusic && this.currentMusic.id === key) {
      return;
    }

    // Create new music track
    const source = this.context.createBufferSource();
    source.buffer = sound.buffer;
    source.loop = true;

    const gainNode = this.context.createGain();
    gainNode.gain.value = 0; // Start silent for fade in

    const musicGain = this.categoryGains.get('music');
    if (musicGain) {
      source.connect(gainNode);
      gainNode.connect(musicGain);
    }

    const newTrack: MusicTrack = { source, gainNode, id: key };

    // Crossfade if there's current music
    if (this.currentMusic && crossfade) {
      this.crossfadeMusic(this.currentMusic, newTrack, fadeInMs);
    } else {
      // Stop current music immediately if not crossfading
      if (this.currentMusic) {
        try {
          this.currentMusic.source.stop();
        } catch {
          // May already be stopped
        }
      }
      // Simple fade in
      source.start();
      gainNode.gain.linearRampToValueAtTime(1.0, this.context.currentTime + fadeInMs / 1000);
      this.currentMusic = newTrack;
    }

    console.log(`[AudioManager] Playing music: ${key}`);
  }

  /**
   * Crossfade between two music tracks
   */
  private crossfadeMusic(from: MusicTrack, to: MusicTrack, durationMs: number): void {
    if (!this.context) return;

    const now = this.context.currentTime;
    const duration = durationMs / 1000;

    // Fade out current
    from.gainNode.gain.linearRampToValueAtTime(0, now + duration);
    setTimeout(() => {
      try {
        from.source.stop();
      } catch {
        // May already be stopped
      }
    }, durationMs);

    // Fade in new
    to.source.start();
    to.gainNode.gain.linearRampToValueAtTime(1.0, now + duration);

    this.currentMusic = to;
  }

  /**
   * Stop current music
   */
  stopMusic(fadeOutMs: number = 1000): void {
    if (!this.context || !this.currentMusic) return;

    const track = this.currentMusic;
    const duration = fadeOutMs / 1000;

    track.gainNode.gain.linearRampToValueAtTime(0, this.context.currentTime + duration);
    setTimeout(() => {
      try {
        track.source.stop();
      } catch {
        // May already be stopped
      }
    }, fadeOutMs);

    this.currentMusic = null;
    console.log('[AudioManager] Music stopped');
  }

  /**
   * Play ambient sound (looping background)
   */
  playAmbient(key: string): string | null {
    if (!this.context || !this.sounds.has(key) || this.settings.muted) return null;

    // Check if this ambient is already playing
    if (this.activeAmbients.has(key)) {
      return this.activeAmbients.get(key)!;
    }

    const sound = this.sounds.get(key)!;
    const source = this.context.createBufferSource();
    source.buffer = sound.buffer;
    source.loop = true;

    const gainNode = this.context.createGain();
    gainNode.gain.value = sound.baseVolume;

    const ambientGain = this.categoryGains.get('ambient');
    if (ambientGain) {
      source.connect(gainNode);
      gainNode.connect(ambientGain);
    }

    const id = `ambient_${++this.activeId}`;
    this.activeSounds.set(id, {
      id,
      source,
      gainNode,
      category: 'ambient',
      startTime: this.context.currentTime,
    });

    // Track this ambient by key
    this.activeAmbients.set(key, id);

    source.onended = () => {
      this.activeSounds.delete(id);
      this.activeAmbients.delete(key);
    };

    source.start();
    console.log(`[AudioManager] Playing ambient: ${key}`);
    return id;
  }

  /**
   * Stop a specific ambient sound by key
   */
  stopAmbient(key: string, fadeOutMs: number = 1000): void {
    const id = this.activeAmbients.get(key);
    if (id) {
      this.stopSound(id, fadeOutMs);
      this.activeAmbients.delete(key);
    }
  }

  /**
   * Stop all ambient sounds
   */
  stopAllAmbients(fadeOutMs: number = 1000): void {
    for (const [key, id] of this.activeAmbients) {
      this.stopSound(id, fadeOutMs);
    }
    this.activeAmbients.clear();
  }

  /**
   * Play UI sound
   */
  playUI(key: string): void {
    this.playSfx(key, { volume: 1.0 });
  }

  /**
   * Stop a specific active sound
   */
  stopSound(id: string, fadeOutMs: number = 0): void {
    const active = this.activeSounds.get(id);
    if (!active || !this.context) return;

    if (fadeOutMs > 0) {
      active.gainNode.gain.linearRampToValueAtTime(0, this.context.currentTime + fadeOutMs / 1000);
      setTimeout(() => {
        try {
          active.source.stop();
        } catch {
          // May already be stopped
        }
        this.activeSounds.delete(id);
      }, fadeOutMs);
    } else {
      try {
        active.source.stop();
      } catch {
        // May already be stopped
      }
      this.activeSounds.delete(id);
    }
  }

  /**
   * Stop all sounds in a category
   */
  stopCategory(category: SoundCategory, fadeOutMs: number = 0): void {
    for (const [id, active] of this.activeSounds) {
      if (active.category === category) {
        this.stopSound(id, fadeOutMs);
      }
    }
  }

  /**
   * Stop all sounds
   */
  stopAll(fadeOutMs: number = 0): void {
    this.stopMusic(fadeOutMs);
    this.stopAllAmbients(fadeOutMs);
    for (const id of this.activeSounds.keys()) {
      this.stopSound(id, fadeOutMs);
    }
  }

  // === Volume Control ===

  setVolume(category: SoundCategory, volume: number): void {
    volume = Math.max(0, Math.min(1, volume));

    if (category === 'master') {
      this.settings.masterVolume = volume;
      if (this.masterGain) {
        this.masterGain.gain.value = this.settings.muted ? 0 : volume;
      }
    } else {
      // Set volume for specific category
      switch (category) {
        case 'music':
          this.settings.musicVolume = volume;
          break;
        case 'ambient':
          this.settings.ambientVolume = volume;
          break;
        case 'sfx':
          this.settings.sfxVolume = volume;
          break;
        case 'ui':
          this.settings.uiVolume = volume;
          break;
      }
      const gain = this.categoryGains.get(category);
      if (gain) {
        gain.gain.value = volume;
      }
    }

    this.saveSettings();
  }

  getVolume(category: SoundCategory): number {
    switch (category) {
      case 'master':
        return this.settings.masterVolume;
      case 'music':
        return this.settings.musicVolume;
      case 'ambient':
        return this.settings.ambientVolume;
      case 'sfx':
        return this.settings.sfxVolume;
      case 'ui':
        return this.settings.uiVolume;
    }
  }

  setMuted(muted: boolean): void {
    this.settings.muted = muted;
    if (this.masterGain) {
      this.masterGain.gain.value = muted ? 0 : this.settings.masterVolume;
    }
    this.saveSettings();
    console.log(`[AudioManager] ${muted ? 'Muted' : 'Unmuted'}`);
  }

  isMuted(): boolean {
    return this.settings.muted;
  }

  toggleMute(): boolean {
    this.setMuted(!this.settings.muted);
    return this.settings.muted;
  }

  // === Audio Effects Control ===

  /**
   * Get current effects settings
   */
  getEffects(): Readonly<AudioEffects> {
    return { ...this.effects };
  }

  /**
   * Set low-pass filter (muffle/underwater effect)
   * @param enabled Enable/disable the filter
   * @param frequency Cutoff frequency in Hz (20-20000, lower = more muffled)
   * @param q Quality factor (0.1-20, higher = more resonance)
   */
  setLowPassFilter(enabled: boolean, frequency?: number, q?: number): void {
    this.effects.lowPassEnabled = enabled;
    if (frequency !== undefined) {
      this.effects.lowPassFrequency = Math.max(20, Math.min(20000, frequency));
    }
    if (q !== undefined) {
      this.effects.lowPassQ = Math.max(0.1, Math.min(20, q));
    }

    if (this.lowPassFilter) {
      // When disabled, set to max frequency (no filtering)
      const actualFrequency = enabled ? this.effects.lowPassFrequency : 20000;
      this.lowPassFilter.frequency.value = actualFrequency;
      this.lowPassFilter.Q.value = this.effects.lowPassQ;
    }
  }

  /**
   * Set high-pass filter (tinny/distant effect)
   * @param enabled Enable/disable the filter
   * @param frequency Cutoff frequency in Hz (20-20000, higher = thinner)
   * @param q Quality factor (0.1-20, higher = more resonance)
   */
  setHighPassFilter(enabled: boolean, frequency?: number, q?: number): void {
    this.effects.highPassEnabled = enabled;
    if (frequency !== undefined) {
      this.effects.highPassFrequency = Math.max(20, Math.min(20000, frequency));
    }
    if (q !== undefined) {
      this.effects.highPassQ = Math.max(0.1, Math.min(20, q));
    }

    if (this.highPassFilter) {
      // When disabled, set to min frequency (no filtering)
      const actualFrequency = enabled ? this.effects.highPassFrequency : 20;
      this.highPassFilter.frequency.value = actualFrequency;
      this.highPassFilter.Q.value = this.effects.highPassQ;
    }
  }

  /**
   * Set reverb effect (room ambiance)
   * @param enabled Enable/disable reverb
   * @param mix Wet/dry mix 0.0-1.0 (0 = no reverb, 1 = full reverb)
   * @param delay Delay time in seconds (0.01-1.0)
   * @param decay Feedback amount 0.0-0.9 (higher = longer tail)
   */
  setReverb(enabled: boolean, mix?: number, delay?: number, decay?: number): void {
    this.effects.reverbEnabled = enabled;
    if (mix !== undefined) {
      this.effects.reverbMix = Math.max(0, Math.min(1, mix));
    }
    if (delay !== undefined) {
      this.effects.reverbDelay = Math.max(0.01, Math.min(1.0, delay));
    }
    if (decay !== undefined) {
      this.effects.reverbDecay = Math.max(0, Math.min(0.9, decay));
    }

    // Apply to nodes
    if (this.reverbWetGain) {
      this.reverbWetGain.gain.value = enabled ? this.effects.reverbMix : 0;
    }
    if (this.reverbDelay) {
      this.reverbDelay.delayTime.value = this.effects.reverbDelay;
    }
    if (this.reverbFeedback) {
      this.reverbFeedback.gain.value = this.effects.reverbDecay;
    }
  }

  /**
   * Set global pitch shift
   * @param pitch Pitch multiplier 0.5-2.0 (1.0 = normal)
   */
  setPitchShift(pitch: number): void {
    this.effects.pitchShift = Math.max(0.5, Math.min(2.0, pitch));
    // Note: This affects new sounds only, not currently playing sounds
  }

  /**
   * Reset all effects to defaults
   */
  resetEffects(): void {
    this.effects = { ...DEFAULT_EFFECTS };
    this.setLowPassFilter(false);
    this.setHighPassFilter(false);
    this.setReverb(false);
    this.effects.pitchShift = 1.0;
    console.log('[AudioManager] Effects reset to defaults');
  }

  /**
   * Apply preset effect (for quick experimentation)
   */
  applyEffectPreset(preset: 'none' | 'underwater' | 'cave' | 'indoor' | 'distant' | 'dream'): void {
    switch (preset) {
      case 'none':
        this.resetEffects();
        break;
      case 'underwater':
        this.setLowPassFilter(true, 800, 2);
        this.setHighPassFilter(false);
        this.setReverb(true, 0.4, 0.5, 0.5);
        break;
      case 'cave':
        this.setLowPassFilter(false);
        this.setHighPassFilter(false);
        this.setReverb(true, 0.6, 0.4, 0.6);
        break;
      case 'indoor':
        this.setLowPassFilter(true, 4000, 1);
        this.setHighPassFilter(false);
        this.setReverb(true, 0.2, 0.1, 0.3);
        break;
      case 'distant':
        this.setLowPassFilter(true, 2000, 1);
        this.setHighPassFilter(true, 200, 0.5);
        this.setReverb(true, 0.3, 0.3, 0.4);
        break;
      case 'dream':
        this.setLowPassFilter(true, 3000, 3);
        this.setHighPassFilter(false);
        this.setReverb(true, 0.7, 0.8, 0.7);
        this.setPitchShift(0.9);
        break;
    }
    console.log(`[AudioManager] Applied preset: ${preset}`);
  }

  /**
   * Get code snippet for current effect settings (for copying to code)
   */
  getEffectCodeSnippet(): string {
    const e = this.effects;
    const lines = ['// Audio effect settings'];

    if (e.lowPassEnabled) {
      lines.push(`audioManager.setLowPassFilter(true, ${e.lowPassFrequency}, ${e.lowPassQ});`);
    }
    if (e.highPassEnabled) {
      lines.push(`audioManager.setHighPassFilter(true, ${e.highPassFrequency}, ${e.highPassQ});`);
    }
    if (e.reverbEnabled) {
      lines.push(
        `audioManager.setReverb(true, ${e.reverbMix.toFixed(2)}, ${e.reverbDelay.toFixed(2)}, ${e.reverbDecay.toFixed(2)});`
      );
    }
    if (e.pitchShift !== 1.0) {
      lines.push(`audioManager.setPitchShift(${e.pitchShift.toFixed(2)});`);
    }

    return lines.length > 1 ? lines.join('\n') : '// No effects active';
  }

  // === Settings Persistence ===

  private loadSettings(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.settings = { ...this.settings, ...parsed };
        console.log('[AudioManager] Settings loaded from localStorage');
      }
    } catch (error) {
      console.warn('[AudioManager] Failed to load settings:', error);
    }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.warn('[AudioManager] Failed to save settings:', error);
    }
  }

  private applySettings(): void {
    if (this.masterGain) {
      this.masterGain.gain.value = this.settings.muted ? 0 : this.settings.masterVolume;
    }
    for (const [category, gain] of this.categoryGains) {
      const key = `${category}Volume` as keyof AudioSettings;
      gain.gain.value = this.settings[key] as number;
    }
  }

  /**
   * Get current settings (for UI)
   */
  getSettings(): Readonly<AudioSettings> {
    return { ...this.settings };
  }

  // === Statistics ===

  getStats(): { loaded: number; loading: number; active: number; musicPlaying: boolean } {
    return {
      loaded: this.sounds.size,
      loading: this.loading.size,
      active: this.activeSounds.size,
      musicPlaying: this.currentMusic !== null,
    };
  }

  /**
   * Check if a sound is loaded
   */
  hasSound(key: string): boolean {
    return this.sounds.has(key);
  }
}

// Singleton instance
export const audioManager = new AudioManager();
