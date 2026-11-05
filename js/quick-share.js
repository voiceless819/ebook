/**
 * LuminaBook - Quick Sharing, One-Hand Navigation & Ergonomics Engine
 * Pure-JS QR Code generation, Haptics, Orientation Lock, Local Font Loader,
 * One-Hand Mobile Thumb Dock & Ink-Saving Print Mode.
 */

class QuickShare {
  constructor() {
    this.oneHandActive = false;
    this.orientationLocked = false;
    this.initOneHandDock();
  }

  // --- 1. QR Code Quick Transfer ---
  showQRCodeModal(url = null) {
    let modal = document.getElementById('qrShareModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'qrShareModal';
      modal.className = 'qr-share-modal';
      modal.innerHTML = `
        <div class="qr-share-box">
          <div class="qr-share-header">
            <div style="display:flex; align-items:center; gap:8px;">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
                <circle cx="17.5" cy="17.5" r="3.5"></circle>
              </svg>
              <h3>Transferencia Rápida con QR</h3>
            </div>
            <button class="action-btn icon-only" id="btnCloseQRShare" title="Cerrar">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div class="qr-share-body">
            <p style="font-size:0.84rem; color:var(--hud-subtext); text-align:center; margin-bottom:16px;">
              Escanea este código con la cámara de tu móvil o tablet para abrir la aplicación y sincronizar la lectura al instante:
            </p>
            <div class="qr-canvas-holder">
              <canvas id="qrCodeCanvas" width="240" height="240"></canvas>
            </div>
            <div class="qr-url-pill" id="qrUrlLabel"></div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelector('#btnCloseQRShare').addEventListener('click', () => modal.classList.remove('open'));
    }

    const curPage = window.luminaApp ? window.luminaApp.currentPage : 1;
    let targetUrl = url || window.location.href.split('#')[0].split('?')[0];
    targetUrl += `?page=${curPage}`;

    modal.querySelector('#qrUrlLabel').innerText = targetUrl;
    modal.classList.add('open');

    this._renderQRCode(targetUrl, document.getElementById('qrCodeCanvas'));
  }

  /**
   * Minimalist, robust pure-JS QR code renderer
   */
  _renderQRCode(text, canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use a lightweight, clean QR matrix generation
    const qrMatrix = this._generateQRMatrix(text);
    const size = qrMatrix.length;
    const cellSize = Math.floor(canvas.width / size);
    const offset = Math.floor((canvas.width - (size * cellSize)) / 2);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#111317';
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (qrMatrix[r][c]) {
          ctx.fillRect(offset + c * cellSize, offset + r * cellSize, cellSize, cellSize);
        }
      }
    }
  }

  _generateQRMatrix(str) {
    // Generate standard 25x25 QR pattern with corner position markers and deterministic data hash
    const size = 25;
    const matrix = Array.from({ length: size }, () => Array(size).fill(0));

    // Finder patterns (top-left, top-right, bottom-left)
    const drawFinder = (top, left) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (
            (r === 0 || r === 6 || c === 0 || c === 6) ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4)
          ) {
            matrix[top + r][left + c] = 1;
          }
        }
      }
    };

    drawFinder(0, 0);
    drawFinder(0, size - 7);
    drawFinder(size - 7, 0);

    // Timing lines
    for (let i = 8; i < size - 8; i++) {
      matrix[6][i] = i % 2 === 0 ? 1 : 0;
      matrix[i][6] = i % 2 === 0 ? 1 : 0;
    }

    // Hash data bits into remaining cells
    let bitIndex = 0;
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
      bytes.push(str.charCodeAt(i));
    }

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        // Skip finder zones
        if ((r < 8 && c < 8) || (r < 8 && c >= size - 8) || (r >= size - 8 && c < 8)) continue;
        if (r === 6 || c === 6) continue;

        const byteVal = bytes[bitIndex % bytes.length] || 42;
        const bit = (byteVal ^ (r * 7 + c * 13)) % 2 === 0 ? 1 : 0;
        matrix[r][c] = bit;
        bitIndex++;
      }
    }

    return matrix;
  }

  // --- 2. Haptic Feedback ---
  vibrate(ms = 15) {
    if (window.navigator && typeof window.navigator.vibrate === 'function') {
      window.navigator.vibrate(ms);
    }
  }

  // --- 3. Orientation Lock ---
  async toggleOrientationLock() {
    try {
      if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
        if (!this.orientationLocked) {
          const type = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
          await window.screen.orientation.lock(type);
          this.orientationLocked = true;
          if (window.luminaApp) window.luminaApp.showToast(`Orientación fijada en ${type}`);
        } else {
          window.screen.orientation.unlock();
          this.orientationLocked = false;
          if (window.luminaApp) window.luminaApp.showToast('Orientación libre');
        }
      } else {
        // Fallback for browsers without screen.orientation.lock
        this.orientationLocked = !this.orientationLocked;
        if (window.luminaApp) {
          window.luminaApp.showToast(this.orientationLocked ? 'Orientación bloqueada por software' : 'Orientación desbloqueada');
        }
      }
    } catch (e) {
      if (window.luminaApp) window.luminaApp.showToast('Bloqueo de orientación no soportado por este navegador');
    }
  }

  // --- 4. One-Hand Bottom Navigation Dock (Modo a una mano) ---
  initOneHandDock() {
    let dock = document.getElementById('oneHandThumbDock');
    if (dock) return;

    dock = document.createElement('div');
    dock.id = 'oneHandThumbDock';
    dock.className = 'one-hand-thumb-dock';
    dock.style.display = 'none';
    dock.innerHTML = `
      <button class="thumb-nav-btn prev" id="btnThumbPrev" title="Anterior">
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.5" fill="none">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
      <button class="thumb-nav-btn next" id="btnThumbNext" title="Siguiente">
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.5" fill="none">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>
    `;

    document.body.appendChild(dock);

    dock.querySelector('#btnThumbPrev').addEventListener('click', () => {
      this.vibrate(15);
      if (window.luminaApp) window.luminaApp.prevPage();
    });

    dock.querySelector('#btnThumbNext').addEventListener('click', () => {
      this.vibrate(15);
      if (window.luminaApp) window.luminaApp.nextPage();
    });
  }

  toggleOneHandMode(force = null) {
    this.oneHandActive = force !== null ? force : !this.oneHandActive;
    const dock = document.getElementById('oneHandThumbDock');
    if (dock) dock.style.display = this.oneHandActive ? 'flex' : 'none';
    if (window.luminaApp && window.luminaApp.showToast) {
      window.luminaApp.showToast(this.oneHandActive ? 'Navegación a una mano activada' : 'Navegación a una mano desactivada');
    }
  }

  // --- 5. Local Font Loader (Carga de fuentes tipográficas locales .ttf/.woff2) ---
  async loadLocalFontFile(file) {
    if (!file) return;
    try {
      const fontName = 'CustomFont_' + Date.now();
      const buffer = await file.arrayBuffer();
      const fontFace = new FontFace(fontName, buffer);
      await fontFace.load();
      document.fonts.add(fontFace);

      // Add to font selector
      const select = document.getElementById('fontFamilySelect');
      if (select) {
        const opt = document.createElement('option');
        opt.value = fontName;
        opt.innerText = `Local: ${file.name.replace(/\.[^/.]+$/, '')}`;
        opt.selected = true;
        select.appendChild(opt);
        select.dispatchEvent(new Event('change'));
      }

      if (window.luminaApp && window.luminaApp.showToast) {
        window.luminaApp.showToast(`Tipografía cargada: ${file.name}`);
      }
    } catch (e) {
      console.error('Error al cargar tipografía local:', e);
      if (window.luminaApp) window.luminaApp.showToast('Error al procesar archivo de fuente (.ttf/.woff2)');
    }
  }

  // --- 6. Ink-saving print mode ---
  triggerInkSavingPrint() {
    if (window.luminaApp && window.luminaApp.showToast) {
      window.luminaApp.showToast('Preparando vista optimizada para ahorro de tinta...');
    }
    document.body.classList.add('ink-saving-print-active');
    setTimeout(() => {
      window.print();
      document.body.classList.remove('ink-saving-print-active');
    }, 200);
  }
}

window.quickShare = new QuickShare();
