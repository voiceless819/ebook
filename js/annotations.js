/**
 * LuminaBook - Annotations, Search & Reading Analytics
 * Highlights, Sticky Notes, Bookmarks, Full-Text Search and Reading Pace Estimation.
 */

class BookAnnotations {
  constructor(storageKey = 'luminabook_data') {
    this.storageKey = storageKey;
    this.bookmarks = []; // { page, title, date }
    this.highlights = []; // { id, page, text, color, date }
    this.notes = []; // { id, page, content, date }
    this.readingStartTime = Date.now();
    this.totalSecondsRead = 0;
    this.wordCountHistory = 0;
    this.wordsPerMinute = 220; // Human baseline average

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

  // --- Highlights ---
  addHighlight(pageNum, text, color = 'yellow') {
    if (!text || !text.trim()) return null;
    const highlight = {
      id: 'hl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      page: pageNum,
      text: text.trim(),
      color: color,
      date: new Date().toLocaleDateString()
    };
    this.highlights.push(highlight);
    this.saveToStorage();
    return highlight;
  }

  getHighlightsForPage(pageNum) {
    return this.highlights.filter(h => h.page === pageNum);
  }

  removeHighlight(id) {
    this.highlights = this.highlights.filter(h => h.id !== id);
    this.saveToStorage();
  }

  // --- Notes ---
  addNote(pageNum, content) {
    if (!content || !content.trim()) return null;
    const note = {
      id: 'note_' + Date.now(),
      page: pageNum,
      content: content.trim(),
      date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    this.notes.push(note);
    this.saveToStorage();
    return note;
  }

  getNotesForPage(pageNum) {
    return this.notes.filter(n => n.page === pageNum);
  }

  removeNote(id) {
    this.notes = this.notes.filter(n => n.id !== id);
    this.saveToStorage();
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

      while ((pos = lowerText.indexOf(q, pos)) !== -1 && count < 5) {
        // Extract preview snippet around the match
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

    // Remaining words estimate
    const remainingPages = Math.max(0, totalPages - currentPage);
    const estimatedWordsLeft = totalWords > 0
      ? Math.round(totalWords * (remainingPages / totalPages))
      : remainingPages * 280; // Standard average words per book page

    const minutesRemaining = Math.max(1, Math.round(estimatedWordsLeft / this.wordsPerMinute));

    return {
      minutesRead,
      totalSecondsRead: this.totalSecondsRead,
      progressPercent,
      minutesRemaining,
      wordsPerMinute: this.wordsPerMinute,
      currentPage,
      totalPages
    };
  }

  getAllData() {
    return {
      bookmarks: this.bookmarks,
      highlights: this.highlights,
      notes: this.notes,
      totalSecondsRead: this.totalSecondsRead,
      wordsPerMinute: this.wordsPerMinute
    };
  }

  clearAll() {
    this.bookmarks = [];
    this.highlights = [];
    this.notes = [];
    this.saveToStorage();
  }
}

// Global instance
window.bookAnnotations = new BookAnnotations();
