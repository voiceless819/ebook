/**
 * LuminaBook - Application Orchestrator
 * Integrates PDF/EPUB engines, persistent IndexedDB personal catalog, 3D flipbook,
 * continuous vertical scroll, reflow reader, study suite, gestures & ergonomics.
 */

class LuminaApp {
  constructor() {
    this.currentDoc = null;
    this.currentBookId = null;
    this.pages = [];
    this.currentPage = 1;
    this.totalPages = 1;
    this.readingMode = '3d'; // '3d' | 'reflow' | 'scroll'
    this.hudVisible = true;
    this.isSoloMode = false;
    this.activeDrawer = null;

    // Catalog state
    this.catalogTab = 'books'; // 'books' | 'trash'
    this.catalogView = 'grid'; // 'grid' | 'list'
    this.catalogSort = 'recent';
    this.catalogTagFilter = 'all';

    // Pastel Highlighter active color
    this.activeHighlighterColor = 'yellow';

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
    this._updateReadingAnalyticsSummary();

    // Check if user has previously saved books in their personal catalog
    const savedBooks = await window.bookStorage.getAllBooks(false);
    if (savedBooks.length > 0) {
      const lastBook = await window.bookStorage.getBook(savedBooks[0].id);
      if (lastBook && lastBook.fileData) {
        try {
          await this._loadPDFFromBuffer(lastBook.fileData, lastBook.fileName, lastBook.id, lastBook.lastPage || 1);
          this.showToast(`Documento restaurado: ${lastBook.title}`);
        } catch (restoreErr) {
          console.warn('No se pudo restaurar el último libro, cargando manual:', restoreErr);
          await this.loadBook(window.DEMO_BOOK);
        }
      } else {
        await this.loadBook(window.DEMO_BOOK);
      }
    } else {
      await this.loadBook(window.DEMO_BOOK);
    }

    // Restore spread mode preference
    try {
      const savedSpread = localStorage.getItem('luminabook_spread_mode');
      if (savedSpread) {
        this.setSpreadMode(savedSpread);
      }
    } catch (e) {}

    // Register PWA Service Worker if served via HTTP/HTTPS & force update check
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('./sw.js?v=7.0').then(reg => {
        reg.update();
      }).catch(() => {});
    }
  }

  _cacheDOM() {
    this.dom = {
      appRoot: document.getElementById('appRoot'),
      appHeader: document.getElementById('appHeader'),
      appBottomHud: document.getElementById('appBottomHud'),
      readerWorkspace: document.getElementById('readerWorkspace'),
      docActiveTitle: document.getElementById('docActiveTitle'),

      // Reading Mode Panels
      panelFlipbook: document.getElementById('panelFlipbook'),
      panelReflow: document.getElementById('panelReflow'),
      panelScroll: document.getElementById('panelScroll'),
      flipbookContainer: document.getElementById('flipbookContainer'),
      reflowContainer: document.getElementById('reflowContainer'),
      scrollContainer: document.getElementById('scrollContainer'),

      // Overlays
      colorTempOverlay: document.getElementById('colorTempOverlay'),
      ultraDimOverlay: document.getElementById('ultraDimOverlay'),
      btnExitSoloMode: document.getElementById('btnExitSoloMode'),

      // Mode Controls
      btnMode3D: document.getElementById('btnMode3D'),
      btnModeReflow: document.getElementById('btnModeReflow'),
      btnModeScroll: document.getElementById('btnModeScroll'),
      btnSpreadSingle: document.getElementById('btnSpreadSingle'),
      btnSpreadDouble: document.getElementById('btnSpreadDouble'),

      // Header tools
      btnHideUI: document.getElementById('btnHideUI'),
      floatingShowUIBtn: document.getElementById('floatingShowUIBtn'),
      btnSoloMode: document.getElementById('btnSoloMode'),
      btnGridOverview: document.getElementById('btnGridOverview'),
      btnToggleThumbnailsSidebar: document.getElementById('btnToggleThumbnailsSidebar'),
      btnOpenFile: document.getElementById('btnOpenFile'),
      filePicker: document.getElementById('filePicker'),
      btnFullscreen: document.getElementById('btnFullscreen'),
      btnOpenCatalog: document.getElementById('btnOpenCatalog'),
      catalogCountPill: document.getElementById('catalogCountPill'),

      // Navigation HUD
      btnPrevPage: document.getElementById('btnPrevPage'),
      btnNextPage: document.getElementById('btnNextPage'),
      pageScrubber: document.getElementById('pageScrubber'),
      pageBadgePill: document.getElementById('pageBadgePill'),
      readingStatLabel: document.getElementById('readingStatLabel'),
      btnBookmarkToggle: document.getElementById('btnBookmarkToggle'),
      bookmarkStarIcon: document.getElementById('bookmarkStarIcon'),

      // Reading Tools Menu
      btnReadingToolsMenu: document.getElementById('btnReadingToolsMenu'),
      readingToolsPopupMenu: document.getElementById('readingToolsPopupMenu'),
      btnToolRuler: document.getElementById('btnToolRuler'),
      btnToolMagnifier: document.getElementById('btnToolMagnifier'),
      btnToolDraw: document.getElementById('btnToolDraw'),
      btnToolCompare: document.getElementById('btnToolCompare'),
      btnToolFlashcards: document.getElementById('btnToolFlashcards'),
      btnSlideshowToggle: document.getElementById('btnSlideshowToggle'),
      btnToolQRShare: document.getElementById('btnToolQRShare'),
      btnToolOneHand: document.getElementById('btnToolOneHand'),
      btnToolOrientation: document.getElementById('btnToolOrientation'),

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

      // Catalog Elements
      tabCatalogBooks: document.getElementById('tabCatalogBooks'),
      tabCatalogTrash: document.getElementById('tabCatalogTrash'),
      catalogAddBanner: document.getElementById('catalogAddBanner'),
      btnCatalogUpload: document.getElementById('btnCatalogUpload'),
      catalogSearchInput: document.getElementById('catalogSearchInput'),
      catalogSortSelect: document.getElementById('catalogSortSelect'),
      btnCatalogViewGrid: document.getElementById('btnCatalogViewGrid'),
      btnCatalogViewList: document.getElementById('btnCatalogViewList'),
      catalogTagsChipRow: document.getElementById('catalogTagsChipRow'),
      catalogListContainer: document.getElementById('catalogListContainer'),
      statsTotalMinutes: document.getElementById('statsTotalMinutes'),
      statsBooksCount: document.getElementById('statsBooksCount'),
      statsCompletedCount: document.getElementById('statsCompletedCount'),

      // Metadata Modal
      metadataEditModal: document.getElementById('metadataEditModal'),
      editMetaBookId: document.getElementById('editMetaBookId'),
      editMetaTitleInput: document.getElementById('editMetaTitleInput'),
      editMetaAuthorInput: document.getElementById('editMetaAuthorInput'),
      editMetaTagsInput: document.getElementById('editMetaTagsInput'),
      btnCloseMetaModal: document.getElementById('btnCloseMetaModal'),
      btnCancelEditMeta: document.getElementById('btnCancelEditMeta'),
      btnSaveEditMeta: document.getElementById('btnSaveEditMeta'),

      // Notes & Highlighter
      hlColorPicker: document.getElementById('hlColorPicker'),
      tocListContainer: document.getElementById('tocListContainer'),
      searchInput: document.getElementById('searchInput'),
      searchResultsContainer: document.getElementById('searchResultsContainer'),
      searchResultsCount: document.getElementById('searchResultsCount'),
      bookmarksListContainer: document.getElementById('bookmarksListContainer'),
      noteInput: document.getElementById('noteInput'),
      btnSaveNote: document.getElementById('btnSaveNote'),
      notesListContainer: document.getElementById('notesListContainer'),

      // Settings Inputs
      colorTempSlider: document.getElementById('colorTempSlider'),
      ultraDimSlider: document.getElementById('ultraDimSlider'),
      highContrastScanToggle: document.getElementById('highContrastScanToggle'),
      smartInvertDarkToggle: document.getElementById('smartInvertDarkToggle'),
      fontSizeSlider: document.getElementById('fontSizeSlider'),
      lineHeightSlider: document.getElementById('lineHeightSlider'),
      marginLateralSlider: document.getElementById('marginLateralSlider'),
      fontFamilySelect: document.getElementById('fontFamilySelect'),
      localFontFileInput: document.getElementById('localFontFileInput'),
      hyphenationToggle: document.getElementById('hyphenationToggle'),
      bionicToggle: document.getElementById('bionicToggle'),
      soundEffectsToggle: document.getElementById('soundEffectsToggle'),
      ambientSoundSelect: document.getElementById('ambientSoundSelect'),

      // Export Actions
      exportRangeStart: document.getElementById('exportRangeStart'),
      exportRangeEnd: document.getElementById('exportRangeEnd'),
      btnExportRangeMd: document.getElementById('btnExportRangeMd'),
      btnExportRangeEpub: document.getElementById('btnExportRangeEpub'),
      btnExportCitationsAPA: document.getElementById('btnExportCitationsAPA'),
      btnExportCitationsMLA: document.getElementById('btnExportCitationsMLA'),
      btnExportCitationsChicago: document.getElementById('btnExportCitationsChicago'),
      btnOpenCoverGen: document.getElementById('btnOpenCoverGen'),
      btnPrintInkSaving: document.getElementById('btnPrintInkSaving'),
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
    // 1. Reading Modes
    this.dom.btnMode3D.addEventListener('click', () => this.setReadingMode('3d'));
    this.dom.btnModeReflow.addEventListener('click', () => this.setReadingMode('reflow'));
    if (this.dom.btnModeScroll) {
      this.dom.btnModeScroll.addEventListener('click', () => this.setReadingMode('scroll'));
    }

    // 2. Spread Switching (1 Página vs 2 Páginas)
    if (this.dom.btnSpreadSingle) {
      this.dom.btnSpreadSingle.addEventListener('click', () => this.setSpreadMode('single'));
    }
    if (this.dom.btnSpreadDouble) {
      this.dom.btnSpreadDouble.addEventListener('click', () => this.setSpreadMode('double'));
    }

    // 3. Immersive Solo Mode & Hide UI
    if (this.dom.btnSoloMode) {
      this.dom.btnSoloMode.addEventListener('click', () => this.toggleSoloMode());
    }
    if (this.dom.btnExitSoloMode) {
      this.dom.btnExitSoloMode.addEventListener('click', () => this.toggleSoloMode(false));
    }
    if (this.dom.btnHideUI) {
      this.dom.btnHideUI.addEventListener('click', () => this.toggleHUD(false));
    }
    if (this.dom.floatingShowUIBtn) {
      this.dom.floatingShowUIBtn.addEventListener('click', () => this.toggleHUD(true));
    }

    // 4. Grid Overview & Sidebar Thumbnails
    if (this.dom.btnGridOverview) {
      this.dom.btnGridOverview.addEventListener('click', () => {
        if (window.studyTools) window.studyTools.openGridOverview();
      });
    }
    if (this.dom.btnToggleThumbnailsSidebar) {
      this.dom.btnToggleThumbnailsSidebar.addEventListener('click', () => {
        if (window.studyTools) window.studyTools.toggleThumbnailsSidebar();
      });
    }

    // 5. Reading Tools Menu
    if (this.dom.btnReadingToolsMenu) {
      this.dom.btnReadingToolsMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        this.dom.readingToolsPopupMenu.classList.toggle('open');
      });

      document.addEventListener('click', (e) => {
        if (!e.target.closest('.reading-tools-trigger-wrapper')) {
          this.dom.readingToolsPopupMenu.classList.remove('open');
        }
      });
    }

    // Tools Menu Items
    if (this.dom.btnToolRuler) {
      this.dom.btnToolRuler.addEventListener('click', () => {
        this.dom.readingToolsPopupMenu.classList.remove('open');
        window.studyTools.toggleRuler();
      });
    }
    if (this.dom.btnToolMagnifier) {
      this.dom.btnToolMagnifier.addEventListener('click', () => {
        this.dom.readingToolsPopupMenu.classList.remove('open');
        window.studyTools.toggleMagnifier();
      });
    }
    if (this.dom.btnToolDraw) {
      this.dom.btnToolDraw.addEventListener('click', () => {
        this.dom.readingToolsPopupMenu.classList.remove('open');
        window.drawingController.toggle();
      });
    }
    if (this.dom.btnToolCompare) {
      this.dom.btnToolCompare.addEventListener('click', () => {
        this.dom.readingToolsPopupMenu.classList.remove('open');
        window.studyTools.openPageComparator();
      });
    }
    if (this.dom.btnToolFlashcards) {
      this.dom.btnToolFlashcards.addEventListener('click', () => {
        this.dom.readingToolsPopupMenu.classList.remove('open');
        window.studyTools.openFlashcardsModal();
      });
    }
    if (this.dom.btnSlideshowToggle) {
      this.dom.btnSlideshowToggle.addEventListener('click', () => {
        this.dom.readingToolsPopupMenu.classList.remove('open');
        window.studyTools.toggleSlideshow();
      });
    }
    if (this.dom.btnToolQRShare) {
      this.dom.btnToolQRShare.addEventListener('click', () => {
        this.dom.readingToolsPopupMenu.classList.remove('open');
        window.quickShare.showQRCodeModal();
      });
    }
    if (this.dom.btnToolOneHand) {
      this.dom.btnToolOneHand.addEventListener('click', () => {
        this.dom.readingToolsPopupMenu.classList.remove('open');
        window.quickShare.toggleOneHandMode();
      });
    }
    if (this.dom.btnToolOrientation) {
      this.dom.btnToolOrientation.addEventListener('click', () => {
        this.dom.readingToolsPopupMenu.classList.remove('open');
        window.quickShare.toggleOrientationLock();
      });
    }

    // 6. File Pickers
    this.dom.btnOpenFile.addEventListener('click', () => this.dom.filePicker.click());
    if (this.dom.btnCatalogUpload) {
      this.dom.btnCatalogUpload.addEventListener('click', () => this.dom.filePicker.click());
    }

    this.dom.filePicker.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        this.handleFileUpload(e.target.files[0]);
      }
    });

    // 7. Navigation
    this.dom.btnPrevPage.addEventListener('click', () => this.prevPage());
    this.dom.btnNextPage.addEventListener('click', () => this.nextPage());

    this.dom.pageScrubber.addEventListener('input', (e) => {
      const pageNum = parseInt(e.target.value);
      this.goToPage(pageNum);
    });

    this.dom.btnFullscreen.addEventListener('click', () => this.toggleFullscreen());

    // 8. Drawers
    this.dom.btnOpenCatalog.addEventListener('click', () => {
      this.renderCatalog();
      this._updateReadingAnalyticsSummary();
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

    // 9. Catalog Tabs, Filters & Views
    if (this.dom.tabCatalogBooks) {
      this.dom.tabCatalogBooks.addEventListener('click', () => {
        this.catalogTab = 'books';
        this.dom.tabCatalogBooks.classList.add('active');
        this.dom.tabCatalogTrash.classList.remove('active');
        this.dom.catalogAddBanner.style.display = 'block';
        this.renderCatalog();
      });
    }
    if (this.dom.tabCatalogTrash) {
      this.dom.tabCatalogTrash.addEventListener('click', () => {
        this.catalogTab = 'trash';
        this.dom.tabCatalogTrash.classList.add('active');
        this.dom.tabCatalogBooks.classList.remove('active');
        this.dom.catalogAddBanner.style.display = 'none';
        this.renderCatalog();
      });
    }

    if (this.dom.btnCatalogViewGrid) {
      this.dom.btnCatalogViewGrid.addEventListener('click', () => {
        this.catalogView = 'grid';
        this.dom.btnCatalogViewGrid.classList.add('active');
        this.dom.btnCatalogViewList.classList.remove('active');
        this.renderCatalog();
      });
    }
    if (this.dom.btnCatalogViewList) {
      this.dom.btnCatalogViewList.addEventListener('click', () => {
        this.catalogView = 'list';
        this.dom.btnCatalogViewList.classList.add('active');
        this.dom.btnCatalogViewGrid.classList.remove('active');
        this.renderCatalog();
      });
    }

    if (this.dom.catalogSortSelect) {
      this.dom.catalogSortSelect.addEventListener('change', (e) => {
        this.catalogSort = e.target.value;
        this.renderCatalog();
      });
    }

    if (this.dom.catalogTagsChipRow) {
      this.dom.catalogTagsChipRow.addEventListener('click', (e) => {
        const chip = e.target.closest('.catalog-tag-chip');
        if (!chip) return;
        this.dom.catalogTagsChipRow.querySelectorAll('.catalog-tag-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.catalogTagFilter = chip.dataset.tag;
        this.renderCatalog();
      });
    }

    if (this.dom.catalogSearchInput) {
      this.dom.catalogSearchInput.addEventListener('input', (e) => {
        this.renderCatalog(e.target.value);
      });
    }

    // 10. Metadata Editor Modal
    if (this.dom.btnCloseMetaModal) {
      this.dom.btnCloseMetaModal.addEventListener('click', () => this.dom.metadataEditModal.classList.remove('open'));
    }
    if (this.dom.btnCancelEditMeta) {
      this.dom.btnCancelEditMeta.addEventListener('click', () => this.dom.metadataEditModal.classList.remove('open'));
    }
    if (this.dom.btnSaveEditMeta) {
      this.dom.btnSaveEditMeta.addEventListener('click', () => this._saveEditedMetadata());
    }

    // 11. Bookmarks, Notes & Pastel Highlighter
    this.dom.btnBookmarkToggle.addEventListener('click', () => this.toggleCurrentBookmark());
    this.dom.btnSaveNote.addEventListener('click', () => this.saveCurrentNote());

    if (this.dom.hlColorPicker) {
      this.dom.hlColorPicker.addEventListener('click', (e) => {
        const swatch = e.target.closest('.hl-swatch-btn');
        if (!swatch) return;
        this.dom.hlColorPicker.querySelectorAll('.hl-swatch-btn').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        this.activeHighlighterColor = swatch.dataset.color || 'yellow';
        this.showToast(`Subrayador: ${swatch.title}`);
      });
    }

    // 12. Search Engine
    this.dom.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));

    // 13. TTS Controls
    this.dom.btnStartTTS.addEventListener('click', () => this.toggleTTS());
    this.dom.btnTTSPausePlay.addEventListener('click', () => this.toggleTTS());
    this.dom.btnTTSClose.addEventListener('click', () => this.stopTTS());
    this.dom.ttsSpeedSelect.addEventListener('change', (e) => {
      window.bookTTS.setRate(parseFloat(e.target.value));
    });

    // 14. Display Settings, Filters & Ergonomics
    if (this.dom.colorTempSlider) {
      this.dom.colorTempSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value) / 100;
        this.dom.colorTempOverlay.style.opacity = val.toFixed(2);
      });
    }

    if (this.dom.ultraDimSlider) {
      this.dom.ultraDimSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value) / 100;
        this.dom.ultraDimOverlay.style.opacity = val.toFixed(2);
      });
    }

    if (this.dom.highContrastScanToggle) {
      this.dom.highContrastScanToggle.addEventListener('change', (e) => {
        document.body.classList.toggle('scan-high-contrast', e.target.checked);
        this.showToast(e.target.checked ? 'Alto contraste para escaneos activado' : 'Alto contraste desactivado');
      });
    }

    if (this.dom.smartInvertDarkToggle) {
      this.dom.smartInvertDarkToggle.addEventListener('change', (e) => {
        document.body.classList.toggle('smart-dark-invert', e.target.checked);
        this.showToast(e.target.checked ? 'Inversión inteligente activada' : 'Inversión inteligente desactivada');
      });
    }

    if (this.dom.marginLateralSlider) {
      this.dom.marginLateralSlider.addEventListener('input', (e) => {
        const px = e.target.value;
        document.documentElement.style.setProperty('--content-margin-lateral', `${px}px`);
        document.querySelectorAll('.page-content-wrapper').forEach(el => {
          el.style.paddingLeft = `${px}px`;
          el.style.paddingRight = `${px}px`;
        });
      });
    }

    if (this.dom.hyphenationToggle) {
      this.dom.hyphenationToggle.addEventListener('change', (e) => {
        const val = e.target.checked ? 'auto' : 'manual';
        document.querySelectorAll('.reflow-page, .dynamic-page-text').forEach(el => {
          el.style.hyphens = val;
          el.style.textAlign = e.target.checked ? 'justify' : 'left';
        });
      });
    }

    if (this.dom.localFontFileInput) {
      this.dom.localFontFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          window.quickShare.loadLocalFontFile(e.target.files[0]);
        }
      });
    }

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

    // 15. Range & Citation Exports
    if (this.dom.btnExportRangeMd) {
      this.dom.btnExportRangeMd.addEventListener('click', () => {
        const s = parseInt(this.dom.exportRangeStart.value) || 1;
        const e = parseInt(this.dom.exportRangeEnd.value) || s;
        window.universalExporter.exportPageRange(this.currentDoc?.title, this.currentDoc?.author, this.pages, 'md', s, e);
        this.showToast(`Rango pág. ${s}-${e} exportado`);
      });
    }

    if (this.dom.btnExportRangeEpub) {
      this.dom.btnExportRangeEpub.addEventListener('click', () => {
        const s = parseInt(this.dom.exportRangeStart.value) || 1;
        const e = parseInt(this.dom.exportRangeEnd.value) || s;
        window.universalExporter.exportPageRange(this.currentDoc?.title, this.currentDoc?.author, this.pages, 'epub', s, e);
        this.showToast(`Extracto EPUB (pág. ${s}-${e}) descargado`);
      });
    }

    if (this.dom.btnExportCitationsAPA) {
      this.dom.btnExportCitationsAPA.addEventListener('click', () => {
        window.universalExporter.exportAcademicCitations(this.currentDoc?.title, this.currentDoc?.author, window.bookAnnotations.highlights, 'APA');
        this.showToast('Citas en formato APA exportadas');
      });
    }

    if (this.dom.btnExportCitationsMLA) {
      this.dom.btnExportCitationsMLA.addEventListener('click', () => {
        window.universalExporter.exportAcademicCitations(this.currentDoc?.title, this.currentDoc?.author, window.bookAnnotations.highlights, 'MLA');
        this.showToast('Citas en formato MLA exportadas');
      });
    }

    if (this.dom.btnExportCitationsChicago) {
      this.dom.btnExportCitationsChicago.addEventListener('click', () => {
        window.universalExporter.exportAcademicCitations(this.currentDoc?.title, this.currentDoc?.author, window.bookAnnotations.highlights, 'Chicago');
        this.showToast('Citas en formato Chicago exportadas');
      });
    }

    if (this.dom.btnOpenCoverGen) {
      this.dom.btnOpenCoverGen.addEventListener('click', () => {
        window.coverGenerator.openModal(this.currentDoc?.title, this.currentDoc?.author);
      });
    }

    if (this.dom.btnPrintInkSaving) {
      this.dom.btnPrintInkSaving.addEventListener('click', () => {
        window.quickShare.triggerInkSavingPrint();
      });
    }

    // Standard Full Exports
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
      },
      onTwoFingerTap: () => this.prevPage(),
      onThreeFingerTap: () => {
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
        case 'g':
        case 'G':
          if (window.studyTools) window.studyTools.openGridOverview();
          break;
        case 'z':
        case 'Z':
          this.toggleSoloMode();
          break;
        case 'm':
        case 'M':
          this.setReadingMode(this.readingMode === '3d' ? 'reflow' : (this.readingMode === 'reflow' ? 'scroll' : '3d'));
          break;
        case 'h':
        case 'H':
          this.toggleHUD();
          break;
        case 'Escape':
          this.closeAllDrawers();
          if (this.isSoloMode) this.toggleSoloMode(false);
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

    window.addEventListener('dragleave', (e) => {
      if (e.relatedTarget === null || e.clientX === 0) {
        overlay.classList.remove('drag-over');
      }
    });

    window.addEventListener('drop', (e) => {
      e.preventDefault();
      overlay.classList.remove('drag-over');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        this.handleFileUpload(e.dataTransfer.files[0]);
      }
    });
  }

  // --- File Uploading & PDF Processing ---
  async handleFileUpload(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    this.showToast(`Procesando ${file.name}...`, 'info');

    try {
      if (ext === 'pdf') {
        const buffer = await file.arrayBuffer();
        const savedBook = await window.bookStorage.saveBook({
          title: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
          author: 'Documento local',
          fileName: file.name,
          fileSize: file.size,
          tags: ['General'],
          fileData: buffer.slice(0)
        });

        const bookId = savedBook ? savedBook.id : null;
        await this._loadPDFFromBuffer(buffer, file.name, bookId, 1);
        await this.refreshCatalogCount();
        await this.renderCatalog();
        await this._updateReadingAnalyticsSummary();
        this.showToast(`Guardado en catálogo: ${file.name}`);
      } else if (ext === 'epub') {
        const bookModel = await window.epubEngine.parseEPUB(file);
        await this.loadBook(bookModel);
        await this.refreshCatalogCount();
        await this.renderCatalog();
        await this._updateReadingAnalyticsSummary();
        this.showToast(`EPUB cargado: ${bookModel.title}`);
      } else if (ext === 'txt' || ext === 'md') {
        const text = await file.text();
        const bookModel = this._parseTextDocument(text, file.name);
        await this.loadBook(bookModel);
        await this.refreshCatalogCount();
        await this.renderCatalog();
        await this._updateReadingAnalyticsSummary();
        this.showToast(`Documento cargado: ${file.name}`);
      } else {
        this.showToast('Formato no soportado (.pdf, .epub, .txt, .md)', 'danger');
      }
    } catch (e) {
      console.error('Error al abrir documento:', e);
      this.showToast(`Error al procesar documento: ${e.message}`, 'danger');
    }
  }

  async _loadPDFFromBuffer(arrayBuffer, fileName, bookId = null, startPage = 1) {
    this.currentBookId = bookId;
    const cleanTitle = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

    try {
      const pdfEngine = window.pdfEngine;
      const pdfInfo = await pdfEngine.loadDocument(arrayBuffer.slice(0));

      const pagesList = [];
      for (let i = 1; i <= pdfInfo.numPages; i++) {
        pagesList.push({
          pageNum: i,
          title: `Página ${i}`,
          canvas: null,
          text: ''
        });
      }

      const metaTitle = (pdfInfo.metadata && pdfInfo.metadata.title && pdfInfo.metadata.title.trim() && pdfInfo.metadata.title !== 'Documento sin título') ? pdfInfo.metadata.title.trim() : cleanTitle;
      const metaAuthor = (pdfInfo.metadata && pdfInfo.metadata.author && pdfInfo.metadata.author.trim() && pdfInfo.metadata.author !== 'Autor Desconocido') ? pdfInfo.metadata.author.trim() : 'Documento PDF';

      this.currentDoc = {
        title: metaTitle,
        author: metaAuthor,
        outline: pdfInfo.outline || []
      };
      this.pages = pagesList;
      this.totalPages = pdfInfo.numPages;
      this.currentPage = Math.min(startPage || 1, this.totalPages);

      this.dom.docActiveTitle.innerText = `${metaTitle} — ${this.totalPages} págs`;
      this.dom.pageBadgePill.innerText = `Pág. ${this.currentPage} / ${this.totalPages}`;
      this.dom.pageScrubber.min = 1;
      this.dom.pageScrubber.max = this.totalPages;
      this.dom.pageScrubber.value = this.currentPage;

      // Update range export defaults
      if (this.dom.exportRangeStart) this.dom.exportRangeStart.max = this.totalPages;
      if (this.dom.exportRangeEnd) {
        this.dom.exportRangeEnd.max = this.totalPages;
        this.dom.exportRangeEnd.value = Math.min(this.totalPages, 10);
      }

      this.flipbook.setPages(this.pages);
      this.flipbook.goToPage(this.currentPage);
      this.reflowReader.setPages(this.pages);

      if (this.readingMode === 'scroll') {
        this._renderVerticalScrollContainer();
      }

      this._renderTOCList(pdfInfo.outline || []);
      this._renderBookmarks();
      this._renderNotes();
      this._updateHUDStats();

      // Update totalPages & metadata in database
      if (bookId) {
        await window.bookStorage.updateProgress(bookId, this.currentPage, this.totalPages);
        await window.bookStorage.updateMetadata(bookId, {
          title: metaTitle,
          author: metaAuthor
        });
      }

      // Generate cover thumbnail in background
      pdfEngine.renderPage(1).then(p1 => {
        if (p1 && p1.canvas && bookId) {
          const thumbUrl = p1.canvas.toDataURL('image/jpeg', 0.7);
          window.bookStorage.updateMetadata(bookId, { coverThumbnail: thumbUrl }).then(() => {
            this.renderCatalog();
          });
        }
      }).catch(() => {});

      // Cache text sample for global search
      pdfEngine.extractPageText(1).then(txt => {
        if (txt && bookId) {
          window.bookStorage.saveCachedText(bookId, txt);
        }
      }).catch(() => {});

    } catch (err) {
      console.error('Error al inicializar PDF:', err);
      this.showToast(`Error al procesar PDF: ${err.message}`, 'danger');
      throw err;
    }
  }

  _parseTextDocument(rawText, filename) {
    const lines = rawText.split('\n');
    const title = filename.replace(/\.[^/.]+$/, '');
    const pages = [];
    const linesPerPage = 32;

    for (let i = 0; i < lines.length; i += linesPerPage) {
      const pageText = lines.slice(i, i + linesPerPage).join('\n');
      pages.push({
        pageNum: Math.floor(i / linesPerPage) + 1,
        title: `Página ${Math.floor(i / linesPerPage) + 1}`,
        text: pageText,
        html: `<p style="white-space:pre-wrap; line-height:1.7;">${pageText}</p>`
      });
    }

    return {
      title: title,
      author: 'Texto plano',
      pages: pages,
      outline: []
    };
  }

  async loadBook(bookModel) {
    this.currentDoc = bookModel;
    this.pages = bookModel.pages || [];
    this.totalPages = this.pages.length || 1;
    this.currentPage = 1;

    this.dom.docActiveTitle.innerText = `${bookModel.title} — ${bookModel.author || ''}`;
    this.dom.pageBadgePill.innerText = `Pág. 1 / ${this.totalPages}`;
    this.dom.pageScrubber.min = 1;
    this.dom.pageScrubber.max = this.totalPages;
    this.dom.pageScrubber.value = 1;

    this.flipbook.setPages(this.pages);
    this.reflowReader.setPages(this.pages);

    if (this.readingMode === 'scroll') {
      this._renderVerticalScrollContainer();
    }

    this._renderTOCList(bookModel.outline || []);
    this._renderBookmarks();
    this._renderNotes();
    this._updateHUDStats();
  }

  // --- Personal Catalog UI & Recycle Bin ---
  async refreshCatalogCount() {
    const books = await window.bookStorage.getAllBooks(false);
    if (this.dom.catalogCountPill) {
      this.dom.catalogCountPill.innerText = books.length;
    }
  }

  async renderCatalog(filterQuery = '') {
    const container = this.dom.catalogListContainer;
    if (!container) return;

    let books;
    if (this.catalogTab === 'trash') {
      books = await window.bookStorage.getTrashBooks();
    } else {
      books = await window.bookStorage.getAllBooks(false);
    }

    // Update tag chips dynamically
    if (this.dom.catalogTagsChipRow && this.catalogTab === 'books') {
      const allTagBooks = await window.bookStorage.getAllBooks(false);
      const tagSet = new Set(['General', 'Estudio', 'Trabajo', 'Lectura rápida']);
      allTagBooks.forEach(b => {
        if (b.tags && Array.isArray(b.tags)) {
          b.tags.forEach(t => tagSet.add(t));
        }
      });
      let chipsHtml = `<span class="catalog-tag-chip ${this.catalogTagFilter === 'all' ? 'active' : ''}" data-tag="all">Todos</span>`;
      tagSet.forEach(t => {
        chipsHtml += `<span class="catalog-tag-chip ${this.catalogTagFilter === t ? 'active' : ''}" data-tag="${t}">${t}</span>`;
      });
      this.dom.catalogTagsChipRow.innerHTML = chipsHtml;
    }

    // Apply tag filter
    if (this.catalogTab === 'books' && this.catalogTagFilter && this.catalogTagFilter !== 'all') {
      books = books.filter(b => (b.tags || ['General']).includes(this.catalogTagFilter));
    }

    // Apply search filter (Transversal Search)
    if (filterQuery && filterQuery.trim()) {
      const q = filterQuery.toLowerCase().trim();
      books = books.filter(b =>
        (b.title && b.title.toLowerCase().includes(q)) ||
        (b.author && b.author.toLowerCase().includes(q)) ||
        (b.fileName && b.fileName.toLowerCase().includes(q))
      );
    }

    // Apply Sorting
    books.sort((a, b) => {
      switch (this.catalogSort) {
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
        case 'progress':
          const pA = a.totalPages ? a.lastPage / a.totalPages : 0;
          const pB = b.totalPages ? b.lastPage / b.totalPages : 0;
          return pB - pA;
        case 'size':
          return (b.fileSize || 0) - (a.fileSize || 0);
        case 'pages':
          return (b.totalPages || 0) - (a.totalPages || 0);
        case 'recent':
        default:
          return (b.lastOpenedAt || 0) - (a.lastOpenedAt || 0);
      }
    });

    if (books.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding: 30px 10px; color: var(--hud-subtext);">
          <p style="font-size: 0.88rem; margin-bottom: 6px;">
            ${this.catalogTab === 'trash' ? 'La papelera está vacía.' : (filterQuery ? 'No hay documentos que coincidan.' : 'No hay documentos en esta sección.')}
          </p>
          <p style="font-size: 0.78rem;">${this.catalogTab === 'trash' ? 'Los documentos eliminados se purgan tras 7 días.' : 'Usa el botón "+ Subir nuevo PDF" para guardar tus documentos.'}</p>
        </div>
      `;
      return;
    }

    if (this.catalogView === 'list') {
      // Table View
      let tableHtml = `
        <table class="catalog-table-view">
          <thead>
            <tr>
              <th>Título</th>
              <th>Páginas</th>
              <th>Progreso</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
      `;

      books.forEach(book => {
        const progressPercent = Math.round(((book.lastPage || 1) / (book.totalPages || 1)) * 100);
        tableHtml += `
          <tr>
            <td>
              <div style="font-weight:600; color:#fff;">${book.title}</div>
              <div style="font-size:0.72rem; color:var(--hud-subtext);">${book.author || 'Autor'}</div>
            </td>
            <td>${book.lastPage} / ${book.totalPages}</td>
            <td>${progressPercent}%</td>
            <td>
              <div style="display:flex; gap:6px;">
                ${this.catalogTab === 'books' ? `
                  <button class="catalog-open-btn" onclick="window.luminaApp.openBookFromCatalog('${book.id}')">Abrir</button>
                  <button class="catalog-open-btn" style="background:rgba(255,255,255,0.08);" title="Editar metadatos" onclick="window.luminaApp.openEditMetadataModal('${book.id}', event)">
                    <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                  </button>
                  <button class="catalog-delete-btn" title="Mover a papelera" onclick="window.luminaApp.moveBookToTrash('${book.id}', event)">
                    <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                ` : `
                  <button class="catalog-open-btn" onclick="window.luminaApp.restoreBookFromTrash('${book.id}', event)">Restaurar</button>
                  <button class="catalog-delete-btn" title="Eliminar definitivamente" onclick="window.luminaApp.permanentDeleteBook('${book.id}', event)">
                    <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                `}
              </div>
            </td>
          </tr>
        `;
      });

      tableHtml += `</tbody></table>`;
      container.innerHTML = tableHtml;
    } else {
      // Grid Cards View
      let html = '';
      books.forEach(book => {
        const sizeMb = (book.fileSize / (1024 * 1024)).toFixed(1);
        const progressPercent = Math.round(((book.lastPage || 1) / (book.totalPages || 1)) * 100);
        const dateStr = new Date(book.lastOpenedAt || book.addedAt).toLocaleDateString();

        const thumbImg = book.coverThumbnail
          ? `<img src="${book.coverThumbnail}" alt="Portada">`
          : `<svg viewBox="0 0 24 24" width="22" height="22" stroke="#6b7280" stroke-width="1.5" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`;

        const tagsBadges = (book.tags || []).map(t => `<span style="font-size:0.65rem; background:rgba(255,255,255,0.08); padding:1px 5px; border-radius:3px; margin-right:3px;">${t}</span>`).join('');

        html += `
          <div class="catalog-card" data-book-id="${book.id}">
            <div class="catalog-thumb-container">
              ${thumbImg}
            </div>
            <div class="catalog-card-info">
              <div class="catalog-card-title" title="${book.title}">${book.title}</div>
              <div class="catalog-card-meta">${sizeMb} MB · ${dateStr}</div>
              <div style="margin: 3px 0;">${tagsBadges}</div>
              
              <div class="catalog-progress-bar-wrap">
                <div class="catalog-progress-bar-fill" style="width: ${progressPercent}%;"></div>
              </div>

              <div class="catalog-card-actions">
                <span style="font-size: 0.74rem; color: var(--hud-subtext);">Pág. ${book.lastPage || 1} / ${book.totalPages}</span>
                <div style="display:flex; align-items:center; gap:6px;">
                  ${this.catalogTab === 'books' ? `
                    <button class="catalog-open-btn" onclick="window.luminaApp.openBookFromCatalog('${book.id}')">Abrir</button>
                    <button class="catalog-open-btn" style="background:rgba(255,255,255,0.08); padding:5px;" title="Editar metadatos" onclick="window.luminaApp.openEditMetadataModal('${book.id}', event)">
                      <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                    </button>
                    <button class="catalog-delete-btn" title="Mover a papelera" onclick="window.luminaApp.moveBookToTrash('${book.id}', event)">
                      <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  ` : `
                    <button class="catalog-open-btn" onclick="window.luminaApp.restoreBookFromTrash('${book.id}', event)">Restaurar</button>
                    <button class="catalog-delete-btn" title="Eliminar definitivamente" onclick="window.luminaApp.permanentDeleteBook('${book.id}', event)">
                      <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                  `}
                </div>
              </div>
            </div>
          </div>
        `;
      });

      container.innerHTML = html;
    }
  }

  async _updateReadingAnalyticsSummary() {
    const books = await window.bookStorage.getAllBooks(false);
    let totalSecs = window.bookAnnotations.totalSecondsRead || 0;
    let completedCount = 0;

    books.forEach(b => {
      totalSecs += (b.readingSeconds || 0);
      if (b.completed || (b.lastPage && b.lastPage >= b.totalPages)) completedCount++;
    });

    const mins = Math.floor(totalSecs / 60);
    if (this.dom.statsTotalMinutes) this.dom.statsTotalMinutes.innerText = `${mins}m`;
    if (this.dom.statsBooksCount) this.dom.statsBooksCount.innerText = books.length;
    if (this.dom.statsCompletedCount) this.dom.statsCompletedCount.innerText = completedCount;
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

  async moveBookToTrash(id, event) {
    if (event) event.stopPropagation();
    await window.bookStorage.moveToTrash(id);
    await this.refreshCatalogCount();
    await this.renderCatalog();
    this.showToast('Documento movido a la papelera (se conservará 7 días)');
  }

  async restoreBookFromTrash(id, event) {
    if (event) event.stopPropagation();
    await window.bookStorage.restoreFromTrash(id);
    await this.refreshCatalogCount();
    await this.renderCatalog();
    this.showToast('Documento restaurado en tu biblioteca');
  }

  async permanentDeleteBook(id, event) {
    if (event) event.stopPropagation();
    if (!confirm('¿Eliminar definitivamente este documento? Esta acción no se puede deshacer.')) return;
    await window.bookStorage.permanentDelete(id);
    await this.refreshCatalogCount();
    await this.renderCatalog();
    this.showToast('Documento eliminado definitivamente');
  }

  async openEditMetadataModal(id, event) {
    if (event) event.stopPropagation();
    const book = await window.bookStorage.getBook(id);
    if (!book) return;

    this.dom.editMetaBookId.value = book.id;
    this.dom.editMetaTitleInput.value = book.title || '';
    this.dom.editMetaAuthorInput.value = book.author || '';
    this.dom.editMetaTagsInput.value = (book.tags || []).join(', ');

    this.dom.metadataEditModal.classList.add('open');
  }

  async _saveEditedMetadata() {
    const id = this.dom.editMetaBookId.value;
    const title = this.dom.editMetaTitleInput.value.trim();
    const author = this.dom.editMetaAuthorInput.value.trim();
    const tags = this.dom.editMetaTagsInput.value.split(',').map(t => t.trim()).filter(Boolean);

    if (id && title) {
      await window.bookStorage.updateMetadata(id, { title, author, tags });
      this.dom.metadataEditModal.classList.remove('open');
      await this.renderCatalog();
      this.showToast('Metadatos actualizados');
    }
  }

  // --- Spread Mode (1 Página vs 2 Páginas) ---
  setSpreadMode(mode) {
    this.spreadMode = mode;
    if (this.dom.btnSpreadSingle && this.dom.btnSpreadDouble) {
      if (mode === 'single') {
        this.dom.btnSpreadSingle.classList.add('active');
        this.dom.btnSpreadDouble.classList.remove('active');
      } else {
        this.dom.btnSpreadDouble.classList.add('active');
        this.dom.btnSpreadSingle.classList.remove('active');
      }
    }
    this.flipbook.setSpread(mode);
    try {
      localStorage.setItem('luminabook_spread_mode', mode);
    } catch (e) {}
    this.showToast(mode === 'single' ? 'Vista: 1 página' : 'Vista: 2 páginas');
  }

  // --- Reading Modes (3D, Reflow, Continuous Scroll) ---
  setReadingMode(mode) {
    this.readingMode = mode;

    this.dom.btnMode3D.classList.toggle('active', mode === '3d');
    this.dom.btnModeReflow.classList.toggle('active', mode === 'reflow');
    if (this.dom.btnModeScroll) this.dom.btnModeScroll.classList.toggle('active', mode === 'scroll');

    this.dom.panelFlipbook.classList.toggle('active-panel', mode === '3d');
    this.dom.panelReflow.classList.toggle('active-panel', mode === 'reflow');
    this.dom.panelScroll.classList.toggle('active-panel', mode === 'scroll');

    if (mode === '3d') {
      this.flipbook.goToPage(this.currentPage);
    } else if (mode === 'reflow') {
      this.reflowReader.scrollToPage(this.currentPage);
    } else if (mode === 'scroll') {
      this._renderVerticalScrollContainer();
      this._scrollToPageInScrollContainer(this.currentPage);
    }

    this.showToast(mode === '3d' ? 'Modo Libro 3D' : (mode === 'reflow' ? 'Modo Texto Líquido' : 'Modo Scroll Vertical'));
  }

  _renderVerticalScrollContainer() {
    const container = this.dom.scrollContainer;
    if (!container) return;
    container.innerHTML = '';

    const total = this.totalPages || 1;
    for (let p = 1; p <= total; p++) {
      const slot = document.createElement('div');
      slot.className = 'scroll-page-slot';
      slot.id = `scrollSlot_${p}`;
      slot.dataset.page = p;
      slot.innerHTML = `
        <span class="page-number-tag">Pág. ${p}</span>
        <div class="scroll-slot-placeholder" style="color:var(--hud-subtext); font-size:0.85rem;">Cargando página ${p}...</div>
      `;
      container.appendChild(slot);
    }

    // Lazy load pages in vertical scroll
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const slot = entry.target;
          const pageNum = parseInt(slot.dataset.page);

          if (!slot.dataset.rendered) {
            slot.dataset.rendered = 'true';
            if (window.pdfEngine && window.pdfEngine.isLoaded) {
              window.pdfEngine.renderPage(pageNum).then(res => {
                if (res && res.canvas) {
                  slot.querySelector('.scroll-slot-placeholder')?.remove();
                  const c = document.createElement('canvas');
                  c.width = res.canvas.width;
                  c.height = res.canvas.height;
                  const ctx = c.getContext('2d', { alpha: false });
                  if (ctx) {
                    ctx.imageSmoothingEnabled = false;
                    ctx.drawImage(res.canvas, 0, 0);
                  }
                  c.className = 'scroll-page-canvas';
                  slot.appendChild(c);
                }
              }).catch(() => {});
            } else if (this.pages[pageNum - 1]) {
              const pData = this.pages[pageNum - 1];
              slot.querySelector('.scroll-slot-placeholder')?.remove();
              const div = document.createElement('div');
              div.style.padding = '30px';
              div.style.width = '100%';
              div.innerHTML = `<h3>${pData.title || ''}</h3><p style="white-space:pre-wrap; line-height:1.7;">${pData.text || ''}</p>`;
              slot.appendChild(div);
            }
          }

          // Update HUD active page on scroll
          this.currentPage = pageNum;
          this._updateHUDStats();
        }
      });
    }, { root: this.dom.panelScroll, rootMargin: '200px' });

    container.querySelectorAll('.scroll-page-slot').forEach(s => observer.observe(s));
  }

  _scrollToPageInScrollContainer(pageNum) {
    const slot = document.getElementById(`scrollSlot_${pageNum}`);
    if (slot) {
      slot.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // --- Solo Mode (Zen / Solo Libro) ---
  toggleSoloMode(forceState = null) {
    this.isSoloMode = forceState !== null ? forceState : !this.isSoloMode;
    document.body.classList.toggle('solo-mode-active', this.isSoloMode);
    if (this.dom.btnExitSoloMode) {
      this.dom.btnExitSoloMode.style.display = this.isSoloMode ? 'flex' : 'none';
    }
    this.showToast(this.isSoloMode ? 'Modo Solo Libro activado (Esc para salir)' : 'Modo Solo Libro desactivado');
  }

  // --- Navigation & Progress Tracking ---
  nextPage() {
    if (this.readingMode === '3d') {
      this.flipbook.next();
    } else if (this.readingMode === 'scroll') {
      if (this.currentPage < this.totalPages) {
        this.goToPage(this.currentPage + 1);
      }
    } else {
      if (this.currentPage < this.totalPages) {
        this.goToPage(this.currentPage + 1);
      }
    }
  }

  prevPage() {
    if (this.readingMode === '3d') {
      this.flipbook.prev();
    } else if (this.readingMode === 'scroll') {
      if (this.currentPage > 1) {
        this.goToPage(this.currentPage - 1);
      }
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
    } else if (this.readingMode === 'scroll') {
      this._scrollToPageInScrollContainer(pageNum);
    } else {
      this.reflowReader.scrollToPage(pageNum);
    }

    if (window.studyTools) {
      window.studyTools.updateSidebarActivePage(pageNum);
    }

    this._updateHUDStats();

    if (this.currentBookId) {
      window.bookStorage.updateProgress(this.currentBookId, this.currentPage, this.totalPages).catch(() => {});
    }
  }

  _onPageUpdated(page, total) {
    this.currentPage = page;
    this.totalPages = total;
    this._updateHUDStats();

    if (window.studyTools) {
      window.studyTools.updateSidebarActivePage(page);
    }

    if (this.currentBookId) {
      window.bookStorage.updateProgress(this.currentBookId, this.currentPage, this.totalPages).catch(() => {});
    }
  }

  _updateHUDStats() {
    this.dom.pageBadgePill.innerText = `Pág. ${this.currentPage} / ${this.totalPages}`;
    this.dom.pageScrubber.value = this.currentPage;

    const isBookmarked = window.bookAnnotations.isBookmarked(this.currentPage);
    if (this.dom.bookmarkStarIcon) {
      this.dom.bookmarkStarIcon.style.color = isBookmarked ? '#c28b38' : 'inherit';
    }

    const stats = window.bookAnnotations.getReadingStats(this.currentPage, this.totalPages);
    this.dom.readingStatLabel.innerText = `Progreso: ${stats.progressPercent}%`;
  }

  // --- HUD Visibility & Fullscreen ---
  toggleHUD(forceState = null) {
    this.hudVisible = forceState !== null ? forceState : !this.hudVisible;
    if (this.hudVisible) {
      this.dom.appHeader.classList.remove('hud-hidden');
      this.dom.appBottomHud.classList.remove('hud-hidden');
      this.dom.readerWorkspace.classList.remove('fullscreen-immersive');
      if (this.dom.floatingShowUIBtn) this.dom.floatingShowUIBtn.classList.remove('visible');
    } else {
      this.dom.appHeader.classList.add('hud-hidden');
      this.dom.appBottomHud.classList.add('hud-hidden');
      this.dom.readerWorkspace.classList.add('fullscreen-immersive');
      if (this.dom.floatingShowUIBtn) this.dom.floatingShowUIBtn.classList.add('visible');
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
    window.bookAnnotations.addNote(this.currentPage, text, 50, 50);
    this.dom.noteInput.value = '';
    this._renderNotes();
    this.flipbook.renderCurrentView(); // Render sticky pin
    this.showToast('Nota guardada con chincheta interactiva');
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
        <div style="padding:8px 10px; background:rgba(255,255,255,0.03); border-left:2px solid var(--accent-gold); border-radius:4px; margin-bottom:6px;">
          <div style="display:flex; justify-content:space-between; font-size:0.72rem; color:var(--hud-subtext); margin-bottom:3px;">
            <span>Página ${note.page} (Chincheta)</span>
            <span>${note.date}</span>
          </div>
          <p style="font-size:0.8rem; color:#d1d5db; white-space:pre-wrap;">${note.content}</p>
        </div>
      `;
    });
    container.innerHTML = html;
  }

  // --- Search Engine ---
  async handleSearch(query) {
    const container = this.dom.searchResultsContainer;
    const countEl = this.dom.searchResultsCount;

    if (!query.trim()) {
      container.innerHTML = '';
      countEl.innerText = '';
      return;
    }

    if (window.pdfEngine && window.pdfEngine.isLoaded && (!this.pages[0] || !this.pages[0].text)) {
      countEl.innerText = 'Buscando en páginas...';
      for (let i = 0; i < Math.min(50, this.pages.length); i++) {
        if (!this.pages[i].text) {
          this.pages[i].text = await window.pdfEngine.extractPageText(this.pages[i].pageNum || (i + 1));
        }
      }
    }

    const results = window.bookAnnotations.search(query, this.pages);
    countEl.innerText = `${results.length} coincidencias`;

    if (results.length === 0) {
      container.innerHTML = `<p style="font-size:0.78rem; color:var(--hud-subtext);">Sin resultados.</p>`;
      return;
    }

    let html = '';
    results.slice(0, 30).forEach(r => {
      html += `
        <div style="padding:8px 10px; background:rgba(255,255,255,0.03); border-radius:4px; margin-bottom:6px; cursor:pointer;" onclick="window.luminaApp.goToPage(${r.page}); window.luminaApp.closeAllDrawers();">
          <div style="font-size:0.72rem; font-weight:600; color:var(--accent-gold); margin-bottom:2px;">PÁGINA ${r.page}</div>
          <p style="font-size:0.78rem; color:#d1d5db; line-height:1.35;">${r.snippet}</p>
        </div>
      `;
    });
    container.innerHTML = html;
  }

  // --- Text-To-Speech (Audiolibro) ---
  async toggleTTS() {
    if (!window.bookTTS.isPlaying) {
      const pageData = this.pages[this.currentPage - 1];
      let textToRead = pageData ? (pageData.text || '') : '';

      if (!textToRead.trim() && window.pdfEngine && window.pdfEngine.isLoaded) {
        textToRead = await window.pdfEngine.extractPageText(this.currentPage);
        if (pageData) pageData.text = textToRead;
      }

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
        } else if (window.pdfEngine && window.pdfEngine.isLoaded) {
          coverUrl = await window.pdfEngine.getPageDataUrl(1);
        }
      }

      for (let i = 0; i < this.pages.length; i++) {
        const p = this.pages[i];
        if (!p.text && window.pdfEngine && window.pdfEngine.isLoaded) {
          p.text = await window.pdfEngine.extractPageText(p.pageNum || (i + 1));
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
  window.ebookApp = window.luminaApp = new LuminaApp();
});
