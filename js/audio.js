/**
 * LuminaBook - Audio Synthesizer (Web Audio API)
 * Procedural page-turn sound and ambient reading soundscapes.
 * 100% offline, zero external audio assets required.
 */

class BookAudioEngine {
  constructor() {
    this.ctx = null;
    this.soundEnabled = true;
    this.ambientType = 'none'; // 'none' | 'rain' | 'library' | 'cafe'
    this.ambientGainNode = null;
    this.ambientSourceNodes = [];
    this.volume = 0.5;
    this.ambientVolume = 0.35;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setSoundEnabled(enabled) {
    this.soundEnabled = enabled;
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  setAmbientVolume(vol) {
    this.ambientVolume = Math.max(0, Math.min(1, vol));
    if (this.ambientGainNode && this.ctx) {
      this.ambientGainNode.gain.setTargetAtTime(this.ambientVolume, this.ctx.currentTime, 0.1);
    }
  }

  /**
   * Procedural Page Turn Sound Effect
   * Simulates the friction, air movement, and soft snap of turning a heavy paper page.
   */
  playPageTurn(reverse = false) {
    if (!this.soundEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;
      const duration = 0.28;

      // 1. Noise buffer for paper friction
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Pink-ish filtered noise for organic paper fiber texture
        lastOut = lastOut * 0.75 + white * 0.25;
        data[i] = lastOut;
      }

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = buffer;

      // 2. Dynamic Bandpass/Lowpass filter sweep (air movement)
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = 1.8;

      if (!reverse) {
        // Sweeps down then up for forward turn
        filter.frequency.setValueAtTime(800, t);
        filter.frequency.exponentialRampToValueAtTime(2200, t + 0.12);
        filter.frequency.exponentialRampToValueAtTime(450, t + duration);
      } else {
        // Reverse turn acoustic profile
        filter.frequency.setValueAtTime(1200, t);
        filter.frequency.exponentialRampToValueAtTime(1900, t + 0.08);
        filter.frequency.exponentialRampToValueAtTime(350, t + duration);
      }

      // 3. Amplitude Envelope (attack, slight swell, quick decay)
      const gain = this.ctx.createGain();
      const masterVol = this.volume * 0.85;
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(masterVol * 0.8, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(masterVol * 0.3, t + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

      // 4. Subtle low-end body 'thump' (spine shift)
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.15);

      oscGain.gain.setValueAtTime(masterVol * 0.25, t);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);

      // Connect graph
      noiseSource.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);

      noiseSource.start(t);
      osc.start(t);

      noiseSource.stop(t + duration);
      osc.stop(t + 0.16);
    } catch (e) {
      console.warn('Audio playPageTurn error:', e);
    }
  }

  /**
   * Subtle bookmark click sound
   */
  playBookmarkSound() {
    if (!this.soundEnabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(540, t);
      osc.frequency.exponentialRampToValueAtTime(780, t + 0.09);
      gain.gain.setValueAtTime(this.volume * 0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    } catch (e) {}
  }

  /**
   * Ambient Soundscapes (Soft Rain, Library Silence, Warm Cafe)
   */
  setAmbientSound(type) {
    this.ambientType = type;
    this.stopAmbient();
    if (type === 'none') return;

    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    this.ambientGainNode = this.ctx.createGain();
    this.ambientGainNode.gain.setValueAtTime(0.001, t);
    this.ambientGainNode.gain.linearRampToValueAtTime(this.ambientVolume, t + 1.5);
    this.ambientGainNode.connect(this.ctx.destination);

    if (type === 'rain') {
      this._createRainSound();
    } else if (type === 'library') {
      this._createLibrarySound();
    } else if (type === 'cafe') {
      this._createCafeSound();
    }
  }

  stopAmbient() {
    this.ambientSourceNodes.forEach(node => {
      try {
        node.stop();
        node.disconnect();
      } catch (e) {}
    });
    this.ambientSourceNodes = [];
    if (this.ambientGainNode) {
      try {
        this.ambientGainNode.disconnect();
      } catch (e) {}
      this.ambientGainNode = null;
    }
  }

  _createRainSound() {
    // 3 seconds looped pink/brown noise with soft modulation
    const bufferSize = this.ctx.sampleRate * 4;
    const buffer = this.ctx.createBuffer(2, bufferSize, this.ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99 * b0 + white * 0.05;
        b1 = 0.95 * b1 + white * 0.08;
        b2 = 0.90 * b2 + white * 0.12;
        data[i] = (b0 + b1 + b2) * 0.28;
      }
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1400;

    noise.connect(filter);
    filter.connect(this.ambientGainNode);
    noise.start();
    this.ambientSourceNodes.push(noise);
  }

  _createLibrarySound() {
    // Deep gentle room tone / low frequency hush
    const bufferSize = this.ctx.sampleRate * 4;
    const buffer = this.ctx.createBuffer(2, bufferSize, this.ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let last = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        last = last * 0.98 + white * 0.02;
        data[i] = last * 0.5;
      }
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 350;

    noise.connect(filter);
    filter.connect(this.ambientGainNode);
    noise.start();
    this.ambientSourceNodes.push(noise);
  }

  _createCafeSound() {
    // Warm mid-frequency rumble simulating distant cafe buzz
    const bufferSize = this.ctx.sampleRate * 4;
    const buffer = this.ctx.createBuffer(2, bufferSize, this.ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let last = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        last = last * 0.96 + white * 0.04;
        data[i] = last * 0.35;
      }
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 650;
    filter.Q.value = 1.2;

    noise.connect(filter);
    filter.connect(this.ambientGainNode);
    noise.start();
    this.ambientSourceNodes.push(noise);
  }
}

// Global instance
window.bookAudio = new BookAudioEngine();
