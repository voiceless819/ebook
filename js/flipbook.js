/**
 * Ebook4u - 3D Realistic Flipbook Core Engine
 * Dual-page spread, single-page mode, bi-directional 3D page flip,
 * dynamic spine & page stack thickness, gyroscope-reactive shadows,
 * and real-time interactive corner drag.
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
    this.isDraggingCorner = false;
    this.dragStartX = 0;
    this.dragProgress = 0;
    this.zoomLevel = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.isPanning = false;
    this.panStartX = 0;
    this.panStartY = 0;

    this.initDOM();
    this.initInteractiveCornerDrag();
    this.initGyroscopeShadows();
    this.initZoomAndPan();

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
            <div class="page-outer-stack left" id="leftStack"></div>
            <div class="corner-curl-hint left" id="cornerCurlHintLeft" title="Arrastrar para retroceder página"></div>
          </div>

          <!-- Central Book Spine Axis -->
          <div class="book-spine-line" id="bookSpineLine"></div>

          <!-- Right Wing / Page -->
          <div class="book-page-slot right-slot" id="rightSlot">
            <div class="page-paper" id="rightPaper"></div>
            <div class="page-gradient-crease right"></div>
            <div class="page-outer-stack right" id="rightStack"></div>
            <div class="corner-curl-hint right" id="cornerCurlHintRight" title="Arrastrar para pasar página"></div>
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
    this.leftStack = this.container.querySelector('#leftStack');
    this.rightStack = this.container.querySelector('#rightStack');
    this.bookSpineLine = this.container.querySelector('#bookSpineLine');
    this.flippingSheet = this.container.querySelector('#flippingSheet');
    this.flipFront = this.container.querySelector('#flipFront');
    this.flipBack = this.container.querySelector('#flipBack');
    this.flipShadow = this.container.querySelector('#flipShadow');
    this.cornerCurlHintRight = this.container.querySelector('#cornerCurlHintRight');
    this.cornerCurlHintLeft = this.container.querySelector('#cornerCurlHintLeft');

    // Click on page wings to turn (only if not dragging corner)
    this.rightSlot.addEventListener('click', (e) => {
      if (this.isFlipping || this.isDraggingCorner) return;
      if (e.target.closest('.corner-curl-hint')) return;
      if (window.getSelection && window.getSelection().toString().length > 0) return;
      this.next();
    });

    this.leftSlot.addEventListener('click', (e) => {
      if (this.isFlipping || this.isDraggingCorner) return;
      if (e.target.closest('.corner-curl-hint')) return;
      if (window.getSelection && window.getSelection().toString().length > 0) return;
      this.prev();
    });
  }

  /**
   * Real-time Interactive Corner Drag (Peel)
   */
  initInteractiveCornerDrag() {
    const handleDragStart = (e, direction) => {
      if (this.isFlipping) return;
      e.stopPropagation();
      e.preventDefault();

      const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
      this.isDraggingCorner = true;
      this.dragDirection = direction; // 'forward' | 'backward'
      this.dragStartX = clientX;
      this.dragProgress = 0;

      const single = this.isSinglePage();
      const fromPage = this.currentPage;
      let toPage;

      if (direction === 'forward') {
        if (fromPage >= this.pages.length) {
          this.isDraggingCorner = false;
          return;
        }
        toPage = single ? fromPage + 1 : (fromPage === 1 ? 2 : fromPage + 2);
        if (toPage > this.pages.length && !single) toPage = this.pages.length;

        if (single) {
          this._renderPageContent(this.rightPaper, toPage);
          this._renderPageContent(this.flipFront, fromPage);
          this._renderPageContent(this.flipBack, toPage);
        } else {
          const [, oldR] = this.getVisiblePages(fromPage);
          const [newL, newR] = this.getVisiblePages(toPage);
          this._renderPageContent(this.rightPaper, newR);
          this._renderPageContent(this.flipFront, oldR);
          this._renderPageContent(this.flipBack, newL);
        }

        this.flippingSheet.style.transition = 'none';
        this.flippingSheet.style.transform = 'rotateY(0deg)';
        this.flippingSheet.style.display = 'block';
      } else {
        if (fromPage <= 1) {
          this.isDraggingCorner = false;
          return;
        }
        toPage = single ? fromPage - 1 : (fromPage === 2 || fromPage === 3 ? 1 : fromPage - 2);

        if (single) {
          this._renderPageContent(this.rightPaper, fromPage);
          this._renderPageContent(this.flipFront, toPage);
          this._renderPageContent(this.flipBack, fromPage);
        } else {
          const [oldL] = this.getVisiblePages(fromPage);
          const [newL, newR] = this.getVisiblePages(toPage);
          this._renderPageContent(this.leftPaper, newL);
          this._renderPageContent(this.flipFront, newR);
          this._renderPageContent(this.flipBack, oldL);
        }

        this.flippingSheet.style.transition = 'none';
        this.flippingSheet.style.transform = 'rotateY(-180deg)';
        this.flippingSheet.style.display = 'block';
      }

      this.targetDestinationPage = toPage;

      const onPointerMove = (moveEvt) => {
        if (!this.isDraggingCorner) return;
        const curX = moveEvt.clientX || (moveEvt.touches && moveEvt.touches[0] ? moveEvt.touches[0].clientX : curX);
        const deltaX = curX - this.dragStartX;
        const slotWidth = this.rightSlot.offsetWidth || 300;

        if (this.dragDirection === 'forward') {
          // Dragging to the left (negative deltaX)
          const pct = Math.max(0, Math.min(1, -deltaX / (slotWidth * 0.85)));
          this.dragProgress = pct;
          const deg = -180 * pct;
          this.flippingSheet.style.transform = `rotateY(${deg}deg)`;
          this.flipShadow.style.opacity = (pct * 0.5).toFixed(2);
        } else {
          // Dragging to the right (positive deltaX)
          const pct = Math.max(0, Math.min(1, deltaX / (slotWidth * 0.85)));
          this.dragProgress = pct;
          const deg = -180 + (180 * pct);
          this.flippingSheet.style.transform = `rotateY(${deg}deg)`;
          this.flipShadow.style.opacity = (pct * 0.5).toFixed(2);
        }
      };

      const onPointerUp = () => {
        if (!this.isDraggingCorner) return;
        this.isDraggingCorner = false;
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('touchmove', onPointerMove);
        window.removeEventListener('touchend', onPointerUp);

        const shouldComplete = this.dragProgress >= 0.28;
        this.flippingSheet.style.transition = 'transform 0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

        if (this.dragDirection === 'forward') {
          if (shouldComplete) {
            this.flippingSheet.style.transform = 'rotateY(-180deg)';
            this.flipShadow.style.opacity = '0.45';
            if (window.bookAudio && this.options.soundEnabled) window.bookAudio.playPageTurn(false);
            setTimeout(() => {
              this.currentPage = this.targetDestinationPage;
              this.renderCurrentView();
              this.flippingSheet.style.display = 'none';
              this.flippingSheet.style.transform = '';
            }, 320);
          } else {
            // Revert back
            this.flippingSheet.style.transform = 'rotateY(0deg)';
            this.flipShadow.style.opacity = '0';
            setTimeout(() => {
              this.renderCurrentView();
              this.flippingSheet.style.display = 'none';
              this.flippingSheet.style.transform = '';
            }, 320);
          }
        } else {
          if (shouldComplete) {
            this.flippingSheet.style.transform = 'rotateY(0deg)';
            this.flipShadow.style.opacity = '0';
            if (window.bookAudio && this.options.soundEnabled) window.bookAudio.playPageTurn(true);
            setTimeout(() => {
              this.currentPage = this.targetDestinationPage;
              this.renderCurrentView();
              this.flippingSheet.style.display = 'none';
              this.flippingSheet.style.transform = '';
            }, 320);
          } else {
            // Revert back to -180deg
            this.flippingSheet.style.transform = 'rotateY(-180deg)';
            setTimeout(() => {
              this.renderCurrentView();
              this.flippingSheet.style.display = 'none';
              this.flippingSheet.style.transform = '';
            }, 320);
          }
        }
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('touchmove', onPointerMove, { passive: true });
      window.addEventListener('touchend', onPointerUp);
    };

    if (this.cornerCurlHintRight) {
      this.cornerCurlHintRight.addEventListener('pointerdown', (e) => handleDragStart(e, 'forward'));
    }
    if (this.cornerCurlHintLeft) {
      this.cornerCurlHintLeft.addEventListener('pointerdown', (e) => handleDragStart(e, 'backward'));
    }
  }

  /**
   * Gyroscope & Dynamic Light Tilt Shadows
   */
  initGyroscopeShadows() {
    // Gyroscope on mobile
    if (window.DeviceOrientationEvent && typeof window.DeviceOrientationEvent.requestPermission !== 'function') {
      window.addEventListener('deviceorientation', (e) => {
        if (e.gamma !== null && e.beta !== null) {
          const shadowX = Math.max(-25, Math.min(25, e.gamma * 0.8));
          const shadowY = Math.max(5, Math.min(35, (e.beta - 45) * 0.5));
          this.wrapper.style.setProperty('--gyro-shadow-x', `${shadowX}px`);
          this.wrapper.style.setProperty('--gyro-shadow-y', `${shadowY}px`);
        }
      }, { passive: true });
    }

    // Interactive mouse light tracking on desktop
    this.stage.addEventListener('mousemove', (e) => {
      const rect = this.stage.getBoundingClientRect();
      const relativeX = (e.clientX - rect.left) / rect.width - 0.5;
      const relativeY = (e.clientY - rect.top) / rect.height - 0.5;
      const shadowX = Math.round(relativeX * 30);
      const shadowY = Math.round(20 + relativeY * 15);
      this.wrapper.style.setProperty('--gyro-shadow-x', `${shadowX}px`);
      this.wrapper.style.setProperty('--gyro-shadow-y', `${shadowY}px`);
    });
  }

  isSinglePage() {
    if (this.options.spread === 'single') return true;
    if (this.options.spread === 'double') return false;
    return window.innerWidth < 880;
  }

  setSpread(mode) {
    this.options.spread = mode;
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

  /**
   * Dynamic Spine & Paper Stack Thickness calculation
   */
  updateLayout() {
    const single = this.isSinglePage();
    const total = Math.max(1, this.pages.length);

    // Calculate realistic physical thickness based on total pages
    // 20 pages = ~3px, 100 pages = ~8px, 400 pages = ~18px
    const maxThickness = Math.min(22, Math.max(3, Math.round(Math.log2(total) * 2.4)));

    // Proportionate distribution between left stack and right stack
    const progressRatio = total > 1 ? (this.currentPage - 1) / (total - 1) : 0;
    const leftPx = Math.max(1, Math.round(progressRatio * maxThickness));
    const rightPx = Math.max(1, Math.round((1 - progressRatio) * maxThickness));

    if (this.leftStack) {
      this.leftStack.style.width = `${leftPx}px`;
      this.leftStack.style.boxShadow = `-${leftPx}px 0 0 0 rgba(0,0,0,0.18), inset 1px 0 0 rgba(255,255,255,0.08)`;
    }
    if (this.rightStack) {
      this.rightStack.style.width = `${rightPx}px`;
      this.rightStack.style.boxShadow = `${rightPx}px 0 0 0 rgba(0,0,0,0.18), inset -1px 0 0 rgba(255,255,255,0.08)`;
    }

    if (this.bookSpineLine) {
      this.bookSpineLine.style.width = `${Math.max(4, Math.min(16, Math.round(maxThickness * 0.7)))}px`;
    }

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

    // Refresh stack thicknesses after page changes
    this.updateLayout();

    // Trigger drawing layer refresh if drawing controller is active
    if (window.drawingController && window.ebookApp && window.ebookApp.currentBookId) {
      window.drawingController.attachToSlot(this.rightSlot, this.currentPage);
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
    contentDiv.dataset.page = pageNum;

    const isPdfDoc = (window.pdfEngine && window.pdfEngine.isLoaded && pageNum <= window.pdfEngine.numPages);
    if (isPdfDoc || pageData.canvas || pageData.imageData) {
      contentDiv.classList.add('pdf-page-wrapper');
    }

    if (pageData.canvas) {
      const clonedCanvas = document.createElement('canvas');
      clonedCanvas.width = pageData.canvas.width;
      clonedCanvas.height = pageData.canvas.height;
      const ctx = clonedCanvas.getContext('2d', { alpha: false });
      if (ctx) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(pageData.canvas, 0, 0);
      }
      clonedCanvas.className = 'rendered-page-canvas';
      contentDiv.appendChild(clonedCanvas);
    } else if (pageData.imageData) {
      const img = document.createElement('img');
      img.src = pageData.imageData;
      img.className = 'rendered-page-image';
      img.alt = `Página ${pageNum}`;
      contentDiv.appendChild(img);
    } else if (isPdfDoc) {
      // Lazy on-demand rendering
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
          const ctx = clonedCanvas.getContext('2d', { alpha: false });
          if (ctx) {
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(rendered.canvas, 0, 0);
          }
          clonedCanvas.className = 'rendered-page-canvas';
          canvasContainer.appendChild(clonedCanvas);
        }
      }).catch(err => {
        console.warn(`Error al renderizar página ${pageNum}:`, err);
      });

      // Background prefetch next page
      if (pageNum < window.pdfEngine.numPages) {
        setTimeout(() => window.pdfEngine.renderPage(pageNum + 1).catch(() => {}), 120);
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

    // Sticky note coordinate pins overlay
    if (window.bookAnnotations) {
      const notesForPage = window.bookAnnotations.getNotesForPage(pageNum);
      if (notesForPage && notesForPage.length > 0) {
        notesForPage.forEach(n => {
          const pin = document.createElement('div');
          pin.className = 'page-sticky-pin';
          pin.style.left = `${n.x || 50}%`;
          pin.style.top = `${n.y || 50}%`;
          pin.title = `Nota: ${n.content}`;
          pin.innerHTML = `
            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
              <path d="M16 12V4H17V2H7V4H8V12L6 14V16H11V22L12 23L13 22V16H18V14L16 12Z"/>
            </svg>
          `;
          pin.addEventListener('click', (e) => {
            e.stopPropagation();
            alert(`Nota en página ${pageNum}:\n\n"${n.content}"\n(${n.date})`);
          });
          contentDiv.appendChild(pin);
        });
      }
    }

    // Only append footer stamp for text/manual pages (PDF pages already have their own headers & footers)
    if (!isPdfDoc && !pageData.canvas && !pageData.imageData) {
      const footerStamp = document.createElement('div');
      footerStamp.className = 'page-footer-stamp';
      footerStamp.innerHTML = `<span>— ${pageNum} —</span>`;
      contentDiv.appendChild(footerStamp);
    }

        // Ribbon bookmark indicator on active page sheet
    if (window.bookAnnotations && window.bookAnnotations.isBookmarked && window.bookAnnotations.isBookmarked(pageNum)) {
      const ribbon = document.createElement('div');
      ribbon.className = 'book-ribbon-marker';
      ribbon.title = 'Página marcada (Clic para desmarcar)';
      ribbon.innerHTML = `
        <svg viewBox="0 0 24 38" width="24" height="38" fill="none">
          <path d="M0 0 H24 V38 L12 28 L0 38 Z" fill="#d97706"/>
        </svg>
      `;
      ribbon.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.ebookApp) {
          window.ebookApp.toggleBookmarkCurrentPage();
        }
      });
      contentDiv.appendChild(ribbon);
    }

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

  _animateFlip(fromPage, toPage, isReverse) {
    this.isFlipping = true;
    if (this.options.onFlipStart) this.options.onFlipStart(toPage);

    if (window.bookAudio && this.options.soundEnabled) {
      window.bookAudio.playPageTurn(isReverse);
    }
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(15);
    }

    const single = this.isSinglePage();

    if (!isReverse) {
      // Forward Flip
      if (single) {
        this._renderPageContent(this.rightPaper, toPage);
        this._renderPageContent(this.flipFront, fromPage);
        this._renderPageContent(this.flipBack, toPage);
      } else {
        const [, oldR] = this.getVisiblePages(fromPage);
        const [newL, newR] = this.getVisiblePages(toPage);
        this._renderPageContent(this.rightPaper, newR);
        this._renderPageContent(this.flipFront, oldR);
        this._renderPageContent(this.flipBack, newL);
      }

      this.flippingSheet.style.transition = 'none';
      this.flippingSheet.style.transform = 'rotateY(0deg)';
      this.flippingSheet.style.display = 'block';
      void this.flippingSheet.offsetWidth;

      this.flippingSheet.style.transition = 'transform 0.44s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      requestAnimationFrame(() => {
        this.flippingSheet.style.transform = 'rotateY(-180deg)';
        this.flipShadow.style.opacity = '0.45';
      });
    } else {
      // Backward Flip
      if (single) {
        this._renderPageContent(this.rightPaper, fromPage);
        this._renderPageContent(this.flipFront, toPage);
        this._renderPageContent(this.flipBack, fromPage);
      } else {
        const [oldL] = this.getVisiblePages(fromPage);
        const [newL, newR] = this.getVisiblePages(toPage);
        this._renderPageContent(this.leftPaper, newL);
        this._renderPageContent(this.flipFront, newR);
        this._renderPageContent(this.flipBack, oldL);
      }

      this.flippingSheet.style.transition = 'none';
      this.flippingSheet.style.transform = 'rotateY(-180deg)';
      this.flippingSheet.style.display = 'block';
      void this.flippingSheet.offsetWidth;

      this.flippingSheet.style.transition = 'transform 0.44s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      requestAnimationFrame(() => {
        this.flippingSheet.style.transform = 'rotateY(0deg)';
        this.flipShadow.style.opacity = '0.45';
      });
    }

    const duration = 440;

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

  initZoomAndPan() {
    const stage = document.getElementById('flipbookStage') || this.container;
    const workspace = document.getElementById('readerWorkspace') || document.body;

    stage.addEventListener('pointerdown', (e) => {
      if (this.zoomLevel <= 1.0) return;
      if (e.target.closest('button, input, select, .book-ribbon-marker, .page-sticky-pin, .corner-curl-hint')) return;
      this.isPanning = true;
      this.panStartX = e.clientX - this.panX;
      this.panStartY = e.clientY - this.panY;
      workspace.classList.add('is-panning');
      try { stage.setPointerCapture(e.pointerId); } catch(err) {}
    });

    stage.addEventListener('pointermove', (e) => {
      if (!this.isPanning) return;
      this.panX = e.clientX - this.panStartX;
      this.panY = e.clientY - this.panStartY;
      this._updateTransform();
    });

    const stopPan = () => {
      if (this.isPanning) {
        this.isPanning = false;
        workspace.classList.remove('is-panning');
      }
    };
    stage.addEventListener('pointerup', stopPan);
    stage.addEventListener('pointercancel', stopPan);

    stage.addEventListener('dblclick', (e) => {
      if (e.target.closest('button, input, select, .book-ribbon-marker, .page-sticky-pin, .corner-curl-hint')) return;
      if (this.zoomLevel > 1.0) {
        this.resetZoom();
      } else {
        this.setZoom(1.5);
      }
    });

    stage.addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.2 : -0.2;
        this.setZoom(this.zoomLevel + delta);
      }
    }, { passive: false });
  }

  setZoom(zoom) {
    this.zoomLevel = Math.max(1.0, Math.min(3.0, Math.round(zoom * 100) / 100));
    const workspace = document.getElementById('readerWorkspace');
    if (workspace) {
      if (this.zoomLevel > 1.0) workspace.classList.add('is-zoomed');
      else workspace.classList.remove('is-zoomed');
    }
    this._updateTransform();
    if (window.ebookApp && window.ebookApp.onZoomChanged) {
      window.ebookApp.onZoomChanged(this.zoomLevel);
    }
  }

  resetZoom() {
    this.panX = 0;
    this.panY = 0;
    this.setZoom(1.0);
  }

  _updateTransform() {
    if (!this.wrapper) return;
    if (this.zoomLevel <= 1.0) {
      this.panX = 0;
      this.panY = 0;
      this.wrapper.style.transform = '';
      return;
    }
    const maxPanX = (this.wrapper.offsetWidth * (this.zoomLevel - 1)) / 1.7;
    const maxPanY = (this.wrapper.offsetHeight * (this.zoomLevel - 1)) / 1.7;
    this.panX = Math.max(-maxPanX, Math.min(maxPanX, this.panX));
    this.panY = Math.max(-maxPanY, Math.min(maxPanY, this.panY));
    this.wrapper.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoomLevel})`;
  }
}

window.FlipbookCore = FlipbookCore;
