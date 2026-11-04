/**
 * LuminaBook - 3D Realistic Flipbook Core Engine
 * Dual-page spread, single-page mode, bug-free bi-directional 3D page flip animation.
 */

class FlipbookCore {
  constructor(containerEl, options = {}) {
    this.container = containerEl;
    this.options = Object.assign({
      spread: 'double', // 'double' | 'single' | 'auto'
      soundEnabled: true,
      onPageChange: null,
      onFlipStart: null,
      onFlipEnd: null
    }, options);

    this.pages = [];
    this.currentPage = 1;
    this.isFlipping = false;
    this.zoomLevel = 1.0;

    this.initDOM();
    window.addEventListener('resize', () => this.handleResize());
  }

  initDOM() {
    this.container.innerHTML = `
      <div class="flipbook-stage" id="flipbookStage">
        <div class="book-3d-wrapper" id="bookWrapper">
          <!-- Left Wing / Page -->
          <div class="book-page-slot left-slot" id="leftSlot">
            <div class="page-paper" id="leftPaper"></div>
            <div class="page-gradient-crease left"></div>
            <div class="page-outer-stack left"></div>
          </div>

          <!-- Central Book Spine Axis -->
          <div class="book-spine-line" id="bookSpineLine"></div>

          <!-- Right Wing / Page -->
          <div class="book-page-slot right-slot" id="rightSlot">
            <div class="page-paper" id="rightPaper"></div>
            <div class="page-gradient-crease right"></div>
            <div class="page-outer-stack right"></div>
            <div class="corner-curl-hint" id="cornerCurlHint" title="Pasa la página"></div>
          </div>

          <!-- Dynamic 3D Flipping Sheet -->
          <div class="flipping-sheet" id="flippingSheet">
            <div class="flip-face front" id="flipFront"></div>
            <div class="flip-face back" id="flipBack"></div>
            <div class="flip-shadow" id="flipShadow"></div>
          </div>
        </div>
      </div>
    `;

    this.stage = this.container.querySelector('#flipbookStage');
    this.wrapper = this.container.querySelector('#bookWrapper');
    this.leftSlot = this.container.querySelector('#leftSlot');
    this.rightSlot = this.container.querySelector('#rightSlot');
    this.leftPaper = this.container.querySelector('#leftPaper');
    this.rightPaper = this.container.querySelector('#rightPaper');
    this.flippingSheet = this.container.querySelector('#flippingSheet');
    this.flipFront = this.container.querySelector('#flipFront');
    this.flipBack = this.container.querySelector('#flipBack');
    this.flipShadow = this.container.querySelector('#flipShadow');
    this.cornerCurlHint = this.container.querySelector('#cornerCurlHint');

    // Click on page wings to turn
    this.rightSlot.addEventListener('click', () => {
      if (this.isFlipping) return;
      if (window.getSelection && window.getSelection().toString().length > 0) return;
      this.next();
    });

    this.leftSlot.addEventListener('click', () => {
      if (this.isFlipping) return;
      if (window.getSelection && window.getSelection().toString().length > 0) return;
      this.prev();
    });
  }

  isSinglePage() {
    if (this.options.spread === 'single') return true;
    if (this.options.spread === 'double') return false;
    return window.innerWidth < 880;
  }

  setSpread(mode) {
    this.options.spread = mode; // 'single' or 'double'
    this.updateLayout();
    this.renderCurrentView();
  }

  setPages(pages) {
    this.pages = pages || [];
    this.currentPage = 1;
    this.updateLayout();
    this.renderCurrentView();
  }

  handleResize() {
    this.updateLayout();
    this.renderCurrentView();
  }

  updateLayout() {
    const single = this.isSinglePage();
    if (single) {
      this.wrapper.classList.add('single-mode');
      this.leftSlot.style.display = 'none';
      this.rightSlot.style.width = '100%';
    } else {
      this.wrapper.classList.remove('single-mode');
      this.leftSlot.style.display = 'block';
      this.rightSlot.style.width = '50%';
      this.leftSlot.style.width = '50%';
    }
  }

  getVisiblePages(targetPage = null) {
    const page = targetPage !== null ? targetPage : this.currentPage;
    const single = this.isSinglePage();
    if (single) {
      return [page, page];
    } else {
      if (page <= 1) {
        return [null, 1];
      }
      const leftPage = (page % 2 === 0) ? page : page - 1;
      const rightPage = leftPage + 1 <= this.pages.length ? leftPage + 1 : null;
      return [leftPage, rightPage];
    }
  }

  renderCurrentView() {
    if (this.pages.length === 0) return;
    const single = this.isSinglePage();

    if (single) {
      this._renderPageContent(this.rightPaper, this.currentPage);
      this.leftPaper.innerHTML = '';
    } else {
      const [leftNum, rightNum] = this.getVisiblePages();
      this._renderPageContent(this.leftPaper, leftNum);
      this._renderPageContent(this.rightPaper, rightNum);
    }

    if (this.options.onPageChange) {
      this.options.onPageChange(this.currentPage, this.pages.length);
    }
  }

  _renderPageContent(targetEl, pageNum) {
    if (!pageNum || pageNum < 1 || pageNum > this.pages.length) {
      targetEl.innerHTML = `<div class="empty-page-inner"><div class="spine-emboss"></div></div>`;
      return;
    }

    const pageData = this.pages[pageNum - 1];
    targetEl.innerHTML = '';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'page-content-wrapper';

    if (pageData.canvas) {
      const clonedCanvas = document.createElement('canvas');
      clonedCanvas.width = pageData.canvas.width;
      clonedCanvas.height = pageData.canvas.height;
      const ctx = clonedCanvas.getContext('2d');
      if (ctx) ctx.drawImage(pageData.canvas, 0, 0);
      clonedCanvas.className = 'rendered-page-canvas';
      contentDiv.appendChild(clonedCanvas);
    } else if (pageData.imageData) {
      const img = document.createElement('img');
      img.src = pageData.imageData;
      img.className = 'rendered-page-image';
      img.alt = `Página ${pageNum}`;
      contentDiv.appendChild(img);
    } else if (window.pdfEngine && window.pdfEngine.isLoaded && pageNum <= window.pdfEngine.numPages) {
      // On-demand lazy PDF rendering
      const canvasContainer = document.createElement('div');
      canvasContainer.className = 'rendered-page-container';
      canvasContainer.style.width = '100%';
      canvasContainer.style.height = '100%';
      canvasContainer.style.display = 'flex';
      canvasContainer.style.alignItems = 'center';
      canvasContainer.style.justifyContent = 'center';
      contentDiv.appendChild(canvasContainer);

      window.pdfEngine.renderPage(pageNum).then(rendered => {
        if (rendered && rendered.canvas && targetEl.contains(canvasContainer)) {
          canvasContainer.innerHTML = '';
          const clonedCanvas = document.createElement('canvas');
          clonedCanvas.width = rendered.canvas.width;
          clonedCanvas.height = rendered.canvas.height;
          const ctx = clonedCanvas.getContext('2d');
          if (ctx) ctx.drawImage(rendered.canvas, 0, 0);
          clonedCanvas.className = 'rendered-page-canvas';
          canvasContainer.appendChild(clonedCanvas);
        }
      }).catch(err => {
        console.warn(`Error al renderizar página ${pageNum}:`, err);
      });

      // Preload adjacent page in background
      if (pageNum < window.pdfEngine.numPages) {
        setTimeout(() => window.pdfEngine.renderPage(pageNum + 1).catch(() => {}), 150);
      }
    } else {
      const textArticle = document.createElement('article');
      textArticle.className = 'dynamic-page-text';
      if (pageData.title) {
        const h = document.createElement('h2');
        h.innerText = pageData.title;
        textArticle.appendChild(h);
      }
      if (pageData.html) {
        const bodyContent = document.createElement('div');
        bodyContent.innerHTML = pageData.html;
        textArticle.appendChild(bodyContent);
      } else if (pageData.text) {
        const paras = pageData.text.split('\n\n');
        paras.forEach(p => {
          if (!p.trim()) return;
          const pEl = document.createElement('p');
          pEl.innerText = p.trim();
          textArticle.appendChild(pEl);
        });
      }
      contentDiv.appendChild(textArticle);
    }

    const footerStamp = document.createElement('div');
    footerStamp.className = 'page-footer-stamp';
    footerStamp.innerHTML = `<span>— ${pageNum} —</span>`;
    contentDiv.appendChild(footerStamp);

    targetEl.appendChild(contentDiv);
  }

  /**
   * Turn Forward (Next Page)
   */
  next() {
    if (this.isFlipping) return;
    const single = this.isSinglePage();
    const maxPage = this.pages.length;

    if (this.currentPage >= maxPage) return;

    let targetPage;
    if (single) {
      targetPage = this.currentPage + 1;
    } else {
      if (this.currentPage === 1) {
        targetPage = 2;
      } else {
        const nextVal = this.currentPage % 2 === 0 ? this.currentPage + 2 : this.currentPage + 1;
        if (nextVal > maxPage) return;
        targetPage = nextVal;
      }
    }

    this._animateFlip(this.currentPage, targetPage, false);
  }

  /**
   * Turn Backward (Previous Page in Reverse)
   */
  prev() {
    if (this.isFlipping) return;
    const single = this.isSinglePage();

    if (this.currentPage <= 1) return;

    let targetPage;
    if (single) {
      targetPage = this.currentPage - 1;
    } else {
      if (this.currentPage === 2 || this.currentPage === 3) {
        targetPage = 1;
      } else {
        targetPage = Math.max(1, this.currentPage - 2);
      }
    }

    this._animateFlip(this.currentPage, targetPage, true);
  }

  goToPage(num) {
    if (this.isFlipping) return;
    const target = Math.max(1, Math.min(this.pages.length, parseInt(num) || 1));
    if (target === this.currentPage) return;
    const isReverse = target < this.currentPage;
    this._animateFlip(this.currentPage, target, isReverse);
  }

  /**
   * 3D Page Flip Animation (Glitch-free, Bi-directional)
   */
  _animateFlip(fromPage, toPage, isReverse) {
    this.isFlipping = true;
    if (this.options.onFlipStart) this.options.onFlipStart(toPage);

    if (window.bookAudio && this.options.soundEnabled) {
      window.bookAudio.playPageTurn(isReverse);
    }

    const single = this.isSinglePage();

    if (!isReverse) {
      // --- FORWARD FLIP (Right to Left) ---
      if (single) {
        // Underlying slot immediately displays destination page (eliminates old-page flash)
        this._renderPageContent(this.rightPaper, toPage);

        // Flipper sheet has old page on front, new page on back
        this._renderPageContent(this.flipFront, fromPage);
        this._renderPageContent(this.flipBack, toPage);
      } else {
        const [oldL, oldR] = this.getVisiblePages(fromPage);
        const [newL, newR] = this.getVisiblePages(toPage);

        // The right slot immediately displays newR underneath
        this._renderPageContent(this.rightPaper, newR);

        // Flipper sheet lifts oldR on front, lands newL on back
        this._renderPageContent(this.flipFront, oldR);
        this._renderPageContent(this.flipBack, newL);
      }

      this.flippingSheet.style.transition = 'none';
      this.flippingSheet.style.transform = 'rotateY(0deg)';
      this.flippingSheet.style.display = 'block';
      void this.flippingSheet.offsetWidth; // Force synchronous layout reflow

      this.flippingSheet.style.transition = 'transform 0.44s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      requestAnimationFrame(() => {
        this.flippingSheet.style.transform = 'rotateY(-180deg)';
        this.flipShadow.style.opacity = '0.45';
      });
    } else {
      // --- BACKWARD FLIP (Left to Right in Reverse) ---
      if (single) {
        // Underlying slot keeps current page while previous page swings over from left
        this._renderPageContent(this.rightPaper, fromPage);

        this._renderPageContent(this.flipFront, toPage);
        this._renderPageContent(this.flipBack, fromPage);
      } else {
        const [oldL, oldR] = this.getVisiblePages(fromPage);
        const [newL, newR] = this.getVisiblePages(toPage);

        // The left slot immediately displays newL underneath as oldL lifts
        this._renderPageContent(this.leftPaper, newL);

        // Flipper sheet starts on the left (-180deg). Its back face is facing reader with oldL.
        // When it rotates to 0deg on the right, its front face faces reader with newR!
        this._renderPageContent(this.flipFront, newR);
        this._renderPageContent(this.flipBack, oldL);
      }

      this.flippingSheet.style.transition = 'none';
      this.flippingSheet.style.transform = 'rotateY(-180deg)';
      this.flippingSheet.style.display = 'block';
      void this.flippingSheet.offsetWidth; // Force synchronous layout reflow

      this.flippingSheet.style.transition = 'transform 0.44s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      requestAnimationFrame(() => {
        this.flippingSheet.style.transform = 'rotateY(0deg)';
        this.flipShadow.style.opacity = '0.45';
      });
    }

    const duration = 440; // ms matching CSS transition

    setTimeout(() => {
      this.currentPage = toPage;
      this.renderCurrentView();

      this.flippingSheet.style.display = 'none';
      this.flippingSheet.style.transform = '';
      this.flipShadow.style.opacity = '0';
      this.isFlipping = false;

      if (this.options.onFlipEnd) this.options.onFlipEnd(this.currentPage);
    }, duration);
  }

  setZoom(zoom) {
    this.zoomLevel = Math.max(0.8, Math.min(2.5, zoom));
    this.wrapper.style.transform = `scale(${this.zoomLevel})`;
  }

  resetZoom() {
    this.zoomLevel = 1.0;
    this.wrapper.style.transform = 'scale(1)';
  }
}

window.FlipbookCore = FlipbookCore;
