/**
 * LuminaBook - 3D Realistic Flipbook Core Engine
 * Dual-page spread, dynamic 3D page curl/turning animation, realistic paper shadows & spine depth.
 */

class FlipbookCore {
  constructor(containerEl, options = {}) {
    this.container = containerEl;
    this.options = Object.assign({
      spread: 'auto', // 'auto', 'double', 'single'
      soundEnabled: true,
      onPageChange: null,
      onFlipStart: null,
      onFlipEnd: null
    }, options);

    this.pages = []; // Array of page objects or renders
    this.currentPage = 1; // 1-based page number
    this.isFlipping = false;
    this.zoomLevel = 1.0;

    this.initDOM();
    window.addEventListener('resize', () => this.handleResize());
  }

  initDOM() {
    this.container.innerHTML = `
      <div class="flipbook-stage" id="flipbookStage">
        <div class="book-spine-shadow"></div>
        <div class="book-3d-wrapper" id="bookWrapper">
          <!-- Left Wing / Page -->
          <div class="book-page-slot left-slot" id="leftSlot">
            <div class="page-paper" id="leftPaper"></div>
            <div class="page-gradient-crease left"></div>
            <div class="page-outer-stack left"></div>
          </div>

          <!-- Central Book Spine Axis -->
          <div class="book-spine-line"></div>

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
    this.rightSlot.addEventListener('click', (e) => {
      if (this.isFlipping) return;
      // Do not trigger page turn if selecting text or clicking interactive elements
      if (window.getSelection().toString().length > 0) return;
      this.next();
    });

    this.leftSlot.addEventListener('click', (e) => {
      if (this.isFlipping) return;
      if (window.getSelection().toString().length > 0) return;
      this.prev();
    });
  }

  isSinglePage() {
    if (this.options.spread === 'single') return true;
    if (this.options.spread === 'double') return false;
    // Auto: Single page for mobile/vertical screens or narrow viewport
    return window.innerWidth < 880 || (window.innerHeight > window.innerWidth);
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

  /**
   * Get the visible page numbers for the current view
   */
  getVisiblePages() {
    const single = this.isSinglePage();
    if (single) {
      return [this.currentPage];
    } else {
      if (this.currentPage === 1) {
        // Page 1 is Cover (alone on right or center)
        return [null, 1];
      }
      // Facing pages: even on left, odd on right
      const leftPage = (this.currentPage % 2 === 0) ? this.currentPage : this.currentPage - 1;
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

    // If canvas is already rendered
    if (pageData.canvas) {
      const clonedCanvas = document.createElement('canvas');
      clonedCanvas.width = pageData.canvas.width;
      clonedCanvas.height = pageData.canvas.height;
      const ctx = clonedCanvas.getContext('2d');
      ctx.drawImage(pageData.canvas, 0, 0);
      clonedCanvas.className = 'rendered-page-canvas';
      contentDiv.appendChild(clonedCanvas);
    } else if (pageData.imageData) {
      const img = document.createElement('img');
      img.src = pageData.imageData;
      img.className = 'rendered-page-image';
      img.alt = `Página ${pageNum}`;
      contentDiv.appendChild(img);
    } else {
      // Dynamic HTML / Text view
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

    // Page Number Stamp
    const footerStamp = document.createElement('div');
    footerStamp.className = 'page-footer-stamp';
    footerStamp.innerHTML = `<span>— ${pageNum} —</span>`;
    contentDiv.appendChild(footerStamp);

    targetEl.appendChild(contentDiv);
  }

  /**
   * Turn Forward (Next Page) with 3D Flip Animation
   */
  next() {
    if (this.isFlipping) return;
    const single = this.isSinglePage();
    const maxPage = this.pages.length;

    let targetPage;
    if (single) {
      if (this.currentPage >= maxPage) return;
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
   * Turn Backward (Previous Page) with 3D Flip Animation
   */
  prev() {
    if (this.isFlipping) return;
    const single = this.isSinglePage();

    let targetPage;
    if (single) {
      if (this.currentPage <= 1) return;
      targetPage = this.currentPage - 1;
    } else {
      if (this.currentPage <= 1) return;
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
   * 3D Page Flip Animation Orchestrator
   */
  _animateFlip(fromPage, toPage, isReverse) {
    this.isFlipping = true;
    if (this.options.onFlipStart) this.options.onFlipStart(toPage);

    // Play synthesized page turn sound
    if (window.bookAudio && this.options.soundEnabled) {
      window.bookAudio.playPageTurn(isReverse);
    }

    const single = this.isSinglePage();

    // Setup the 3D flipping sheet faces
    if (!isReverse) {
      // Forward Turn: Right to Left
      this._renderPageContent(this.flipFront, single ? fromPage : fromPage);
      this._renderPageContent(this.flipBack, toPage);

      this.flippingSheet.style.display = 'block';
      this.flippingSheet.className = 'flipping-sheet turning-forward';

      // Animate rotation from 0 to -180deg
      requestAnimationFrame(() => {
        this.flippingSheet.style.transform = 'rotateY(-180deg)';
        this.flipShadow.style.opacity = '0.5';
      });
    } else {
      // Backward Turn: Left to Right
      this._renderPageContent(this.flipFront, toPage);
      this._renderPageContent(this.flipBack, single ? fromPage : fromPage);

      this.flippingSheet.style.display = 'block';
      this.flippingSheet.className = 'flipping-sheet turning-backward';
      this.flippingSheet.style.transform = 'rotateY(-180deg)';

      requestAnimationFrame(() => {
        this.flippingSheet.style.transform = 'rotateY(0deg)';
        this.flipShadow.style.opacity = '0.5';
      });
    }

    const duration = 480; // ms matching CSS transition

    setTimeout(() => {
      this.currentPage = toPage;
      this.renderCurrentView();

      this.flippingSheet.style.display = 'none';
      this.flippingSheet.style.transform = '';
      this.flippingSheet.className = 'flipping-sheet';
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
