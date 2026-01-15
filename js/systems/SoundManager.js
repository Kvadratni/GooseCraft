// Sound Manager - Handles all audio playback and volume control

export default class SoundManager {
  constructor(scene) {
    this.scene = scene;

    // Load saved volume settings from localStorage
    this.musicVolume = this.loadVolumeSetting('musicVolume', 0.2); // Default 20%
    this.sfxVolume = this.loadVolumeSetting('sfxVolume', 1.0); // Default 100%

    // Music tracks
    this.currentMusic = null;
    this.musicTracks = {};

    // Sound effects cache
    this.soundEffects = {};

    console.log(`SoundManager: Initialized (Music: ${this.musicVolume * 100}%, SFX: ${this.sfxVolume * 100}%)`);
  }

  /**
   * Load volume setting from localStorage
   */
  loadVolumeSetting(key, defaultValue) {
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null) {
        const value = parseFloat(saved);
        return isNaN(value) ? defaultValue : Math.max(0, Math.min(1, value));
      }
    } catch (error) {
      console.warn(`SoundManager: Failed to load ${key}:`, error);
    }
    return defaultValue;
  }

  /**
   * Save volume setting to localStorage
   */
  saveVolumeSetting(key, value) {
    try {
      localStorage.setItem(key, value.toString());
    } catch (error) {
      console.warn(`SoundManager: Failed to save ${key}:`, error);
    }
  }

  /**
   * Play background music (loops continuously)
   */
  playMusic(key, fadeIn = true) {
    // Stop current music if playing
    if (this.currentMusic) {
      if (fadeIn) {
        this.scene.tweens.add({
          targets: this.currentMusic,
          volume: 0,
          duration: 1000,
          onComplete: () => {
            this.currentMusic.stop();
            this.startMusic(key, fadeIn);
          }
        });
        return;
      } else {
        this.currentMusic.stop();
      }
    }

    this.startMusic(key, fadeIn);
  }

  /**
   * Start playing music
   */
  startMusic(key, fadeIn) {
    // Create or get music track
    if (!this.musicTracks[key]) {
      this.musicTracks[key] = this.scene.sound.add(key, {
        loop: true,
        volume: this.musicVolume
      });
    }

    this.currentMusic = this.musicTracks[key];

    if (fadeIn) {
      this.currentMusic.volume = 0;
      this.currentMusic.play();
      this.scene.tweens.add({
        targets: this.currentMusic,
        volume: this.musicVolume,
        duration: 2000
      });
    } else {
      this.currentMusic.volume = this.musicVolume;
      this.currentMusic.play();
    }

    console.log(`SoundManager: Playing music '${key}' at ${this.musicVolume * 100}% volume`);
  }

  /**
   * Stop current music
   */
  stopMusic(fadeOut = true) {
    if (!this.currentMusic || !this.currentMusic.isPlaying) return;

    if (fadeOut) {
      this.scene.tweens.add({
        targets: this.currentMusic,
        volume: 0,
        duration: 1000,
        onComplete: () => {
          this.currentMusic.stop();
        }
      });
    } else {
      this.currentMusic.stop();
    }
  }

  /**
   * Play sound effect
   */
  playSFX(key, config = {}) {
    // Don't play if SFX volume is 0
    if (this.sfxVolume === 0) return;

    const defaultConfig = {
      volume: this.sfxVolume,
      loop: false
    };

    const finalConfig = { ...defaultConfig, ...config };
    finalConfig.volume *= this.sfxVolume; // Apply global SFX volume

    // Play the sound
    const sound = this.scene.sound.add(key, finalConfig);
    sound.play();

    // Clean up after playing (for non-looping sounds)
    if (!finalConfig.loop) {
      sound.once('complete', () => {
        sound.destroy();
      });
    }

    return sound;
  }

  /**
   * Set music volume
   */
  setMusicVolume(volume) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    this.saveVolumeSetting('musicVolume', this.musicVolume);

    // Update current music volume
    if (this.currentMusic) {
      this.currentMusic.setVolume(this.musicVolume);
    }

    console.log(`SoundManager: Music volume set to ${this.musicVolume * 100}%`);
  }

  /**
   * Set SFX volume
   */
  setSFXVolume(volume) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    this.saveVolumeSetting('sfxVolume', this.sfxVolume);

    console.log(`SoundManager: SFX volume set to ${this.sfxVolume * 100}%`);
  }

  /**
   * Get current music volume
   */
  getMusicVolume() {
    return this.musicVolume;
  }

  /**
   * Get current SFX volume
   */
  getSFXVolume() {
    return this.sfxVolume;
  }

  /**
   * Clean up
   */
  destroy() {
    if (this.currentMusic) {
      this.currentMusic.stop();
    }

    // Destroy all cached music tracks
    Object.values(this.musicTracks).forEach(track => {
      if (track) track.destroy();
    });

    this.musicTracks = {};
    this.soundEffects = {};
  }
}
