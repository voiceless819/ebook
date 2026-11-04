/**
 * LuminaBook - Text-To-Speech (TTS / Audiolibro Dinámico)
 * Human-like voice reading with speed control, auto-page-turn, and real-time sentence tracking.
 */

class BookTTS {
  constructor() {
    this.synth = window.speechSynthesis;
    this.utterance = null;
    this.isPlaying = false;
    this.isPaused = false;
    this.rate = 1.0;
    this.pitch = 1.0;
    this.selectedVoice = null;
    this.voices = [];
    this.currentText = '';
    this.sentences = [];
    this.currentSentenceIndex = 0;
    this.onProgressCallback = null;
    this.onFinishCallback = null;
    this.autoTurnPage = true;

    this._loadVoices();
    if (this.synth && this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => this._loadVoices();
    }
  }

  _loadVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
    if (this.voices.length > 0 && !this.selectedVoice) {
      // Prefer Spanish or natural sounding voice
      const esVoice = this.voices.find(v => v.lang.startsWith('es') && (v.name.includes('Natural') || v.name.includes('Online') || v.name.includes('Google') || v.name.includes('Microsoft')));
      const anyEs = this.voices.find(v => v.lang.startsWith('es'));
      const defaultVoice = this.voices.find(v => v.default);
      this.selectedVoice = esVoice || anyEs || defaultVoice || this.voices[0];
    }
  }

  getAvailableVoices() {
    return this.voices;
  }

  setVoice(voiceUri) {
    const v = this.voices.find(voice => voice.voiceURI === voiceUri);
    if (v) this.selectedVoice = v;
  }

  setRate(val) {
    this.rate = Math.max(0.5, Math.min(2.5, parseFloat(val) || 1.0));
  }

  setPitch(val) {
    this.pitch = Math.max(0.5, Math.min(1.5, parseFloat(val) || 1.0));
  }

  setAutoTurnPage(val) {
    this.autoTurnPage = !!val;
  }

  /**
   * Start reading given text from the current page.
   */
  readText(text, onProgress, onFinish) {
    this.stop();
    if (!text || !text.trim() || !this.synth) return;

    this.currentText = text.trim();
    this.onProgressCallback = onProgress;
    this.onFinishCallback = onFinish;

    // Split text into readable phrases / sentences
    this.sentences = this.currentText
      .split(/(?<=[.!?¿¡\n])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (this.sentences.length === 0) {
      this.sentences = [this.currentText];
    }

    this.currentSentenceIndex = 0;
    this.isPlaying = true;
    this.isPaused = false;
    this._speakNextSentence();
  }

  _speakNextSentence() {
    if (!this.isPlaying || this.isPaused) return;

    if (this.currentSentenceIndex >= this.sentences.length) {
      this.isPlaying = false;
      if (this.onFinishCallback) {
        this.onFinishCallback(true); // Completed page
      }
      return;
    }

    const sentence = this.sentences[this.currentSentenceIndex];
    if (this.onProgressCallback) {
      this.onProgressCallback({
        index: this.currentSentenceIndex,
        total: this.sentences.length,
        sentence: sentence
      });
    }

    this.utterance = new SpeechSynthesisUtterance(sentence);
    if (this.selectedVoice) {
      this.utterance.voice = this.selectedVoice;
    }
    this.utterance.rate = this.rate;
    this.utterance.pitch = this.pitch;

    this.utterance.onend = () => {
      this.currentSentenceIndex++;
      this._speakNextSentence();
    };

    this.utterance.onerror = (e) => {
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        console.warn('TTS utterance error:', e);
      }
      this.currentSentenceIndex++;
      this._speakNextSentence();
    };

    this.synth.speak(this.utterance);
  }

  pause() {
    if (this.synth && this.isPlaying && !this.isPaused) {
      this.synth.pause();
      this.isPaused = true;
    }
  }

  resume() {
    if (this.synth && this.isPaused) {
      this.synth.resume();
      this.isPaused = false;
    }
  }

  togglePlayPause(text, onProgress, onFinish) {
    if (!this.isPlaying) {
      this.readText(text, onProgress, onFinish);
      return 'playing';
    } else if (this.isPaused) {
      this.resume();
      return 'playing';
    } else {
      this.pause();
      return 'paused';
    }
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
    }
    this.isPlaying = false;
    this.isPaused = false;
    this.currentSentenceIndex = 0;
    if (this.onProgressCallback) {
      this.onProgressCallback(null);
    }
  }
}

// Global instance
window.bookTTS = new BookTTS();
