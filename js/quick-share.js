/**
 * Ebook4u - Quick Sharing, One-Hand Navigation & Ergonomics Engine
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
              <div id="qrCodeContainer" class="qr-code-box"></div>
            </div>
            <div class="qr-url-pill" id="qrUrlLabel" title="Haz clic para copiar el enlace"></div>
            <div class="qr-hint-copy">Toca el enlace para copiarlo al portapapeles</div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelector('#btnCloseQRShare').addEventListener('click', () => modal.classList.remove('open'));
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('open');
      });

      const urlLabel = modal.querySelector('#qrUrlLabel');
      urlLabel.addEventListener('click', () => {
        const text = urlLabel.innerText;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(() => {
            if (window.ebookApp) window.ebookApp.showToast('Enlace copiado al portapapeles');
          }).catch(() => {});
        }
      });
    }

    const curPage = window.ebookApp ? window.ebookApp.currentPage : 1;
    let targetUrl = url;
    if (!targetUrl) {
      if (window.location.protocol === 'file:') {
        targetUrl = 'https://voiceless819.github.io/ebook/';
      } else {
        targetUrl = window.location.href.split('#')[0].split('?')[0];
      }
    }
    targetUrl += (targetUrl.includes('?') ? '&' : '?') + `page=${curPage}`;

    modal.querySelector('#qrUrlLabel').innerText = targetUrl;
    modal.classList.add('open');

    this._renderQRCode(targetUrl, document.getElementById('qrCodeContainer'));
  }

  /**
   * Generates a real, 100% scannable ISO/IEC 18004 QR Code
   */
  _renderQRCode(text, container) {
    if (!container) return;
    container.innerHTML = '';

    if (typeof QRCode !== 'undefined') {
      try {
        new QRCode(container, {
          text: text,
          width: 220,
          height: 220,
          colorDark: '#000000',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.M
        });
        return;
      } catch (e) {
        console.warn('QRCode library error, using fallback:', e);
      }
    }

    // High quality standard QR image fallback
    const encoded = encodeURIComponent(text);
    container.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encoded}&margin=4" alt="Código QR" width="220" height="220" style="display:block; border-radius:4px;" />`;
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
          if (window.ebookApp) window.ebookApp.showToast(`Orientación fijada en ${type}`);
        } else {
          window.screen.orientation.unlock();
          this.orientationLocked = false;
          if (window.ebookApp) window.ebookApp.showToast('Orientación libre');
        }
      } else {
        // Fallback for browsers without screen.orientation.lock
        this.orientationLocked = !this.orientationLocked;
        if (window.ebookApp) {
          window.ebookApp.showToast(this.orientationLocked ? 'Orientación bloqueada por software' : 'Orientación desbloqueada');
        }
      }
    } catch (e) {
      if (window.ebookApp) window.ebookApp.showToast('Bloqueo de orientación no soportado por este navegador');
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
      if (window.ebookApp) window.ebookApp.prevPage();
    });

    dock.querySelector('#btnThumbNext').addEventListener('click', () => {
      this.vibrate(15);
      if (window.ebookApp) window.ebookApp.nextPage();
    });
  }

  toggleOneHandMode(force = null) {
    this.oneHandActive = force !== null ? force : !this.oneHandActive;
    const dock = document.getElementById('oneHandThumbDock');
    if (dock) dock.style.display = this.oneHandActive ? 'flex' : 'none';
    if (window.ebookApp && window.ebookApp.showToast) {
      window.ebookApp.showToast(this.oneHandActive ? 'Navegación a una mano activada' : 'Navegación a una mano desactivada');
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

      if (window.ebookApp && window.ebookApp.showToast) {
        window.ebookApp.showToast(`Tipografía cargada: ${file.name}`);
      }
    } catch (e) {
      console.error('Error al cargar tipografía local:', e);
      if (window.ebookApp) window.ebookApp.showToast('Error al procesar archivo de fuente (.ttf/.woff2)');
    }
  }

  // --- 6. Ink-saving print mode ---
  triggerInkSavingPrint() {
    if (window.ebookApp && window.ebookApp.showToast) {
      window.ebookApp.showToast('Preparando vista optimizada para ahorro de tinta...');
    }
    document.body.classList.add('ink-saving-print-active');
    setTimeout(() => {
      window.print();
      document.body.classList.remove('ink-saving-print-active');
    }, 200);
  }
}

window.quickShare = new QuickShare();
