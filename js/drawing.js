/**
 * LuminaBook - Freehand Drawing Engine & Stylus / Apple Pencil Support
 * Supports Apple Pencil / S-Pen / Mouse, Palm Rejection, Eraser,
 * multiple stroke widths, colors, and persistent storage in IndexedDB.
 */

class DrawingController {
  constructor() {
    this.active = false;
    this.color = '#e74c3c'; // Default ink color (red)
    this.lineWidth = 3;
    this.isEraser = false;
    this.isDrawing = false;
    this.hasStylus = false;
    this.currentBookId = null;
    this.currentPage = 1;

    this.currentPath = [];
    this.strokes = []; // Array of { color, width, isEraser, points: [{x, y, p}] }

    this.canvas = null;
    this.ctx = null;
    this.container = null;

    this.initFloatingToolbar();
  }

  initFloatingToolbar() {
    let toolbar = document.getElementById('drawingFloatingToolbar');
    if (toolbar) return;

    toolbar = document.createElement('div');
    toolbar.id = 'drawingFloatingToolbar';
    toolbar.className = 'drawing-floating-toolbar';
    toolbar.style.display = 'none';
    toolbar.innerHTML = `
      <div class="draw-tool-group">
        <button class="draw-tool-btn active" id="btnDrawPen" title="Bolígrafo / Lápiz">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
            <path d="M2 2l7.586 7.586"></path>
          </svg>
        </button>
        <button class="draw-tool-btn" id="btnDrawEraser" title="Borrador">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"></path>
            <path d="M22 21H7"></path>
            <path d="m5 11 9 9"></path>
          </svg>
        </button>
      </div>

      <div class="draw-color-palette">
        <span class="draw-color-dot active" data-color="#e74c3c" style="background:#e74c3c;"></span>
        <span class="draw-color-dot" data-color="#3498db" style="background:#3498db;"></span>
        <span class="draw-color-dot" data-color="#2ecc71" style="background:#2ecc71;"></span>
        <span class="draw-color-dot" data-color="#f1c40f" style="background:#f1c40f;"></span>
        <span class="draw-color-dot" data-color="#ffffff" style="background:#ffffff;"></span>
      </div>

      <div class="draw-size-selector">
        <button class="draw-size-btn active" data-size="2" title="Fino">Fino</button>
        <button class="draw-size-btn" data-size="4" title="Medio">Med</button>
        <button class="draw-size-btn" data-size="8" title="Grueso">Grueso</button>
      </div>

      <div class="draw-action-group">
        <button class="draw-tool-btn danger" id="btnDrawClear" title="Borrar todo">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
        <button class="draw-tool-btn primary" id="btnDrawClose" title="Cerrar modo dibujo">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    `;

    document.body.appendChild(toolbar);

    // Toolbar Listeners
    toolbar.querySelector('#btnDrawPen').addEventListener('click', () => {
      this.isEraser = false;
      toolbar.querySelector('#btnDrawPen').classList.add('active');
      toolbar.querySelector('#btnDrawEraser').classList.remove('active');
    });

    toolbar.querySelector('#btnDrawEraser').addEventListener('click', () => {
      this.isEraser = true;
      toolbar.querySelector('#btnDrawEraser').classList.add('active');
      toolbar.querySelector('#btnDrawPen').classList.remove('active');
    });

    toolbar.querySelectorAll('.draw-color-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        this.isEraser = false;
        this.color = dot.dataset.color;
        toolbar.querySelectorAll('.draw-color-dot').forEach(d => d.classList.remove('active'));
        dot.classList.add('active');
        toolbar.querySelector('#btnDrawPen').classList.add('active');
        toolbar.querySelector('#btnDrawEraser').classList.remove('active');
      });
    });

    toolbar.querySelectorAll('.draw-size-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.lineWidth = parseInt(btn.dataset.size) || 3;
        toolbar.querySelectorAll('.draw-size-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    toolbar.querySelector('#btnDrawClear').addEventListener('click', () => {
      if (confirm('¿Eliminar todos los dibujos de esta página?')) {
        this.clearCanvas();
        if (window.bookStorage && this.currentBookId) {
          window.bookStorage.clearDrawing(this.currentBookId, this.currentPage);
        }
      }
    });

    toolbar.querySelector('#btnDrawClose').addEventListener('click', () => {
      this.toggle(false);
    });
  }

  toggle(forceState = null) {
    this.active = forceState !== null ? forceState : !this.active;
    const toolbar = document.getElementById('drawingFloatingToolbar');
    if (toolbar) toolbar.style.display = this.active ? 'flex' : 'none';

    if (this.canvas) {
      this.canvas.style.pointerEvents = this.active ? 'auto' : 'none';
    }

    if (this.active) {
      if (window.luminaApp && window.luminaApp.showToast) {
        window.luminaApp.showToast('Modo dibujo activo (Stylus / Ratón con rechazo de palma)');
      }
    }
  }

  attachToSlot(slotEl, pageNum) {
    if (!slotEl) return;
    this.currentPage = pageNum;
    this.container = slotEl;
    if (window.luminaApp) this.currentBookId = window.luminaApp.currentBookId;

    // Check if canvas already exists in slot
    let canvas = slotEl.querySelector('.freehand-drawing-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'freehand-drawing-canvas';
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.zIndex = '15';
      canvas.style.pointerEvents = this.active ? 'auto' : 'none';
      canvas.style.touchAction = 'none';
      slotEl.appendChild(canvas);

      this._bindCanvasEvents(canvas);
    }

    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this._resizeCanvas();

    // Load saved strokes from IndexedDB
    this.loadPageStrokes(this.currentBookId, pageNum);
  }

  _resizeCanvas() {
    if (!this.canvas || !this.container) return;
    const rect = this.container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    if (this.ctx) {
      this.ctx.scale(dpr, dpr);
    }
    this.redrawAll();
  }

  _bindCanvasEvents(canvas) {
    canvas.addEventListener('pointerdown', (e) => this._onPointerDown(e));
    canvas.addEventListener('pointermove', (e) => this._onPointerMove(e));
    canvas.addEventListener('pointerup', (e) => this._onPointerUp(e));
    canvas.addEventListener('pointercancel', (e) => this._onPointerUp(e));
  }

  _onPointerDown(e) {
    if (!this.active) return;

    // Palm Rejection: If user is using a Stylus/Pen, ignore touch events from hand palm
    if (e.pointerType === 'pen') {
      this.hasStylus = true;
    } else if (e.pointerType === 'touch' && this.hasStylus) {
      // Ignored palm resting on screen
      e.preventDefault();
      return;
    }

    this.isDrawing = true;
    this.canvas.setPointerCapture(e.pointerId);

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;

    this.currentPath = [{ x, y, p: pressure }];

    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = this.isEraser ? '#ffffff' : this.color;
    this.ctx.lineWidth = this.isEraser ? this.lineWidth * 4 : this.lineWidth;
    if (this.isEraser) {
      this.ctx.globalCompositeOperation = 'destination-out';
    } else {
      this.ctx.globalCompositeOperation = 'source-over';
    }
  }

  _onPointerMove(e) {
    if (!this.isDrawing) return;
    if (e.pointerType === 'touch' && this.hasStylus) {
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pressure = e.pressure && e.pressure > 0 ? e.pressure : 0.5;

    this.currentPath.push({ x, y, p: pressure });

    this.ctx.lineTo(x, y);
    this.ctx.stroke();
  }

  _onPointerUp(e) {
    if (!this.isDrawing) return;
    this.isDrawing = false;

    if (this.currentPath.length > 0) {
      this.strokes.push({
        color: this.color,
        width: this.lineWidth,
        isEraser: this.isEraser,
        points: this.currentPath
      });
      this.savePageStrokes();
    }

    this.currentPath = [];
  }

  savePageStrokes() {
    if (window.bookStorage && this.currentBookId) {
      window.bookStorage.saveDrawing(this.currentBookId, this.currentPage, this.strokes);
    }
  }

  async loadPageStrokes(bookId, pageNum) {
    this.clearCanvas();
    if (!window.bookStorage || !bookId) return;

    const savedStrokes = await window.bookStorage.getDrawing(bookId, pageNum);
    if (savedStrokes && Array.isArray(savedStrokes)) {
      this.strokes = savedStrokes;
      this.redrawAll();
    } else {
      this.strokes = [];
    }
  }

  clearCanvas() {
    this.strokes = [];
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  redrawAll() {
    if (!this.ctx || !this.canvas) return;
    const dpr = window.devicePixelRatio || 1;
    this.ctx.clearRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);

    this.strokes.forEach(stroke => {
      if (!stroke.points || stroke.points.length === 0) return;

      this.ctx.beginPath();
      this.ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.strokeStyle = stroke.color;
      this.ctx.lineWidth = stroke.isEraser ? stroke.width * 4 : stroke.width;
      this.ctx.globalCompositeOperation = stroke.isEraser ? 'destination-out' : 'source-over';

      for (let i = 1; i < stroke.points.length; i++) {
        this.ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      this.ctx.stroke();
    });

    this.ctx.globalCompositeOperation = 'source-over';
  }
}

window.drawingController = new DrawingController();
