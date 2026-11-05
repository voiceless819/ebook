/**
 * LuminaBook - Annotations, Study Tools, Academic Citations & Reading Analytics
 * Highlights in 5 pastel tones, Pin Notes at exact coordinates, Flashcards,
 * Academic Citation Formatter (APA, MLA, Chicago), Full-Text Search.
 */

class BookAnnotations {
  constructor(storageKey = 'luminabook_data') {
    this.storageKey = storageKey;
    this.bookmarks = []; // { page, title, date }
    this.highlights = []; // { id, page, text, color, date }
    this.notes = []; // { id, page, content, date, x, y } (coordinates 0..100)
    this.flashcards = []; // { id, front, back, page, level, lastReviewed }
    this.readingStartTime = Date.now();
    this.totalSecondsRead = 0;
    this.wordsPerMinute = 220; // Standard baseline average

    this.colors = {
      yellow: { name: 'Amarillo', hex: '#ffeaa7', bg: 'rgba(255, 234, 167, 0.45)' },
      mint: { name: 'Menta', hex: '#55efc4', bg: 'rgba(85, 239, 196, 0.45)' },
      lavender: { name: 'Lavanda', hex: '#a29bfe', bg: 'rgba(162, 155, 254, 0.45)' },
      cyan: { name: 'Cian', hex: '#81ecec', bg: 'rgba(129, 236, 236, 0.45)' },
      pink: { name: 'Rosa', hex: '#fab1a0', bg: 'rgba(250, 177, 160, 0.45)' }
    };

    this.loadFromStorage();
    this._startReadingTimer();
  }

  loadFromStorage() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const data = JSON.parse(saved);
        this.bookmarks = data.bookmarks || [];
        this.highlights = data.highlights || [];
        this.notes = data.notes || [];
        this.flashcards = data.flashcards || [];
        this.totalSecondsRead = data.totalSecondsRead || 0;
        this.wordsPerMinute = data.wordsPerMinute || 220;
      }
    } catch (e) {
      console.warn('Could not load annotations from storage:', e);
    }
  }

  saveToStorage() {
    try {
      const data = {
        bookmarks: this.bookmarks,
        highlights: this.highlights,
        notes: this.notes,
        flashcards: this.flashcards,
        totalSecondsRead: this.totalSecondsRead,
        wordsPerMinute: this.wordsPerMinute
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (e) {
      console.warn('Could not save annotations to storage:', e);
    }
  }

  _startReadingTimer() {
    setInterval(() => {
      this.totalSecondsRead++;
      if (this.totalSecondsRead % 30 === 0) {
        this.saveToStorage();
        if (window.luminaApp && window.luminaApp.currentBookId && window.bookStorage) {
          window.bookStorage.recordReadingSeconds(window.luminaApp.currentBookId, 30);
        }
      }
    }, 1000);
  }

  // --- Bookmarks ---
  toggleBookmark(pageNum, pageTitle = '') {
    const existingIndex = this.bookmarks.findIndex(b => b.page === pageNum);
    if (existingIndex >= 0) {
      this.bookmarks.splice(existingIndex, 1);
      this.saveToStorage();
      if (window.bookAudio) window.bookAudio.playBookmarkSound();
      if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(15);
      return false; // Removed
    } else {
      this.bookmarks.push({
        page: pageNum,
        title: pageTitle || `Página ${pageNum}`,
        date: new Date().toLocaleDateString()
      });
      this.bookmarks.sort((a, b) => a.page - b.page);
      this.saveToStorage();
      if (window.bookAudio) window.bookAudio.playBookmarkSound();
      if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(15);
      return true; // Added
    }
  }

  isBookmarked(pageNum) {
    return this.bookmarks.some(b => b.page === pageNum);
  }

  getBookmarks() {
    return this.bookmarks;
  }

  removeBookmark(pageNum) {
    this.bookmarks = this.bookmarks.filter(b => b.page !== pageNum);
    this.saveToStorage();
  }

  // --- Multi-color Highlights (5 Pastel Colors) ---
  addHighlight(pageNum, text, color = 'yellow') {
    if (!text || !text.trim()) return null;
    const validColor = this.colors[color] ? color : 'yellow';
    const highlight = {
      id: 'hl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      page: pageNum,
      text: text.trim(),
      color: validColor,
      date: new Date().toLocaleDateString()
    };
    this.highlights.push(highlight);
    this.saveToStorage();
    if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(15);
    return highlight;
  }

  getHighlightsForPage(pageNum) {
    return this.highlights.filter(h => h.page === pageNum);
  }

  removeHighlight(id) {
    this.highlights = this.highlights.filter(h => h.id !== id);
    this.saveToStorage();
  }

  // --- Notes with Exact Pin Coordinates ---
  addNote(pageNum, content, xRatio = 50, yRatio = 50) {
    if (!content || !content.trim()) return null;
    const note = {
      id: 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      page: pageNum,
      content: content.trim(),
      x: Math.max(5, Math.min(95, parseFloat(xRatio) || 50)),
      y: Math.max(5, Math.min(95, parseFloat(yRatio) || 50)),
      date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    this.notes.push(note);
    this.saveToStorage();
    if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(15);
    return note;
  }

  getNotesForPage(pageNum) {
    return this.notes.filter(n => n.page === pageNum);
  }

  removeNote(id) {
    this.notes = this.notes.filter(n => n.id !== id);
    this.saveToStorage();
  }

  // --- Academic Citations Formatter (APA, MLA, Chicago) ---
  formatCitation(snippetText, format = 'APA', meta = {}) {
    const title = meta.title || 'Documento sin título';
    const author = meta.author || 'Autor desconocido';
    const page = meta.page || 1;
    const currentYear = new Date().getFullYear();
    const cleanQuote = (snippetText || '').trim();

    switch (format.toUpperCase()) {
      case 'APA':
        return `"${cleanQuote}" (${author}, ${currentYear}, p. ${page}).\nReferencia APA (7ª ed.): ${author}. (${currentYear}). ${title} (p. ${page}). LuminaBook Library.`;
      case 'MLA':
        return `"${cleanQuote}" (${author} ${page}).\nReferencia MLA (9ª ed.): ${author}. "${title}." LuminaBook, ${currentYear}, p. ${page}.`;
      case 'CHICAGO':
        return `"${cleanQuote}" (${author} ${currentYear}, ${page}).\nReferencia Chicago (17ª ed.): ${author}. ${currentYear}. ${title}. LuminaBook.`;
      default:
        return `"${cleanQuote}" — ${author}, ${title} (p. ${page})`;
    }
  }

  // --- Flashcards / Study Exam Mode ---
  getFlashcards() {
    // Generate fresh study cards from highlights & notes if empty
    if (!this.flashcards || this.flashcards.length === 0) {
      const generated = [];
      this.highlights.forEach((h, idx) => {
        generated.push({
          id: 'fc_hl_' + h.id,
          front: `Concepto destacado (Pág. ${h.page}):\n"${h.text.substring(0, 120)}${h.text.length > 120 ? '...' : ''}"`,
          back: `Cita completa:\n"${h.text}"\n\n[Página ${h.page} - Subrayado ${h.color.toUpperCase()}]`,
          page: h.page,
          level: 1,
          reviewed: false
        });
      });

      this.notes.forEach((n, idx) => {
        generated.push({
          id: 'fc_note_' + n.id,
          front: `Nota personal en Pág. ${n.page}:`,
          back: `${n.content}\n\n[Página ${n.page} - Coordenadas (${Math.round(n.x)}%, ${Math.round(n.y)}%)]`,
          page: n.page,
          level: 1,
          reviewed: false
        });
      });

      return generated;
    }

    return this.flashcards;
  }

  updateFlashcardStatus(cardId, mastered) {
    let card = this.flashcards.find(c => c.id === cardId);
    if (!card) {
      const all = this.getFlashcards();
      card = all.find(c => c.id === cardId);
      if (card) this.flashcards.push(card);
    }

    if (card) {
      card.reviewed = true;
      card.level = mastered ? Math.min(5, (card.level || 1) + 1) : 1;
      this.saveToStorage();
    }
  }

  // --- Search Engine ---
  search(query, pages) {
    if (!query || !query.trim() || !pages || pages.length === 0) return [];
    const q = query.toLowerCase().trim();
    const results = [];

    pages.forEach((page, index) => {
      const pageNum = page.pageNum || (index + 1);
      const text = page.text || '';
      if (!text) return;

      const lowerText = text.toLowerCase();
      let pos = 0;
      let count = 0;

      while ((pos = lowerText.indexOf(q, pos)) !== -1 && count < 6) {
        const start = Math.max(0, pos - 45);
        const end = Math.min(text.length, pos + q.length + 55);
        let snippet = text.substring(start, end).replace(/\n/g, ' ');
        if (start > 0) snippet = '...' + snippet;
        if (end < text.length) snippet = snippet + '...';

        results.push({
          page: pageNum,
          snippet: snippet,
          match: text.substr(pos, q.length)
        });
        pos += q.length;
        count++;
      }
    });

    return results;
  }

  // --- Reading Analytics ---
  getReadingStats(currentPage, totalPages, totalWords = 0) {
    const minutesRead = Math.floor(this.totalSecondsRead / 60);
    const progressPercent = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;

    const remainingPages = Math.max(0, totalPages - currentPage);
    const estimatedWordsLeft = totalWords > 0
      ? Math.round(totalWords * (remainingPages / totalPages))
      : remainingPages * 280;

    const minutesRemaining = Math.max(1, Math.round(estimatedWordsLeft / this.wordsPerMinute));

    return {
      minutesRead,
      totalSecondsRead: this.totalSecondsRead,
      progressPercent,
      minutesRemaining,
      wordsPerMinute: this.wordsPerMinute,
      currentPage,
      totalPages,
      totalBookmarks: this.bookmarks.length,
      totalHighlights: this.highlights.length,
      totalNotes: this.notes.length
    };
  }

  getAllData() {
    return {
      bookmarks: this.bookmarks,
      highlights: this.highlights,
      notes: this.notes,
      flashcards: this.flashcards,
      totalSecondsRead: this.totalSecondsRead,
      wordsPerMinute: this.wordsPerMinute
    };
  }

  clearAll() {
    this.bookmarks = [];
    this.highlights = [];
    this.notes = [];
    this.flashcards = [];
    this.saveToStorage();
  }
}

window.bookAnnotations = new BookAnnotations();
