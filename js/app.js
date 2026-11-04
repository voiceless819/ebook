/**
 * LuminaBook - Application Orchestrator
 * Integrates PDF/EPUB engines, persistent IndexedDB personal catalog, 3D flipbook, reflow reader & gestures.
 */

class LuminaApp {
  constructor() {
    this.currentDoc = null;
    this.currentBookId = null;
    this.pages = [];
    this.currentPage = 1;
    this.totalPages = 1;
    this.readingMode = '3d'; // '3d' | 'reflow'
    this.hudVisible = true;
    this.activeDrawer = null;

    this.init();
  }

  async init() {
    this._cacheDOM();
    this._initEngines();
    this._setupEventListeners();
    this._setupTouchGestures();
    this._setupKeyboardShortcuts();
    this._setupDragAndDrop();

    // Initialize local database catalog
    await window.bookStorage.init();
    await this.refreshCatalogCount();

    // Check if user has previously saved books in their personal catalog
    const savedBooks = await window.bookStorage.getAllBooks();
    if (savedBooks.length > 0) {
      // Load the most recently opened book
      const lastBook = await window.bookStorage.getBook(savedBooks[0].id);
      if (lastBook && lastBook.fileData) {
        await this._loadPDFFromBuffer(lastBook.fileData, lastBook.fileName, lastBook.id, lastBook.lastPage || 1);
        this.showToast(`Documento restaurado: ${lastBook.title}`);
      } else {
        await this.loadBook(window.DEMO_BOOK);
      }
    } else {
      // Load initial user manual
      await this.loadBook(window.DEMO_BOOK);
    }

    // Register PWA Service Worker if served via HTTP/HTTPS
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }

  _cacheDOM() {
    this.dom = {
      appRoot: document.getElementById('appRoot'),
      appHeader: document.getElementById('appHeader'),
      appBottomHud: document.getElementById('appBottomHud'),
      readerWorkspace: document.getElementById('readerWorkspace'),
      docActiveTitle: document.getElementById('docActiveTitle'),

      // Panels
      panelFlipbook: document.getElementById('panelFlipbook'),
      panelReflow: document.getElementById('panelReflow'),
      flipbookContainer: document.getElementById('flipbookContainer'),
      reflowContainer: document.getElementById('reflowContainer'),

      // Controls
      btnMode3D: document.getElementById('btnMode3D'),
      btnModeReflow: document.getElementById('btnModeReflow'),
      btnOpenFile: document.getElementById('btnOpenFile'),
      filePicker: document.getElementById('filePicker'),
      btnFullscreen: document.getElementById('btnFullscreen'),
      btnOpenCatalog: document.getElementById('btnOpenCatalog'),
      catalogCountPill: document.getElementById('catalogCountPill'),

      // Navigation
      btnPrevPage: document.getElementById('btnPrevPage'),
      btnNextPage: document.getElementById('btnNextPage'),
      pageScrubber: document.getElementById('pageScrubber'),
      pageBadgePill: document.getElementById('pageBadgePill'),
      readingStatLabel: document.getElementById('readingStatLabel'),
      btnBookmarkToggle: document.getElementById('btnBookmarkToggle'),
      bookmarkStarIcon: document.getElementById('bookmarkStarIcon'),

      // TTS Audio
      btnStartTTS: document.getElementById('btnStartTTS'),
      floatingTTSBar: document.getElementById('floatingTTSBar'),
      ttsCurrentSentence: document.getElementById('ttsCurrentSentence'),
      ttsPlayIcon: document.getElementById('ttsPlayIcon'),
      btnTTSPausePlay: document.getElementById('btnTTSPausePlay'),
      btnTTSClose: document.getElementById('btnTTSClose'),
      ttsSpeedSelect: document.getElementById('ttsSpeedSelect'),

      // Drawers
      drawerBackdrop: document.getElementById('drawerBackdrop'),
      btnToggleTOC: document.getElementById('btnToggleTOC'),
      btnToggleSearch: document.getElementById('btnToggleSearch'),
      btnToggleNotes: document.getElementById('btnToggleNotes'),
      btnToggleSettings: document.getElementById('btnToggleSettings'),
      btnToggleExport: document.getElementById('btnToggleExport'),
      drawerCatalog: document.getElementById('drawerCatalog'),
      drawerTOC: document.getElementById('drawerTOC'),
      drawerSearch: document.getElementById('drawerSearch'),
      drawerNotes: document.getElementById('drawerNotes'),
      drawerSettings: document.getElementById('drawerSettings'),
      drawerExport: document.getElementById('drawerExport'),

      // Catalog elements
      btnCatalogUpload: document.getElementById('btnCatalogUpload'),
      catalogSearchInput: document.getElementById('catalogSearchInput'),
      catalogListContainer: document.getElementById('catalogListContainer'),

      // Drawer Content
      tocListContainer: document.getElementById('tocListContainer'),
      searchInput: document.getElementById('searchInput'),
      searchResultsContainer: document.getElementById('searchResultsContainer'),
      searchResultsCount: document.getElementById('searchResultsCount'),
      bookmarksListContainer: document.getElementById('bookmarksListContainer'),
      noteInput: document.getElementById('noteInput'),
      btnSaveNote: document.getElementById('btnSaveNote'),
      notesListContainer: document.getElementById('notesListContainer'),

      // Style inputs
      fontSizeSlider: document.getElementById('fontSizeSlider'),
      lineHeightSlider: document.getElementById('lineHeightSlider'),
      fontFamilySelect: document.getElementById('fontFamilySelect'),
      bionicToggle: document.getElementById('bionicToggle'),
      soundEffectsToggle: document.getElementById('soundEffectsToggle'),
      ambientSoundSelect: document.getElementById('ambientSoundSelect'),

      // Exports
      btnExportEpub: document.getElementById('btnExportEpub'),
      btnExportHtml: document.getElementById('btnExportHtml'),
      btnExportMarkdown: document.getElementById('btnExportMarkdown'),
      btnExportNotes: document.getElementById('btnExportNotes'),
      btnExportTxt: document.getElementById('btnExportTxt'),

      // Drag & Drop Overlay
      dropOverlay: document.getElementById('dropOverlay'),
      toastContainer: document.getElementById('toastContainer')
    };
  }

  _initEngines() {
    this.flipbook = new window.FlipbookCore(this.dom.flipbookContainer, {
      soundEnabled: true,
      onPageChange: (cur, total) => this._onPageUpdated(cur, total)
    });

    this.reflowReader = new window.ReflowReader(this.dom.reflowContainer, {
      onPageChange: (cur, total) => this._onPageUpdated(cur, total)
    });
  }

  _setupEventListeners() {
    // Mode Switching
    this.dom.btnMode3D.addEventListener('click', () => this.setReadingMode('3d'));
    this.dom.btnModeReflow.addEventListener('click', () => this.setReadingMode('reflow'));

    // File Pickers
    this.dom.btnOpenFile.addEventListener('click', () => this.dom.filePicker.click());
    if (this.dom.btnCatalogUpload) {
      this.dom.btnCatalogUpload.addEventListener('click', () => this.dom.filePicker.click());
    }

    this.dom.filePicker.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        this.handleFileUpload(e.target.files[0]);
      }
    });

    // Navigation
    this.dom.btnPrevPage.addEventListener('click', () => this.prevPage());
    this.dom.btnNextPage.addEventListener('click', () => this.nextPage());

    this.dom.pageScrubber.addEventListener('input', (e) => {
      const pageNum = parseInt(e.target.value);
      this.goToPage(pageNum);
    });

    this.dom.btnFullscreen.addEventListener('click', () => this.toggleFullscreen());

    // Drawer Toggles
    this.dom.btnOpenCatalog.addEventListener('click', () => {
      this.renderCatalog();
      this.toggleDrawer('drawerCatalog');
    });

    this.dom.btnToggleTOC.addEventListener('click', () => this.toggleDrawer('drawerTOC'));
    this.dom.btnToggleSearch.addEventListener('click', () => this.toggleDrawer('drawerSearch'));
    this.dom.btnToggleNotes.addEventListener('click', () => this.toggleDrawer('drawerNotes'));
    this.dom.btnToggleSettings.addEventListener('click', () => this.toggleDrawer('drawerSettings'));
    this.dom.btnToggleExport.addEventListener('click', () => this.toggleDrawer('drawerExport'));

    this.dom.drawerBackdrop.addEventListener('click', () => this.closeAllDrawers());
    document.querySelectorAll('[data-close-drawer]').forEach(btn => {
      btn.addEventListener('click', () => this.closeAllDrawers());
    });

    // Catalog search
    if (this.dom.catalogSearchInput) {
      this.dom.catalogSearchInput.addEventListener('input', (e) => {
        this.renderCatalog(e.target.value);
      });
    }

    // Bookmarks & Notes
    this.dom.btnBookmarkToggle.addEventListener('click', () => this.toggleCurrentBookmark());
    this.dom.btnSaveNote.addEventListener('click', () => this.saveCurrentNote());

    // Search Engine
    this.dom.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));

    // Text-To-Speech Controls
    this.dom.btnStartTTS.addEventListener('click', () => this.toggleTTS());
    this.dom.btnTTSPausePlay.addEventListener('click', () => this.toggleTTS());
    this.dom.btnTTSClose.addEventListener('click', () => this.stopTTS());
    this.dom.ttsSpeedSelect.addEventListener('change', (e) => {
      window.bookTTS.setRate(parseFloat(e.target.value));
    });

    // Themes
    document.querySelectorAll('.theme-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.theme-pill-btn').forEach(b => b.classList.remove('active-theme'));
        btn.classList.add('active-theme');
        const theme = btn.getAttribute('data-theme');
        this.reflowReader.setTheme(theme);
        this.showToast(`Tema: ${btn.innerText}`);
      });
    });

    this.dom.fontFamilySelect.addEventListener('change', (e) => {
      this.reflowReader.setFontFamily(e.target.value);
    });
    this.dom.fontSizeSlider.addEventListener('input', (e) => {
      this.reflowReader.setFontSize(e.target.value);
    });
    this.dom.lineHeightSlider.addEventListener('input', (e) => {
      this.reflowReader.setLineHeight(e.target.value);
    });
    this.dom.bionicToggle.addEventListener('change', (e) => {
      this.reflowReader.setBionicReading(e.target.checked);
      this.showToast(e.target.checked ? 'Lectura Biónica activada' : 'Lectura Biónica desactivada');
    });

    // Audio Settings
    this.dom.soundEffectsToggle.addEventListener('change', (e) => {
      window.bookAudio.setSoundEnabled(e.target.checked);
      this.flipbook.options.soundEnabled = e.target.checked;
    });
    this.dom.ambientSoundSelect.addEventListener('change', (e) => {
      window.bookAudio.setAmbientSound(e.target.value);
      if (e.target.value !== 'none') {
        this.showToast(`Ambiente: ${e.target.options[e.target.selectedIndex].text}`);
      }
    });

    // Exports
    this.dom.btnExportEpub.addEventListener('click', () => this.exportEpub());
    this.dom.btnExportHtml.addEventListener('click', () => this.exportStandaloneHtml());
    this.dom.btnExportMarkdown.addEventListener('click', () => this.exportMarkdown());
    this.dom.btnExportNotes.addEventListener('click', () => this.exportAnnotations());
    this.dom.btnExportTxt.addEventListener('click', () => this.exportPlainText());
  }

  _setupTouchGestures() {
    this.gestures = new window.GestureController(this.dom.readerWorkspace, {
      onSwipeLeft: () => this.nextPage(),
      onSwipeRight: () => this.prevPage(),
      onTapLeft: () => { if (this.readingMode === '3d') this.prevPage(); },
      onTapRight: () => { if (this.readingMode === '3d') this.nextPage(); },
      onTapCenter: () => this.toggleHUD(),
      onPinchZoom: (factor) => {
        if (this.readingMode === '3d') this.flipbook.setZoom(factor);
      },
      onDoubleTap: () => {
        if (this.readingMode === '3d') this.flipbook.resetZoom();
      }
    });
  }

  _setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      switch (e.key) {
        case 'ArrowRight':
        case ' ':
        case 'PageDown':
          e.preventDefault();
          this.nextPage();
          break;
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault();
          this.prevPage();
          break;
        case 'f':
        case 'F':
          this.toggleFullscreen();
          break;
        case 'm':
        case 'M':
          this.setReadingMode(this.readingMode === '3d' ? 'reflow' : '3d');
          break;
        case 'h':
        case 'H':
          this.toggleHUD();
          break;
        case 'Escape':
          this.closeAllDrawers();
          break;
      }
    });
  }

  _setupDragAndDrop() {
    const overlay = this.dom.dropOverlay;

    window.addEventListener('dragover', (e) => {
      e.preventDefault();
      overlay.classList.add('drag-over');
    });

    overlay.addEventListener('dragleave', (e) => {
      e.preventDefault();
      overlay.classList.remove('drag-over');
    });

    window.addEventListener('drop', (e) => {
      e.preventDefault();
      overlay.classList.remove('drag-over');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        this.handleFileUpload(e.dataTransfer.files[0]);
      }
    });
  }

  // --- Document Loading Pipeline & Persistent Storage ---
  async handleFileUpload(file) {
    const filename = file.name.toLowerCase();
    this.showToast(`Procesando ${file.name}...`, 'info');

    try {
      if (filename.endsWith('.pdf')) {
        const arrayBuffer = await file.arrayBuffer();
        await this._loadPDFFromBuffer(arrayBuffer, file.name, null, 1, true, file.size);
      } else if (filename.endsWith('.epub')) {
        await this._loadEPUBFile(file);
      } else if (filename.endsWith('.txt') || filename.endsWith('.md')) {
        await this._loadTextFile(file);
      } else {
        this.showToast('Formato no compatible. Admite PDF, EPUB, TXT o Markdown.', 'danger');
      }
    } catch (err) {
      console.error('Error al procesar archivo:', err);
      this.showToast(`Error al abrir documento: ${err.message}`, 'danger');
    }
  }

  async _loadPDFFromBuffer(arrayBuffer, originalFileName, existingBookId = null, initialPage = 1, shouldSave = false, fileSize = 0) {
    const result = await window.pdfEngine.loadDocument(arrayBuffer, (percent) => {
      this.dom.pageBadgePill.innerText = `${percent}%`;
    });

    const pages = [];
    let coverThumb = null;

    for (let p = 1; p <= result.numPages; p++) {
      const rendered = await window.pdfEngine.renderPage(p);
      const text = await window.pdfEngine.extractPageText(p);

      if (p === 1 && rendered && rendered.canvas) {
        coverThumb = rendered.canvas.toDataURL('image/jpeg', 0.7);
      }

      pages.push({
        pageNum: p,
        title: `Página ${p}`,
        canvas: rendered.canvas,
        text: text
      });
    }

    const title = result.metadata.title || originalFileName.replace(/\.[^/.]+$/, "");
    const author = result.metadata.author || 'Autor desconocido';

    const docModel = {
      title,
      author,
      numPages: result.numPages,
      outline: result.outline,
      pages: pages
    };

    // Save into persistent local storage if it's a new upload
    if (shouldSave) {
      try {
        const savedRecord = await window.bookStorage.saveBook({
          title,
          author,
          fileName: originalFileName,
          fileSize: fileSize || arrayBuffer.byteLength,
          totalPages: result.numPages,
          lastPage: initialPage,
          coverThumbnail: coverThumb,
          fileData: arrayBuffer
        });
        if (savedRecord) {
          this.currentBookId = savedRecord.id;
          await this.refreshCatalogCount();
          this.showToast('PDF guardado en tu catálogo personal');
        }
      } catch (e) {
        console.warn('Error al guardar en catálogo local:', e);
      }
    } else if (existingBookId) {
      this.currentBookId = existingBookId;
    }

    await this.loadBook(docModel);
    if (initialPage > 1) {
      this.goToPage(initialPage);
    }
  }

  async _loadEPUBFile(file) {
    const parsed = await window.epubEngine.parseEpub(file);
    await this.loadBook(parsed);
    this.showToast(`EPUB cargado: ${parsed.title}`);
  }

  async _loadTextFile(file) {
    const content = await file.text();
    const rawPages = content.split(/\n(?=#{1,2}\s)/);
    const pages = rawPages.map((chunk, idx) => ({
      pageNum: idx + 1,
      title: `Sección ${idx + 1}`,
      text: chunk.trim()
    }));

    const docModel = {
      title: file.name.replace(/\.[^/.]+$/, ""),
      author: 'Documento de texto',
      numPages: pages.length,
      outline: pages.map(p => ({ title: p.title, page: p.pageNum, items: [] })),
      pages: pages
    };

    await this.loadBook(docModel);
    this.showToast('Documento cargado correctamente');
  }

  async loadBook(bookModel) {
    this.currentDoc = bookModel;
    this.pages = bookModel.pages || [];
    this.totalPages = this.pages.length;
    this.currentPage = 1;

    // Header Title
    this.dom.docActiveTitle.innerText = `${bookModel.title}`;

    // Scrubber
    this.dom.pageScrubber.min = 1;
    this.dom.pageScrubber.max = this.totalPages;
    this.dom.pageScrubber.value = 1;

    // Load into 3D Flipbook & Reflow Reader
    this.flipbook.setPages(this.pages);
    this.reflowReader.setPages(this.pages);

    this._renderTOCList(bookModel.outline || []);
    this._renderBookmarks();
    this._renderNotes();
    this._updateHUDStats();
  }

  // --- Personal Catalog UI ---
  async refreshCatalogCount() {
    const books = await window.bookStorage.getAllBooks();
    if (this.dom.catalogCountPill) {
      this.dom.catalogCountPill.innerText = books.length;
    }
  }

  async renderCatalog(filterQuery = '') {
    const container = this.dom.catalogListContainer;
    if (!container) return;

    const books = await window.bookStorage.getAllBooks();
    let filtered = books;
    if (filterQuery && filterQuery.trim()) {
      const q = filterQuery.toLowerCase().trim();
      filtered = books.filter(b => b.title.toLowerCase().includes(q) || b.fileName.toLowerCase().includes(q));
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding: 30px 10px; color: var(--hud-subtext);">
          <p style="font-size: 0.88rem; margin-bottom: 6px;">${filterQuery ? 'No hay documentos que coincidan con la búsqueda.' : 'No hay documentos en tu catálogo todavía.'}</p>
          <p style="font-size: 0.78rem;">Usa el botón "+ Subir nuevo PDF" para guardar tus documentos aquí.</p>
        </div>
      `;
      return;
    }

    let html = '';
    filtered.forEach(book => {
      const sizeMb = (book.fileSize / (1024 * 1024)).toFixed(1);
      const progressPercent = Math.round((book.lastPage / book.totalPages) * 100);
      const dateStr = new Date(book.lastOpenedAt || book.addedAt).toLocaleDateString();

      const thumbImg = book.coverThumbnail
        ? `<img src="${book.coverThumbnail}" alt="Portada">`
        : `<svg viewBox="0 0 24 24" width="22" height="22" stroke="#6b7280" stroke-width="1.5" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`;

      html += `
        <div class="catalog-card" data-book-id="${book.id}">
          <div class="catalog-thumb-container">
            ${thumbImg}
          </div>
          <div class="catalog-card-info">
            <div class="catalog-card-title" title="${book.title}">${book.title}</div>
            <div class="catalog-card-meta">${sizeMb} MB · Último acceso: ${dateStr}</div>
            
            <div class="catalog-progress-bar-wrap">
              <div class="catalog-progress-bar-fill" style="width: ${progressPercent}%;"></div>
            </div>

            <div class="catalog-card-actions">
              <span style="font-size: 0.74rem; color: var(--hud-subtext);">Pág. ${book.lastPage} / ${book.totalPages}</span>
              <div style="display:flex; align-items:center; gap:6px;">
                <button class="catalog-open-btn" onclick="window.luminaApp.openBookFromCatalog('${book.id}')">Abrir</button>
                <button class="catalog-delete-btn" title="Eliminar del catálogo" onclick="window.luminaApp.deleteBookFromCatalog('${book.id}', event)">
                  <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  async openBookFromCatalog(id) {
    this.showToast('Cargando documento...', 'info');
    const book = await window.bookStorage.getBook(id);
    if (!book || !book.fileData) {
      this.showToast('No se pudo encontrar el archivo en la base de datos', 'danger');
      return;
    }
    this.closeAllDrawers();
    await this._loadPDFFromBuffer(book.fileData, book.fileName, book.id, book.lastPage || 1);
    this.showToast(`Abierto: ${book.title}`);
  }

  async deleteBookFromCatalog(id, event) {
    if (event) event.stopPropagation();
    if (!confirm('¿Deseas eliminar este documento del catálogo local?')) return;

    await window.bookStorage.deleteBook(id);
    if (this.currentBookId === id) {
      this.currentBookId = null;
    }
    await this.refreshCatalogCount();
    await this.renderCatalog();
    this.showToast('Documento eliminado del catálogo');
  }

  // --- Reading Modes ---
  setReadingMode(mode) {
    this.readingMode = mode;
    if (mode === '3d') {
      this.dom.btnMode3D.classList.add('active');
      this.dom.btnModeReflow.classList.remove('active');
      this.dom.panelFlipbook.classList.add('active-panel');
      this.dom.panelReflow.classList.remove('active-panel');
      this.flipbook.goToPage(this.currentPage);
    } else {
      this.dom.btnModeReflow.classList.add('active');
      this.dom.btnMode3D.classList.remove('active');
      this.dom.panelReflow.classList.add('active-panel');
      this.dom.panelFlipbook.classList.remove('active-panel');
      this.reflowReader.scrollToPage(this.currentPage);
    }
  }

  // --- Navigation & Progress Tracking ---
  nextPage() {
    if (this.readingMode === '3d') {
      this.flipbook.next();
    } else {
      if (this.currentPage < this.totalPages) {
        this.goToPage(this.currentPage + 1);
      }
    }
  }

  prevPage() {
    if (this.readingMode === '3d') {
      this.flipbook.prev();
    } else {
      if (this.currentPage > 1) {
        this.goToPage(this.currentPage - 1);
      }
    }
  }

  goToPage(num) {
    const pageNum = Math.max(1, Math.min(this.totalPages, num));
    this.currentPage = pageNum;
    if (this.readingMode === '3d') {
      this.flipbook.goToPage(pageNum);
    } else {
      this.reflowReader.scrollToPage(pageNum);
    }
    this._updateHUDStats();

    // Persist progress in local catalog
    if (this.currentBookId) {
      window.bookStorage.updateProgress(this.currentBookId, this.currentPage).catch(() => {});
    }
  }

  _onPageUpdated(page, total) {
    this.currentPage = page;
    this.totalPages = total;
    this._updateHUDStats();

    if (this.currentBookId) {
      window.bookStorage.updateProgress(this.currentBookId, this.currentPage).catch(() => {});
    }
  }

  _updateHUDStats() {
    this.dom.pageBadgePill.innerText = `Pág. ${this.currentPage} / ${this.totalPages}`;
    this.dom.pageScrubber.value = this.currentPage;

    const isBookmarked = window.bookAnnotations.isBookmarked(this.currentPage);
    if (this.dom.bookmarkStarIcon) {
      this.dom.bookmarkStarIcon.style.color = isBookmarked ? '#3b82f6' : 'inherit';
    }

    const stats = window.bookAnnotations.getReadingStats(this.currentPage, this.totalPages);
    this.dom.readingStatLabel.innerText = `Progreso: ${stats.progressPercent}%`;
  }

  // --- HUD Visibility & Fullscreen ---
  toggleHUD() {
    this.hudVisible = !this.hudVisible;
    if (this.hudVisible) {
      this.dom.appHeader.classList.remove('hud-hidden');
      this.dom.appBottomHud.classList.remove('hud-hidden');
    } else {
      this.dom.appHeader.classList.add('hud-hidden');
      this.dom.appBottomHud.classList.add('hud-hidden');
    }
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  // --- Drawers Management ---
  toggleDrawer(drawerId) {
    if (this.activeDrawer === drawerId) {
      this.closeAllDrawers();
      return;
    }
    this.closeAllDrawers();
    const drawer = document.getElementById(drawerId);
    if (drawer) {
      drawer.classList.add('drawer-open');
      this.dom.drawerBackdrop.classList.add('open');
      this.activeDrawer = drawerId;
    }
  }

  closeAllDrawers() {
    document.querySelectorAll('.side-drawer').forEach(d => d.classList.remove('drawer-open'));
    this.dom.drawerBackdrop.classList.remove('open');
    this.activeDrawer = null;
  }

  _renderTOCList(outline) {
    const list = this.dom.tocListContainer;
    list.innerHTML = '';

    if (!outline || outline.length === 0) {
      list.innerHTML = `<li style="color:var(--hud-subtext); padding:8px 0; font-size:0.8rem;">Sin índice disponible.</li>`;
      return;
    }

    outline.forEach(item => {
      const li = document.createElement('li');
      li.className = 'toc-drawer-item';
      li.innerHTML = `<span>${item.title}</span><span style="font-size:0.75rem; color:var(--hud-subtext);">Pág. ${item.page}</span>`;
      li.addEventListener('click', () => {
        this.goToPage(item.page);
        this.closeAllDrawers();
      });
      list.appendChild(li);
    });
  }

  // --- Bookmarks & Notes ---
  toggleCurrentBookmark() {
    const added = window.bookAnnotations.toggleBookmark(this.currentPage, `Página ${this.currentPage}`);
    this._updateHUDStats();
    this._renderBookmarks();
    this.showToast(added ? 'Marcador añadido' : 'Marcador eliminado');
  }

  _renderBookmarks() {
    const container = this.dom.bookmarksListContainer;
    const bookmarks = window.bookAnnotations.getBookmarks();
    if (bookmarks.length === 0) {
      container.innerHTML = `<p style="font-size:0.78rem; color:var(--hud-subtext);">Sin marcadores guardados.</p>`;
      return;
    }

    let html = '';
    bookmarks.forEach(bm => {
      html += `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:7px 10px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:4px; margin-bottom:5px; cursor:pointer;" onclick="window.luminaApp.goToPage(${bm.page}); window.luminaApp.closeAllDrawers();">
          <div>
            <div style="font-weight:600; font-size:0.82rem; color:#fff;">Página ${bm.page}</div>
            <div style="font-size:0.72rem; color:var(--hud-subtext);">${bm.date}</div>
          </div>
          <button style="background:transparent; border:none; color:#ef4444; font-size:0.8rem; cursor:pointer;" onclick="event.stopPropagation(); window.luminaApp.removeBookmark(${bm.page});">Eliminar</button>
        </div>
      `;
    });
    container.innerHTML = html;
  }

  removeBookmark(page) {
    window.bookAnnotations.removeBookmark(page);
    this._updateHUDStats();
    this._renderBookmarks();
  }

  saveCurrentNote() {
    const text = this.dom.noteInput.value.trim();
    if (!text) return;
    window.bookAnnotations.addNote(this.currentPage, text);
    this.dom.noteInput.value = '';
    this._renderNotes();
    this.showToast('Nota guardada');
  }

  _renderNotes() {
    const container = this.dom.notesListContainer;
    const all = window.bookAnnotations.getAllData();
    const notes = all.notes || [];

    if (notes.length === 0) {
      container.innerHTML = `<p style="font-size:0.78rem; color:var(--hud-subtext);">Sin notas en este documento.</p>`;
      return;
    }

    let html = '';
    notes.forEach(note => {
      html += `
        <div style="padding:8px 10px; background:rgba(255,255,255,0.03); border-left:2px solid #3b82f6; border-radius:4px; margin-bottom:6px;">
          <div style="display:flex; justify-content:space-between; font-size:0.72rem; color:var(--hud-subtext); margin-bottom:3px;">
            <span>Página ${note.page}</span>
            <span>${note.date}</span>
          </div>
          <p style="font-size:0.8rem; color:#d1d5db; white-space:pre-wrap;">${note.content}</p>
        </div>
      `;
    });
    container.innerHTML = html;
  }

  // --- Search Engine ---
  handleSearch(query) {
    const results = window.bookAnnotations.search(query, this.pages);
    const container = this.dom.searchResultsContainer;
    const countEl = this.dom.searchResultsCount;

    if (!query.trim()) {
      container.innerHTML = '';
      countEl.innerText = '';
      return;
    }

    countEl.innerText = `${results.length} coincidencias`;

    if (results.length === 0) {
      container.innerHTML = `<p style="font-size:0.78rem; color:var(--hud-subtext);">Sin resultados.</p>`;
      return;
    }

    let html = '';
    results.slice(0, 30).forEach(r => {
      html += `
        <div style="padding:8px 10px; background:rgba(255,255,255,0.03); border-radius:4px; margin-bottom:6px; cursor:pointer;" onclick="window.luminaApp.goToPage(${r.page}); window.luminaApp.closeAllDrawers();">
          <div style="font-size:0.72rem; font-weight:600; color:#3b82f6; margin-bottom:2px;">PÁGINA ${r.page}</div>
          <p style="font-size:0.78rem; color:#d1d5db; line-height:1.35;">${r.snippet}</p>
        </div>
      `;
    });
    container.innerHTML = html;
  }

  // --- Text-To-Speech (Audiolibro) ---
  toggleTTS() {
    if (!window.bookTTS.isPlaying) {
      const pageData = this.pages[this.currentPage - 1];
      const textToRead = pageData ? (pageData.text || '') : '';

      if (!textToRead.trim()) {
        this.showToast('No hay texto detectable en esta página para leer.', 'warning');
        return;
      }

      this.dom.floatingTTSBar.classList.add('tts-active');
      this.dom.ttsPlayIcon.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;

      window.bookTTS.readText(
        textToRead,
        (progress) => {
          if (progress) {
            this.dom.ttsCurrentSentence.innerText = progress.sentence;
          }
        },
        () => {
          if (this.currentPage < this.totalPages) {
            this.nextPage();
            setTimeout(() => this.toggleTTS(), 800);
          } else {
            this.stopTTS();
            this.showToast('Fin de la lectura del documento.');
          }
        }
      );
    } else if (window.bookTTS.isPaused) {
      window.bookTTS.resume();
      this.dom.ttsPlayIcon.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
    } else {
      window.bookTTS.pause();
      this.dom.ttsPlayIcon.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
    }
  }

  stopTTS() {
    window.bookTTS.stop();
    this.dom.floatingTTSBar.classList.remove('tts-active');
    this.dom.ttsPlayIcon.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
    this.dom.ttsCurrentSentence.innerText = 'Lectura detenida';
  }

  // --- Conversion & Export Actions ---
  async exportEpub() {
    this.showToast('Generando eBook EPUB 3.0 estándar...', 'info');
    try {
      let coverUrl = null;
      if (this.pages[0]) {
        if (this.pages[0].canvas) {
          coverUrl = this.pages[0].canvas.toDataURL('image/jpeg', 0.85);
        } else if (this.pages[0].imageData) {
          coverUrl = this.pages[0].imageData;
        }
      }

      const result = await window.epubEngine.generateEpub({
        title: this.currentDoc.title,
        author: this.currentDoc.author,
        pages: this.pages,
        coverDataUrl: coverUrl,
        outline: this.currentDoc.outline
      });

      window.universalExporter.downloadFile(result.blob, result.filename, 'application/epub+zip');
      this.showToast('Archivo EPUB descargado con éxito');
      this.closeAllDrawers();
    } catch (e) {
      console.error(e);
      this.showToast(`Error al exportar: ${e.message}`, 'danger');
    }
  }

  exportStandaloneHtml() {
    this.showToast('Generando Flipbook HTML autónomo...', 'info');
    const pagesWithImages = this.pages.map(p => ({
      pageNum: p.pageNum,
      title: p.title,
      text: p.text,
      imageData: p.canvas ? p.canvas.toDataURL('image/jpeg', 0.82) : (p.imageData || null)
    }));

    window.universalExporter.exportStandaloneHtml(
      this.currentDoc.title,
      this.currentDoc.author,
      pagesWithImages
    );
    this.showToast('Flipbook HTML descargado');
    this.closeAllDrawers();
  }

  exportMarkdown() {
    window.universalExporter.exportToMarkdown(
      this.currentDoc.title,
      this.currentDoc.author,
      this.pages
    );
    this.showToast('Markdown descargado');
    this.closeAllDrawers();
  }

  exportAnnotations() {
    window.universalExporter.exportAnnotations(
      this.currentDoc.title,
      window.bookAnnotations.getAllData(),
      'md'
    );
    this.showToast('Anotaciones exportadas');
    this.closeAllDrawers();
  }

  exportPlainText() {
    window.universalExporter.exportToText(
      this.currentDoc.title,
      this.currentDoc.author,
      this.pages
    );
    this.showToast('Texto plano descargado');
    this.closeAllDrawers();
  }

  // --- Toast Notification System ---
  showToast(message, type = 'default') {
    const container = this.dom.toastContainer;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-6px)';
      setTimeout(() => {
        if (toast.parentNode === container) {
          container.removeChild(toast);
        }
      }, 200);
    }, 2800);
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.luminaApp = new LuminaApp();
});
