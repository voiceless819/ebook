/**
 * LuminaBook - Master Application Orchestrator
 * Connects 3D Flipbook, Reflow Reader, PDF/EPUB engines, Gestures, Audio, TTS & UI.
 */

class LuminaApp {
  constructor() {
    this.currentDoc = null;
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

    // Load initial pre-loaded masterpiece demo book immediately
    await this.loadBook(window.DEMO_BOOK);
    this.showToast('¡Bienvenido a LuminaBook! Desliza o toca para hojear.', 'info');

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
      drawerTOC: document.getElementById('drawerTOC'),
      drawerSearch: document.getElementById('drawerSearch'),
      drawerNotes: document.getElementById('drawerNotes'),
      drawerSettings: document.getElementById('drawerSettings'),
      drawerExport: document.getElementById('drawerExport'),

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
      ambientVolumeSlider: document.getElementById('ambientVolumeSlider'),

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
    // 1. Initialize Flipbook 3D Core
    this.flipbook = new window.FlipbookCore(this.dom.flipbookContainer, {
      soundEnabled: true,
      onPageChange: (cur, total) => this._onPageUpdated(cur, total)
    });

    // 2. Initialize Liquid Reflow Reader
    this.reflowReader = new window.ReflowReader(this.dom.reflowContainer, {
      onPageChange: (cur, total) => this._onPageUpdated(cur, total)
    });
  }

  _setupEventListeners() {
    // Mode Switching
    this.dom.btnMode3D.addEventListener('click', () => this.setReadingMode('3d'));
    this.dom.btnModeReflow.addEventListener('click', () => this.setReadingMode('reflow'));

    // File Picker Trigger
    this.dom.btnOpenFile.addEventListener('click', () => this.dom.filePicker.click());
    this.dom.filePicker.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        this.handleFileUpload(e.target.files[0]);
      }
    });

    // Navigation Buttons
    this.dom.btnPrevPage.addEventListener('click', () => this.prevPage());
    this.dom.btnNextPage.addEventListener('click', () => this.nextPage());

    // Scrubber Navigation
    this.dom.pageScrubber.addEventListener('input', (e) => {
      const pageNum = parseInt(e.target.value);
      this.goToPage(pageNum);
    });

    // Fullscreen Toggle
    this.dom.btnFullscreen.addEventListener('click', () => this.toggleFullscreen());

    // Drawer Toggles
    this.dom.btnToggleTOC.addEventListener('click', () => this.toggleDrawer('drawerTOC'));
    this.dom.btnToggleSearch.addEventListener('click', () => this.toggleDrawer('drawerSearch'));
    this.dom.btnToggleNotes.addEventListener('click', () => this.toggleDrawer('drawerNotes'));
    this.dom.btnToggleSettings.addEventListener('click', () => this.toggleDrawer('drawerSettings'));
    this.dom.btnToggleExport.addEventListener('click', () => this.toggleDrawer('drawerExport'));

    this.dom.drawerBackdrop.addEventListener('click', () => this.closeAllDrawers());
    document.querySelectorAll('[data-close-drawer]').forEach(btn => {
      btn.addEventListener('click', () => this.closeAllDrawers());
    });

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

    // Styles & Human Themes
    document.querySelectorAll('.theme-pill-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.theme-pill-btn').forEach(b => b.classList.remove('active-theme'));
        btn.classList.add('active-theme');
        const theme = btn.getAttribute('data-theme');
        this.reflowReader.setTheme(theme);
        this.showToast(`Tema aplicado: ${btn.innerText}`);
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
        this.showToast(`Sonido ambiente activado: ${e.target.options[e.target.selectedIndex].text}`);
      }
    });
    this.dom.ambientVolumeSlider.addEventListener('input', (e) => {
      window.bookAudio.setAmbientVolume(parseFloat(e.target.value));
    });

    // Export Buttons
    this.dom.btnExportEpub.addEventListener('click', () => this.exportEpub());
    this.dom.btnExportHtml.addEventListener('click', () => this.exportStandaloneHtml());
    this.dom.btnExportMarkdown.addEventListener('click', () => this.exportMarkdown());
    this.dom.btnExportNotes.addEventListener('click', () => this.exportAnnotations());
    this.dom.btnExportTxt.addEventListener('click', () => this.exportPlainText());
  }

  _setupTouchGestures() {
    this.gestures = new window.GestureController(this.dom.readerWorkspace, {
      onSwipeLeft: () => {
        this.nextPage();
      },
      onSwipeRight: () => {
        this.prevPage();
      },
      onTapLeft: () => {
        if (this.readingMode === '3d') this.prevPage();
      },
      onTapRight: () => {
        if (this.readingMode === '3d') this.nextPage();
      },
      onTapCenter: () => {
        this.toggleHUD();
      },
      onPinchZoom: (factor) => {
        if (this.readingMode === '3d') {
          this.flipbook.setZoom(factor);
        }
      },
      onDoubleTap: () => {
        if (this.readingMode === '3d') {
          this.flipbook.resetZoom();
        }
      }
    });
  }

  _setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Don't intercept when user is typing in search or note input
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

  // --- Document Loading Pipeline ---
  async handleFileUpload(file) {
    const filename = file.name.toLowerCase();
    this.showToast(`Cargando archivo: ${file.name}...`, 'info');

    try {
      if (filename.endsWith('.pdf')) {
        await this._loadPDFFile(file);
      } else if (filename.endsWith('.epub')) {
        await this._loadEPUBFile(file);
      } else if (filename.endsWith('.txt') || filename.endsWith('.md')) {
        await this._loadTextFile(file);
      } else {
        this.showToast('Formato no compatible. Por favor sube PDF, EPUB, TXT o Markdown.', 'danger');
      }
    } catch (err) {
      console.error('Error al procesar archivo:', err);
      this.showToast(`Error al abrir documento: ${err.message}`, 'danger');
    }
  }

  async _loadPDFFile(file) {
    this.showToast('Procesando páginas PDF y renderizando...', 'info');

    const result = await window.pdfEngine.loadDocument(file, (percent) => {
      this.dom.pageBadgePill.innerText = `${percent}%`;
    });

    const pages = [];
    for (let p = 1; p <= result.numPages; p++) {
      const rendered = await window.pdfEngine.renderPage(p);
      const text = await window.pdfEngine.extractPageText(p);
      pages.push({
        pageNum: p,
        title: `Página ${p}`,
        canvas: rendered.canvas,
        text: text
      });
    }

    const docModel = {
      title: result.metadata.title || file.name.replace(/\.[^/.]+$/, ""),
      author: result.metadata.author || 'Autor Desconocido',
      numPages: result.numPages,
      outline: result.outline,
      pages: pages
    };

    await this.loadBook(docModel);
    this.showToast(`¡PDF cargado con éxito! (${result.numPages} páginas)`);
  }

  async _loadEPUBFile(file) {
    this.showToast('Extrayendo capítulos de EPUB...', 'info');
    const parsed = await window.epubEngine.parseEpub(file);
    await this.loadBook(parsed);
    this.showToast(`¡EPUB cargado con éxito! (${parsed.pages.length} capítulos)`);
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
      author: 'Documento de Texto',
      numPages: pages.length,
      outline: pages.map(p => ({ title: p.title, page: p.pageNum, items: [] })),
      pages: pages
    };

    await this.loadBook(docModel);
    this.showToast('¡Texto cargado correctamente!');
  }

  async loadBook(bookModel) {
    this.currentDoc = bookModel;
    this.pages = bookModel.pages || [];
    this.totalPages = this.pages.length;
    this.currentPage = 1;

    // Update Header Title
    this.dom.docActiveTitle.innerText = `${bookModel.title} — ${bookModel.author || ''}`;

    // Update Scrubber
    this.dom.pageScrubber.min = 1;
    this.dom.pageScrubber.max = this.totalPages;
    this.dom.pageScrubber.value = 1;

    // Load into 3D Flipbook & Reflow Reader
    this.flipbook.setPages(this.pages);
    this.reflowReader.setPages(this.pages);

    // Render TOC Drawer
    this._renderTOCList(bookModel.outline || []);

    // Render Bookmarks & Notes
    this._renderBookmarks();
    this._renderNotes();

    this._updateHUDStats();
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
    this.showToast(mode === '3d' ? 'Modo Libro 3D Realista' : 'Modo eBook Reflow');
  }

  // --- Navigation ---
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
  }

  _onPageUpdated(page, total) {
    this.currentPage = page;
    this.totalPages = total;
    this._updateHUDStats();
  }

  _updateHUDStats() {
    this.dom.pageBadgePill.innerText = `Pág. ${this.currentPage} / ${this.totalPages}`;
    this.dom.pageScrubber.value = this.currentPage;

    // Check Bookmark status
    const isBookmarked = window.bookAnnotations.isBookmarked(this.currentPage);
    this.dom.bookmarkStarIcon.innerText = isBookmarked ? '★' : '☆';
    this.dom.bookmarkStarIcon.style.color = isBookmarked ? 'var(--accent-gold)' : 'inherit';

    // Reading time calculation
    const stats = window.bookAnnotations.getReadingStats(this.currentPage, this.totalPages);
    this.dom.readingStatLabel.innerText = `Restan: ~${stats.minutesRemaining} min (${stats.progressPercent}%)`;
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
      list.innerHTML = `<li style="color:var(--hud-subtext); padding:10px;">No se encontró índice estructurado.</li>`;
      return;
    }

    outline.forEach(item => {
      const li = document.createElement('li');
      li.className = 'toc-drawer-item';
      li.innerHTML = `<span>${item.title}</span><span style="font-size:0.8rem; color:var(--hud-subtext);">Pág. ${item.page}</span>`;
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
    this.showToast(added ? '★ Marcador guardado' : 'Marcador eliminado');
  }

  _renderBookmarks() {
    const container = this.dom.bookmarksListContainer;
    const bookmarks = window.bookAnnotations.getBookmarks();
    if (bookmarks.length === 0) {
      container.innerHTML = `<p style="font-size:0.8rem; color:var(--hud-subtext);">No tienes marcadores guardados todavía.</p>`;
      return;
    }

    let html = '';
    bookmarks.forEach(bm => {
      html += `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 10px; background:rgba(255,255,255,0.04); border-radius:6px; margin-bottom:6px; cursor:pointer;" onclick="window.luminaApp.goToPage(${bm.page}); window.luminaApp.closeAllDrawers();">
          <div>
            <div style="font-weight:600; font-size:0.85rem; color:#fff;">Página ${bm.page}</div>
            <div style="font-size:0.75rem; color:var(--hud-subtext);">${bm.date}</div>
          </div>
          <button style="background:transparent; border:none; color:#ef4444; font-size:0.9rem; cursor:pointer;" onclick="event.stopPropagation(); window.luminaApp.removeBookmark(${bm.page});">✕</button>
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
    this.showToast('Nota guardada con éxito');
  }

  _renderNotes() {
    const container = this.dom.notesListContainer;
    const all = window.bookAnnotations.getAllData();
    const notes = all.notes || [];

    if (notes.length === 0) {
      container.innerHTML = `<p style="font-size:0.8rem; color:var(--hud-subtext);">Sin notas en este libro.</p>`;
      return;
    }

    let html = '';
    notes.forEach(note => {
      html += `
        <div style="padding:10px; background:rgba(255,255,255,0.04); border-left:3px solid var(--accent-gold); border-radius:6px; margin-bottom:8px;">
          <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--hud-subtext); margin-bottom:4px;">
            <span>Página ${note.page}</span>
            <span>${note.date}</span>
          </div>
          <p style="font-size:0.84rem; color:#e5e7eb; white-space:pre-wrap;">${note.content}</p>
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

    countEl.innerText = `${results.length} coincidencias encontradas`;

    if (results.length === 0) {
      container.innerHTML = `<p style="font-size:0.8rem; color:var(--hud-subtext);">No se encontraron resultados para "${query}".</p>`;
      return;
    }

    let html = '';
    results.slice(0, 30).forEach(r => {
      html += `
        <div style="padding:10px; background:rgba(255,255,255,0.04); border-radius:6px; margin-bottom:8px; cursor:pointer;" onclick="window.luminaApp.goToPage(${r.page}); window.luminaApp.closeAllDrawers();">
          <div style="font-size:0.75rem; font-weight:700; color:var(--accent-gold); margin-bottom:3px;">PÁGINA ${r.page}</div>
          <p style="font-size:0.82rem; color:#d1d5db; line-height:1.4;">${r.snippet}</p>
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
      this.dom.ttsPlayIcon.innerText = '⏸️';

      window.bookTTS.readText(
        textToRead,
        (progress) => {
          if (progress) {
            this.dom.ttsCurrentSentence.innerText = progress.sentence;
          }
        },
        () => {
          // Finished reading page: turn to next page automatically!
          if (this.currentPage < this.totalPages) {
            this.nextPage();
            setTimeout(() => this.toggleTTS(), 800);
          } else {
            this.stopTTS();
            this.showToast('Fin de la lectura del libro.');
          }
        }
      );
    } else if (window.bookTTS.isPaused) {
      window.bookTTS.resume();
      this.dom.ttsPlayIcon.innerText = '⏸️';
    } else {
      window.bookTTS.pause();
      this.dom.ttsPlayIcon.innerText = '▶️';
    }
  }

  stopTTS() {
    window.bookTTS.stop();
    this.dom.floatingTTSBar.classList.remove('tts-active');
    this.dom.ttsPlayIcon.innerText = '▶️';
    this.dom.ttsCurrentSentence.innerText = 'Audiolibro detenido';
  }

  // --- Conversion & Export Actions ---
  async exportEpub() {
    this.showToast('Generando eBook EPUB 3.0 estándar...', 'info');
    try {
      let coverUrl = null;
      if (this.pages[0]) {
        if (this.pages[0].canvas) {
          coverUrl = this.pages[0].canvas.toDataURL('image/jpeg', 0.9);
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
      }, (percent) => {
        this.showToast(`Empaquetando EPUB: ${percent}%`, 'info');
      });

      window.universalExporter.downloadFile(result.blob, result.filename, 'application/epub+zip');
      this.showToast('¡eBook EPUB descargado exitosamente!', 'success');
      this.closeAllDrawers();
    } catch (e) {
      console.error(e);
      this.showToast(`Error al exportar EPUB: ${e.message}`, 'danger');
    }
  }

  exportStandaloneHtml() {
    this.showToast('Generando Flipbook HTML autónomo...', 'info');
    const pagesWithImages = this.pages.map(p => ({
      pageNum: p.pageNum,
      title: p.title,
      text: p.text,
      imageData: p.canvas ? p.canvas.toDataURL('image/jpeg', 0.85) : (p.imageData || null)
    }));

    window.universalExporter.exportStandaloneHtml(
      this.currentDoc.title,
      this.currentDoc.author,
      pagesWithImages
    );
    this.showToast('¡Flipbook HTML descargado con éxito!');
    this.closeAllDrawers();
  }

  exportMarkdown() {
    window.universalExporter.exportToMarkdown(
      this.currentDoc.title,
      this.currentDoc.author,
      this.pages
    );
    this.showToast('Archivo Markdown (.md) descargado.');
    this.closeAllDrawers();
  }

  exportAnnotations() {
    window.universalExporter.exportAnnotations(
      this.currentDoc.title,
      window.bookAnnotations.getAllData(),
      'md'
    );
    this.showToast('Notas y marcadores exportados.');
    this.closeAllDrawers();
  }

  exportPlainText() {
    window.universalExporter.exportToText(
      this.currentDoc.title,
      this.currentDoc.author,
      this.pages
    );
    this.showToast('Archivo de texto (.txt) descargado.');
    this.closeAllDrawers();
  }

  // --- Toast Notification System ---
  showToast(message, type = 'default') {
    const container = this.dom.toastContainer;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = '✦';
    if (type === 'success') icon = '✓';
    if (type === 'danger') icon = '⚠';
    if (type === 'info') icon = 'ℹ';

    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(() => container.removeChild(toast), 300);
    }, 3200);
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.luminaApp = new LuminaApp();
});
