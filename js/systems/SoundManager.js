// Sound Manager - Handles all audio playback and volume control

export default class SoundManager {
  constructor(scene) {
    this.scene = scene;

    // Load saved volume settings from localStorage
    this.musicVolume = this.loadVolumeSetting('musicVolume', 0.1); // Default 10%
    this.sfxVolume = this.loadVolumeSetting('sfxVolume', 0.7); // Default 70%

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
      // Kill any existing tweens on the music first
      this.scene.tweens.killTweensOf(this.currentMusic);

      if (this.currentMusic.isPlaying) {
        if (fadeIn) {
          const oldMusic = this.currentMusic;
          this.currentMusic = null; // Clear reference immediately
          this.scene.tweens.add({
            targets: oldMusic,
            volume: 0,
            duration: 1000,
            onComplete: () => {
              if (oldMusic && oldMusic.isPlaying) {
                oldMusic.stop();
              }
              this.startMusic(key, fadeIn);
            }
          });
          return;
        } else {
          this.currentMusic.stop();
        }
      }
      this.currentMusic = null;
    }

    this.startMusic(key, fadeIn);
  }

  /**
   * Start playing music
   */
  startMusic(key, fadeIn) {
    try {
      // Create or get music track
      if (!this.musicTracks[key]) {
        this.musicTracks[key] = this.scene.sound.add(key, {
          loop: true,
          volume: this.musicVolume
        });
      }

      this.currentMusic = this.musicTracks[key];

      if (!this.currentMusic) {
        console.warn(`SoundManager: Failed to create music track '${key}'`);
        return;
      }

      if (fadeIn) {
        this.currentMusic.setVolume(0);
        this.currentMusic.play();
        this.scene.tweens.add({
          targets: this.currentMusic,
          volume: this.musicVolume,
          duration: 2000
        });
      } else {
        this.currentMusic.setVolume(this.musicVolume);
        this.currentMusic.play();
      }

      console.log(`SoundManager: Playing music '${key}' at ${this.musicVolume * 100}% volume`);
    } catch (error) {
      console.warn(`SoundManager: Error starting music '${key}':`, error);
    }
  }

  /**
   * Stop current music
   */
  stopMusic(fadeOut = true) {
    if (!this.currentMusic) return;

    // Kill any existing tweens on the music to prevent "null volume" errors
    this.scene.tweens.killTweensOf(this.currentMusic);

    if (!this.currentMusic.isPlaying) {
      this.currentMusic = null;
      return;
    }

    const musicToStop = this.currentMusic;
    this.currentMusic = null; // Clear reference immediately

    if (fadeOut) {
      this.scene.tweens.add({
        targets: musicToStop,
        volume: 0,
        duration: 1000,
        onComplete: () => {
          if (musicToStop && musicToStop.isPlaying) {
            musicToStop.stop();
          }
        }
      });
    } else {
      musicToStop.stop();
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

    // Update current music volume (safely)
    if (this.currentMusic && this.currentMusic.isPlaying) {
      try {
        this.currentMusic.setVolume(this.musicVolume);
      } catch (error) {
        console.warn('SoundManager: Failed to set music volume:', error);
      }
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
    // Kill all tweens on music tracks first
    Object.values(this.musicTracks).forEach(track => {
      if (track) {
        this.scene.tweens.killTweensOf(track);
      }
    });

    if (this.currentMusic) {
      this.scene.tweens.killTweensOf(this.currentMusic);
      if (this.currentMusic.isPlaying) {
        this.currentMusic.stop();
      }
    }
    this.currentMusic = null;

    // Destroy all cached music tracks
    Object.values(this.musicTracks).forEach(track => {
      if (track) track.destroy();
    });

    this.musicTracks = {};
    this.soundEffects = {};
  }
}
