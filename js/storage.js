/**
 * LuminaBook - Local Storage & IndexedDB Personal Catalog
 * Stores PDFs, reading progress, and thumbnails locally in browser.
 * Persistent, offline, unlimited capacity (hundreds of MBs).
 */

class BookStorage {
  constructor() {
    this.dbName = 'EbookPersonalCatalogDB';
    this.dbVersion = 1;
    this.storeName = 'books';
    this.db = null;
  }

  async init() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        console.warn('IndexedDB no está soportado en este navegador.');
        resolve(null);
        return;
      }

      const request = window.indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('addedAt', 'addedAt', { unique: false });
          store.createIndex('lastOpenedAt', 'lastOpenedAt', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
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

  async getAllBooks() {
    await this.init();
    if (!this.db) return [];

    return new Promise((resolve) => {
      const tx = this.db.transaction([this.storeName], 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        // Exclude the heavy fileData from catalog listing to keep UI fast
        const list = (request.result || []).map(b => ({
          id: b.id,
          title: b.title,
          author: b.author,
          fileName: b.fileName,
          fileSize: b.fileSize,
          totalPages: b.totalPages,
          lastPage: b.lastPage,
          addedAt: b.addedAt,
          lastOpenedAt: b.lastOpenedAt,
          coverThumbnail: b.coverThumbnail
        }));

        list.sort((a, b) => (b.lastOpenedAt || 0) - (a.lastOpenedAt || 0));
        resolve(list);
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

  async updateProgress(id, page) {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve) => {
      const tx = this.db.transaction([this.storeName], 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        const book = request.result;
        if (book) {
          book.lastPage = page;
          book.lastOpenedAt = Date.now();
          store.put(book);
        }
        resolve();
      };
      request.onerror = () => resolve();
    });
  }

  async deleteBook(id) {
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
}

window.bookStorage = new BookStorage();
