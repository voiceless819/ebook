/**
 * LuminaBook - Local Storage & IndexedDB Personal Catalog
 * Stores PDFs, reading progress, collections/tags, annotations, drawings,
 * recycle bin and thumbnails locally in browser.
 * Persistent, offline, unlimited capacity (hundreds of MBs).
 */

class BookStorage {
  constructor() {
    this.dbName = 'EbookPersonalCatalogDB';
    this.dbVersion = 2;
    this.storeName = 'books';
    this.drawingsStoreName = 'drawings';
    this.statsStoreName = 'stats';
    this.db = null;
  }

  async init() {
    if (this.db) return this.db;

    return new Promise((resolve) => {
      if (!window.indexedDB) {
        console.warn('IndexedDB no está soportado en este navegador.');
        resolve(null);
        return;
      }

      const request = window.indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event) => {
        try {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
            store.createIndex('addedAt', 'addedAt', { unique: false });
            store.createIndex('lastOpenedAt', 'lastOpenedAt', { unique: false });
            store.createIndex('deletedAt', 'deletedAt', { unique: false });
          } else {
            const tx = event.target.transaction || request.transaction;
            if (tx) {
              const store = tx.objectStore(this.storeName);
              if (!store.indexNames.contains('deletedAt')) {
                store.createIndex('deletedAt', 'deletedAt', { unique: false });
              }
            }
          }

          if (!db.objectStoreNames.contains(this.drawingsStoreName)) {
            db.createObjectStore(this.drawingsStoreName, { keyPath: 'id' });
          }

          if (!db.objectStoreNames.contains(this.statsStoreName)) {
            db.createObjectStore(this.statsStoreName, { keyPath: 'id' });
          }
        } catch (err) {
          console.warn('IndexedDB onupgradeneeded notice:', err);
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
        this.purgeOldTrash().catch(() => {});
      };

      request.onerror = (event) => {
        console.error('Error al abrir IndexedDB:', event.target.error);
        resolve(null);
      };
    });
  }

  async saveBook(book) {
    await this.init();
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([this.storeName], 'readwrite');
      const store = tx.objectStore(this.storeName);

      const entry = {
        id: book.id || 'book_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        title: book.title || 'Documento sin título',
        author: book.author || 'Autor desconocido',
        fileName: book.fileName || 'documento.pdf',
        fileSize: book.fileSize || 0,
        totalPages: book.totalPages || 1,
        lastPage: book.lastPage || 1,
        addedAt: book.addedAt || Date.now(),
        lastOpenedAt: Date.now(),
        coverThumbnail: book.coverThumbnail || null,
        tags: Array.isArray(book.tags) ? book.tags : ['General'],
        deletedAt: null, // null = active, timestamp = recycle bin
        readingSeconds: book.readingSeconds || 0,
        completed: book.completed || false,
        cachedText: book.cachedText || null, // Optional text snippet cache for global search
        fileData: book.fileData // ArrayBuffer
      };

      const request = store.put(entry);

      request.onsuccess = () => resolve(entry);
      request.onerror = (e) => {
        console.error('Error al guardar libro:', e);
        reject(e);
      };
    });
  }

  async getAllBooks(includeDeleted = false) {
    await this.init();
    if (!this.db) return [];

    return new Promise((resolve) => {
      const tx = this.db.transaction([this.storeName], 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const rawList = request.result || [];
        const filtered = includeDeleted ? rawList : rawList.filter(b => !b.deletedAt);

        // Exclude the heavy fileData from catalog listing to keep UI snappy
        const list = filtered.map(b => ({
          id: b.id,
          title: b.title,
          author: b.author,
          fileName: b.fileName,
          fileSize: b.fileSize,
          totalPages: b.totalPages,
          lastPage: b.lastPage,
          addedAt: b.addedAt,
          lastOpenedAt: b.lastOpenedAt,
          coverThumbnail: b.coverThumbnail,
          tags: b.tags || ['General'],
          deletedAt: b.deletedAt || null,
          readingSeconds: b.readingSeconds || 0,
          completed: b.completed || false
        }));

        list.sort((a, b) => (b.lastOpenedAt || 0) - (a.lastOpenedAt || 0));
        resolve(list);
      };

      request.onerror = () => resolve([]);
    });
  }

  async getTrashBooks() {
    await this.init();
    if (!this.db) return [];

    return new Promise((resolve) => {
      const tx = this.db.transaction([this.storeName], 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const rawList = request.result || [];
        const trash = rawList.filter(b => !!b.deletedAt).map(b => ({
          id: b.id,
          title: b.title,
          author: b.author,
          fileName: b.fileName,
          fileSize: b.fileSize,
          totalPages: b.totalPages,
          lastPage: b.lastPage,
          addedAt: b.addedAt,
          lastOpenedAt: b.lastOpenedAt,
          coverThumbnail: b.coverThumbnail,
          tags: b.tags || [],
          deletedAt: b.deletedAt
        }));
        trash.sort((a, b) => b.deletedAt - a.deletedAt);
        resolve(trash);
      };

      request.onerror = () => resolve([]);
    });
  }

  async getBook(id) {
    await this.init();
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([this.storeName], 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = (e) => reject(e);
    });
  }

  async updateProgress(id, page, totalPages) {
    await this.init();
    if (!this.db || !id) return;

    return new Promise((resolve) => {
      const tx = this.db.transaction([this.storeName], 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        const book = request.result;
        if (book) {
          book.lastPage = page;
          if (totalPages) book.totalPages = totalPages;
          if (page >= book.totalPages) {
            book.completed = true;
          }
          book.lastOpenedAt = Date.now();
          store.put(book);
        }
        resolve();
      };
      request.onerror = () => resolve();
    });
  }

  async updateMetadata(id, updates = {}) {
    await this.init();
    if (!this.db || !id) return null;

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([this.storeName], 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        const book = request.result;
        if (!book) {
          resolve(null);
          return;
        }

        if (updates.title !== undefined) book.title = updates.title.trim() || book.title;
        if (updates.author !== undefined) book.author = updates.author.trim() || book.author;
        if (updates.tags !== undefined) book.tags = Array.isArray(updates.tags) ? updates.tags : [updates.tags];
        if (updates.coverThumbnail !== undefined) book.coverThumbnail = updates.coverThumbnail;

        store.put(book);
        resolve(book);
      };
      request.onerror = (e) => reject(e);
    });
  }

  async recordReadingSeconds(id, seconds) {
    await this.init();
    if (!this.db || !id) return;

    return new Promise((resolve) => {
      const tx = this.db.transaction([this.storeName], 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        const book = request.result;
        if (book) {
          book.readingSeconds = (book.readingSeconds || 0) + seconds;
          store.put(book);
        }
        resolve();
      };
      request.onerror = () => resolve();
    });
  }

  async saveCachedText(id, textSnippet) {
    await this.init();
    if (!this.db || !id) return;

    return new Promise((resolve) => {
      const tx = this.db.transaction([this.storeName], 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        const book = request.result;
        if (book) {
          book.cachedText = (textSnippet || '').substring(0, 30000); // Index key extract
          store.put(book);
        }
        resolve();
      };
      request.onerror = () => resolve();
    });
  }

  /**
   * Soft delete (Recycle Bin - 7 days retention)
   */
  async moveToTrash(id) {
    await this.init();
    if (!this.db) return false;

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([this.storeName], 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        const book = request.result;
        if (book) {
          book.deletedAt = Date.now();
          store.put(book);
          resolve(true);
        } else {
          resolve(false);
        }
      };
      request.onerror = (e) => reject(e);
    });
  }

  async restoreFromTrash(id) {
    await this.init();
    if (!this.db) return false;

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([this.storeName], 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        const book = request.result;
        if (book) {
          book.deletedAt = null;
          store.put(book);
          resolve(true);
        } else {
          resolve(false);
        }
      };
      request.onerror = (e) => reject(e);
    });
  }

  async permanentDelete(id) {
    await this.init();
    if (!this.db) return false;

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([this.storeName], 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e);
    });
  }

  async purgeOldTrash() {
    await this.init();
    if (!this.db) return;

    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    return new Promise((resolve) => {
      const tx = this.db.transaction([this.storeName], 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const books = request.result || [];
        for (const b of books) {
          if (b.deletedAt && (now - b.deletedAt) > sevenDaysMs) {
            store.delete(b.id);
          }
        }
        resolve();
      };
      request.onerror = () => resolve();
    });
  }

  // --- Freehand Drawings Storage ---
  async saveDrawing(bookId, pageNum, strokesData) {
    await this.init();
    if (!this.db || !bookId) return;

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([this.drawingsStoreName], 'readwrite');
      const store = tx.objectStore(this.drawingsStoreName);
      const id = `${bookId}_p${pageNum}`;

      const entry = {
        id,
        bookId,
        pageNum,
        strokesData,
        updatedAt: Date.now()
      };

      const request = store.put(entry);
      request.onsuccess = () => resolve(entry);
      request.onerror = (e) => reject(e);
    });
  }

  async getDrawing(bookId, pageNum) {
    await this.init();
    if (!this.db || !bookId) return null;

    return new Promise((resolve) => {
      const tx = this.db.transaction([this.drawingsStoreName], 'readonly');
      const store = tx.objectStore(this.drawingsStoreName);
      const id = `${bookId}_p${pageNum}`;
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result ? request.result.strokesData : null);
      request.onerror = () => resolve(null);
    });
  }

  async clearDrawing(bookId, pageNum) {
    await this.init();
    if (!this.db || !bookId) return;

    return new Promise((resolve) => {
      const tx = this.db.transaction([this.drawingsStoreName], 'readwrite');
      const store = tx.objectStore(this.drawingsStoreName);
      const id = `${bookId}_p${pageNum}`;
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
    });
  }

  // --- Transversal Search Across Catalog ---
  async searchAcrossAllBooks(query) {
    if (!query || !query.trim()) return [];
    const books = await this.getAllBooks(false);
    const q = query.toLowerCase().trim();
    const results = [];

    for (const b of books) {
      let matchScore = 0;
      const matchedFields = [];

      if (b.title && b.title.toLowerCase().includes(q)) {
        matchScore += 10;
        matchedFields.push('Título');
      }
      if (b.author && b.author.toLowerCase().includes(q)) {
        matchScore += 8;
        matchedFields.push('Autor');
      }
      if (b.tags && b.tags.some(t => t.toLowerCase().includes(q))) {
        matchScore += 6;
        matchedFields.push('Etiqueta');
      }
      if (b.cachedText && b.cachedText.toLowerCase().includes(q)) {
        matchScore += 4;
        matchedFields.push('Contenido');
      }

      if (matchScore > 0) {
        results.push({
          book: b,
          matchScore,
          matchedFields: matchedFields.join(', ')
        });
      }
    }

    results.sort((a, b) => b.matchScore - a.matchScore);
    return results;
  }
}

window.bookStorage = new BookStorage();
