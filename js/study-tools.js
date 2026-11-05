/**
 * LuminaBook - Study Tools & Visual Aids
 * Reading Ruler, Magnifier Glass, Grid Overview Modal, Flashcards Review,
 * Non-consecutive Page Comparator, and Slideshow Presentation Mode.
 */

class StudyTools {
  constructor() {
    this.rulerActive = false;
    this.magnifierActive = false;
    this.slideshowActive = false;
    this.slideshowInterval = 15; // seconds
    this.slideshowTimer = null;
    this.slideshowProgressTimer = null;

    this.rulerEl = null;
    this.magnifierEl = null;

    this.initDOM();
  }

  initDOM() {
    // 1. Reading Ruler Element
    this.rulerEl = document.createElement('div');
    this.rulerEl.id = 'readingRulerGuide';
    this.rulerEl.className = 'reading-ruler-guide';
    this.rulerEl.style.display = 'none';
    document.body.appendChild(this.rulerEl);

    window.addEventListener('pointermove', (e) => {
      if (this.rulerActive && this.rulerEl) {
        this.rulerEl.style.top = `${e.clientY - 18}px`;
      }
      if (this.magnifierActive && this.magnifierEl) {
        this._updateMagnifier(e);
      }
    });

    // 2. Magnifier Element
    this.magnifierEl = document.createElement('div');
    this.magnifierEl.id = 'floatingMagnifierGlass';
    this.magnifierEl.className = 'floating-magnifier-glass';
    this.magnifierEl.style.display = 'none';
    this.magnifierEl.innerHTML = `<canvas class="magnifier-canvas" width="220" height="220"></canvas><div class="magnifier-crosshair"></div>`;
    document.body.appendChild(this.magnifierEl);
  }

  // --- 1. Reading Ruler (Regla de lectura flotante) ---
  toggleRuler(force = null) {
    this.rulerActive = force !== null ? force : !this.rulerActive;
    if (this.rulerEl) {
      this.rulerEl.style.display = this.rulerActive ? 'block' : 'none';
    }
    if (window.luminaApp && window.luminaApp.showToast) {
      window.luminaApp.showToast(this.rulerActive ? 'Regla de lectura activada' : 'Regla de lectura desactivada');
    }
    return this.rulerActive;
  }

  // --- 2. Floating Magnifier Glass (Lupa de aumento flotante) ---
  toggleMagnifier(force = null) {
    this.magnifierActive = force !== null ? force : !this.magnifierActive;
    if (this.magnifierEl) {
      this.magnifierEl.style.display = this.magnifierActive ? 'block' : 'none';
    }
    if (window.luminaApp && window.luminaApp.showToast) {
      window.luminaApp.showToast(this.magnifierActive ? 'Lupa de aumento activada' : 'Lupa de aumento desactivada');
    }
    return this.magnifierActive;
  }

  _updateMagnifier(e) {
    if (!this.magnifierEl) return;
    const size = 150;
    const x = e.clientX;
    const y = e.clientY;

    this.magnifierEl.style.left = `${x - size / 2}px`;
    this.magnifierEl.style.top = `${y - size / 2}px`;

    const canvas = this.magnifierEl.querySelector('.magnifier-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, 220, 220);

    // Look for canvas underneath pointer
    this.magnifierEl.style.visibility = 'hidden';
    const underEl = document.elementFromPoint(x, y);
    this.magnifierEl.style.visibility = 'visible';

    const sourceCanvas = underEl ? underEl.closest('.rendered-page-canvas') || underEl.querySelector('canvas') : null;
    if (sourceCanvas && sourceCanvas.getContext) {
      const srcRect = sourceCanvas.getBoundingClientRect();
      const scaleX = sourceCanvas.width / srcRect.width;
      const scaleY = sourceCanvas.height / srcRect.height;

      const ptX = (x - srcRect.left) * scaleX;
      const ptY = (y - srcRect.top) * scaleY;

      const sampleSize = 55; // Captures small box
      ctx.drawImage(
        sourceCanvas,
        ptX - sampleSize / 2, ptY - sampleSize / 2, sampleSize, sampleSize,
        0, 0, 220, 220
      );
    }
  }

  // --- 3. Grid Overview (Vista de pájaro en cuadrícula) ---
  openGridOverview() {
    let modal = document.getElementById('gridOverviewModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'gridOverviewModal';
      modal.className = 'grid-overview-modal';
      modal.innerHTML = `
        <div class="grid-modal-header">
          <div class="grid-modal-title">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            <h3>Vista de Pájaro — Cuadrícula de Páginas</h3>
          </div>
          <button class="action-btn icon-only" id="btnCloseGridOverview" title="Cerrar vista [Esc]">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="grid-modal-body" id="gridCardsContainer"></div>
      `;
      document.body.appendChild(modal);

      modal.querySelector('#btnCloseGridOverview').addEventListener('click', () => {
        modal.classList.remove('open');
      });
    }

    const container = modal.querySelector('#gridCardsContainer');
    container.innerHTML = '';

    const totalPages = (window.luminaApp && window.luminaApp.pages) ? window.luminaApp.pages.length : 1;
    const curPage = window.luminaApp ? window.luminaApp.currentPage : 1;

    for (let p = 1; p <= totalPages; p++) {
      const card = document.createElement('div');
      card.className = `grid-page-card ${p === curPage ? 'current-page' : ''}`;
      card.innerHTML = `
        <div class="grid-thumb-slot" id="gridThumb_${p}">
          <div class="grid-thumb-skeleton">${p}</div>
        </div>
        <div class="grid-card-label">Página ${p}</div>
      `;

      card.addEventListener('click', () => {
        if (window.luminaApp) window.luminaApp.goToPage(p);
        modal.classList.remove('open');
      });

      container.appendChild(card);
    }

    modal.classList.add('open');

    // Lazy render visible grid thumbnails
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const card = entry.target;
          const pageNum = parseInt(card.querySelector('.grid-card-label').innerText.replace(/\D/g, '')) || 1;
          const slot = card.querySelector('.grid-thumb-slot');

          if (!slot.dataset.loaded) {
            slot.dataset.loaded = 'true';
            if (window.pdfEngine && window.pdfEngine.isLoaded) {
              window.pdfEngine.renderPage(pageNum).then(res => {
                if (res && res.canvas) {
                  slot.innerHTML = '';
                  const c = document.createElement('canvas');
                  c.width = 120;
                  c.height = (res.canvas.height / res.canvas.width) * 120;
                  const ctx = c.getContext('2d');
                  ctx.drawImage(res.canvas, 0, 0, c.width, c.height);
                  slot.appendChild(c);
                }
              }).catch(() => {});
            } else if (window.luminaApp && window.luminaApp.pages[pageNum - 1]) {
              const pData = window.luminaApp.pages[pageNum - 1];
              slot.innerHTML = `<div style="font-size:8px; padding:4px; line-height:1.2; color:#bbb; overflow:hidden; max-height:100%;">${pData.title || ''} ${pData.text ? pData.text.substring(0, 80) : ''}</div>`;
            }
          }
        }
      });
    }, { root: container, rootMargin: '100px' });

    container.querySelectorAll('.grid-page-card').forEach(c => observer.observe(c));

    // Scroll directly to current page card
    setTimeout(() => {
      const activeCard = container.querySelector('.current-page');
      if (activeCard) activeCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
  }

  // --- 4. Synchronized Left Thumbnail Sidebar ---
  initThumbnailsSidebar() {
    let sidebar = document.getElementById('sidebarThumbnails');
    if (sidebar) return;

    sidebar = document.createElement('aside');
    sidebar.id = 'sidebarThumbnails';
    sidebar.className = 'sidebar-thumbnails-panel';
    sidebar.innerHTML = `
      <div class="sidebar-thumb-header">
        <span style="font-size:0.78rem; text-transform:uppercase; letter-spacing:0.05em; font-weight:600; color:var(--hud-subtext);">Miniaturas</span>
        <button class="action-btn icon-only" id="btnCloseSidebarThumb" title="Cerrar barra lateral">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="sidebar-thumb-list" id="sidebarThumbList"></div>
    `;

    document.getElementById('appRoot').appendChild(sidebar);

    sidebar.querySelector('#btnCloseSidebarThumb').addEventListener('click', () => {
      sidebar.classList.remove('open');
    });
  }

  toggleThumbnailsSidebar() {
    this.initThumbnailsSidebar();
    const sidebar = document.getElementById('sidebarThumbnails');
    const isOpen = sidebar.classList.toggle('open');
    if (isOpen) {
      this.refreshThumbnailsSidebar();
    }
  }

  refreshThumbnailsSidebar() {
    const sidebar = document.getElementById('sidebarThumbnails');
    if (!sidebar || !sidebar.classList.contains('open')) return;

    const list = sidebar.querySelector('#sidebarThumbList');
    list.innerHTML = '';
    const total = window.luminaApp && window.luminaApp.pages ? window.luminaApp.pages.length : 1;
    const curPage = window.luminaApp ? window.luminaApp.currentPage : 1;

    for (let p = 1; p <= total; p++) {
      const item = document.createElement('div');
      item.className = `sidebar-thumb-item ${p === curPage ? 'active' : ''}`;
      item.id = `sideThumbItem_${p}`;
      item.innerHTML = `
        <div class="side-thumb-box" id="sideThumbBox_${p}">${p}</div>
        <span class="side-thumb-num">${p}</span>
      `;

      item.addEventListener('click', () => {
        if (window.luminaApp) window.luminaApp.goToPage(p);
      });

      list.appendChild(item);
    }

    // Scroll active item into view
    const activeItem = list.querySelector('.active');
    if (activeItem) activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  updateSidebarActivePage(pageNum) {
    const sidebar = document.getElementById('sidebarThumbnails');
    if (!sidebar) return;
    sidebar.querySelectorAll('.sidebar-thumb-item').forEach(el => el.classList.remove('active'));
    const target = sidebar.querySelector(`#sideThumbItem_${pageNum}`);
    if (target) {
      target.classList.add('active');
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  // --- 5. Slideshow Presentation Mode (Modo Presentación Automática) ---
  toggleSlideshow(intervalSec = 15) {
    this.slideshowInterval = intervalSec;
    if (this.slideshowActive) {
      this.stopSlideshow();
    } else {
      this.startSlideshow();
    }
  }

  startSlideshow() {
    this.slideshowActive = true;
    if (window.luminaApp && window.luminaApp.showToast) {
      window.luminaApp.showToast(`Presentación iniciada (avance cada ${this.slideshowInterval}s)`);
    }

    let hudBtn = document.getElementById('btnSlideshowToggle');
    if (hudBtn) hudBtn.classList.add('active-action');

    clearInterval(this.slideshowTimer);
    this.slideshowTimer = setInterval(() => {
      if (window.luminaApp) {
        if (window.luminaApp.currentPage >= window.luminaApp.totalPages) {
          this.stopSlideshow();
          window.luminaApp.showToast('Fin de la presentación');
        } else {
          window.luminaApp.nextPage();
        }
      }
    }, this.slideshowInterval * 1000);
  }

  stopSlideshow() {
    this.slideshowActive = false;
    clearInterval(this.slideshowTimer);
    let hudBtn = document.getElementById('btnSlideshowToggle');
    if (hudBtn) hudBtn.classList.remove('active-action');
    if (window.luminaApp && window.luminaApp.showToast) {
      window.luminaApp.showToast('Presentación pausada');
    }
  }

  // --- 6. Split-Screen Page Comparator (Comparador de dos páginas no consecutivas) ---
  openPageComparator() {
    let modal = document.getElementById('pageComparatorModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'pageComparatorModal';
      modal.className = 'page-comparator-modal';
      modal.innerHTML = `
        <div class="comparator-header">
          <div style="display:flex; align-items:center; gap:8px;">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none">
              <rect x="2" y="3" width="20" height="18" rx="2"></rect>
              <line x1="12" y1="3" x2="12" y2="21"></line>
            </svg>
            <h3>Comparador de Páginas No Consecutivas</h3>
          </div>
          <button class="action-btn icon-only" id="btnCloseComparator" title="Cerrar comparador">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="comparator-body">
          <div class="comparator-pane left-pane">
            <div class="comparator-pane-controls">
              <label>Panel Izquierdo: Pág.</label>
              <input type="number" id="compLeftPageInput" min="1" value="1" style="width:65px;">
            </div>
            <div class="comparator-canvas-slot" id="compLeftSlot"></div>
          </div>
          <div class="comparator-pane right-pane">
            <div class="comparator-pane-controls">
              <label>Panel Derecho (Referencia): Pág.</label>
              <input type="number" id="compRightPageInput" min="1" value="2" style="width:65px;">
            </div>
            <div class="comparator-canvas-slot" id="compRightSlot"></div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelector('#btnCloseComparator').addEventListener('click', () => {
        modal.classList.remove('open');
      });

      const leftInput = modal.querySelector('#compLeftPageInput');
      const rightInput = modal.querySelector('#compRightPageInput');

      leftInput.addEventListener('change', () => this._renderComparatorSlot('left', parseInt(leftInput.value) || 1));
      rightInput.addEventListener('change', () => this._renderComparatorSlot('right', parseInt(rightInput.value) || 1));
    }

    const curPage = window.luminaApp ? window.luminaApp.currentPage : 1;
    const total = window.luminaApp ? window.luminaApp.totalPages : 1;
    const compLeftInput = modal.querySelector('#compLeftPageInput');
    const compRightInput = modal.querySelector('#compRightPageInput');

    compLeftInput.max = total;
    compRightInput.max = total;
    compLeftInput.value = curPage;
    compRightInput.value = Math.min(total, curPage + 5);

    modal.classList.add('open');
    this._renderComparatorSlot('left', curPage);
    this._renderComparatorSlot('right', parseInt(compRightInput.value));
  }

  _renderComparatorSlot(side, pageNum) {
    const slot = document.getElementById(side === 'left' ? 'compLeftSlot' : 'compRightSlot');
    if (!slot) return;
    slot.innerHTML = '<div style="color:var(--hud-subtext); font-size:0.85rem;">Cargando página ' + pageNum + '...</div>';

    if (window.pdfEngine && window.pdfEngine.isLoaded) {
      window.pdfEngine.renderPage(pageNum).then(res => {
        if (res && res.canvas) {
          slot.innerHTML = '';
          const c = document.createElement('canvas');
          c.width = res.canvas.width;
          c.height = res.canvas.height;
          const ctx = c.getContext('2d');
          ctx.drawImage(res.canvas, 0, 0);
          c.style.maxWidth = '100%';
          c.style.maxHeight = '100%';
          c.style.objectFit = 'contain';
          slot.appendChild(c);
        }
      }).catch(() => {
        slot.innerHTML = '<div style="color:#e74c3c;">Error al cargar página</div>';
      });
    } else if (window.luminaApp && window.luminaApp.pages[pageNum - 1]) {
      const p = window.luminaApp.pages[pageNum - 1];
      slot.innerHTML = `<div style="padding:16px; overflow:auto; max-height:100%; color:#eee;"><h3>${p.title || ''}</h3><p>${p.text || ''}</p></div>`;
    }
  }

  // --- 7. Study Flashcards Modal (Modo Examen / Tarjetas) ---
  openFlashcardsModal() {
    let modal = document.getElementById('flashcardsModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'flashcardsModal';
      modal.className = 'flashcards-modal';
      modal.innerHTML = `
        <div class="flashcards-container">
          <div class="flashcards-header">
            <div style="display:flex; align-items:center; gap:8px;">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
              </svg>
              <h3>Modo Examen — Tarjetas de Memoria</h3>
            </div>
            <button class="action-btn icon-only" id="btnCloseFlashcards" title="Cerrar modo examen">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div class="flashcard-3d-scene">
            <div class="flashcard-card" id="activeFlashcard">
              <div class="flashcard-face front" id="fcFrontText">Pregunta o concepto...</div>
              <div class="flashcard-face back" id="fcBackText">Respuesta o cita...</div>
            </div>
          </div>
          <div class="flashcard-hint-label">Haz clic sobre la tarjeta para voltearla (giro 3D)</div>

          <div class="flashcards-controls">
            <button class="action-btn danger" id="btnFCLearnAgain">Repasar luego</button>
            <span class="flashcard-counter" id="fcCounterLabel">1 / 1</span>
            <button class="action-btn success" id="btnFCMastered">¡Lo sabía!</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelector('#btnCloseFlashcards').addEventListener('click', () => modal.classList.remove('open'));

      const card = modal.querySelector('#activeFlashcard');
      card.addEventListener('click', () => {
        card.classList.toggle('flipped');
      });

      modal.querySelector('#btnFCLearnAgain').addEventListener('click', () => {
        this._nextFlashcard(false);
      });

      modal.querySelector('#btnFCMastered').addEventListener('click', () => {
        this._nextFlashcard(true);
      });
    }

    this.currentFCIndex = 0;
    this.fcList = window.bookAnnotations ? window.bookAnnotations.getFlashcards() : [];

    if (this.fcList.length === 0) {
      alert('No hay citas subrayadas ni notas para generar tarjetas.\n\nSubraya texto o añade notas en el documento para crear tarjetas de estudio automáticamente.');
      return;
    }

    modal.classList.add('open');
    this._showCurrentFlashcard();
  }

  _showCurrentFlashcard() {
    const modal = document.getElementById('flashcardsModal');
    if (!modal) return;
    const card = modal.querySelector('#activeFlashcard');
    card.classList.remove('flipped');

    const item = this.fcList[this.currentFCIndex];
    if (!item) return;

    modal.querySelector('#fcFrontText').innerText = item.front;
    modal.querySelector('#fcBackText').innerText = item.back;
    modal.querySelector('#fcCounterLabel').innerText = `${this.currentFCIndex + 1} / ${this.fcList.length}`;
  }

  _nextFlashcard(mastered) {
    if (this.fcList[this.currentFCIndex]) {
      window.bookAnnotations.updateFlashcardStatus(this.fcList[this.currentFCIndex].id, mastered);
    }

    if (this.currentFCIndex + 1 < this.fcList.length) {
      this.currentFCIndex++;
      this._showCurrentFlashcard();
    } else {
      alert('¡Has completado todas las tarjetas de esta sesión de estudio!');
      const modal = document.getElementById('flashcardsModal');
      if (modal) modal.classList.remove('open');
    }
  }
}

window.studyTools = new StudyTools();
