/**
 * Ebook4u - EPUB & Document Cover Generator
 * 4 clean, serious and sober templates for documents without cover art.
 * Generates high-res cover canvases, saves to catalog & attaches to EPUB exports.
 */

class CoverGenerator {
  constructor() {
    this.templates = [
      { id: 'minimalist', name: 'Minimalista Neutro', bg: '#1a1b1f', text: '#ffffff', accent: '#d4af37' },
      { id: 'classic', name: 'Clásico Editorial', bg: '#242b2e', text: '#f5f0e6', accent: '#c29d59' },
      { id: 'technical', name: 'Técnico Cuadrícula', bg: '#0f172a', text: '#38bdf8', accent: '#0284c7' },
      { id: 'monolith', name: 'Monolito Gráfico', bg: '#111827', text: '#f3f4f6', accent: '#6366f1' }
    ];
  }

  openModal(defaultTitle = '', defaultAuthor = '', onSave = null) {
    let modal = document.getElementById('coverGeneratorModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'coverGeneratorModal';
      modal.className = 'cover-generator-modal';
      modal.innerHTML = `
        <div class="cover-gen-box">
          <div class="cover-gen-header">
            <div style="display:flex; align-items:center; gap:8px;">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              <h3>Generador de Portada Sobria</h3>
            </div>
            <button class="action-btn icon-only" id="btnCloseCoverGen" title="Cerrar">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div class="cover-gen-body">
            <!-- Left: Live Preview Canvas -->
            <div class="cover-preview-slot">
              <canvas id="coverGenCanvas" width="600" height="900"></canvas>
            </div>

            <!-- Right: Controls & Templates -->
            <div class="cover-gen-controls">
              <div class="input-field-group">
                <label>Título de la obra</label>
                <input type="text" id="coverGenTitleInput" placeholder="Título...">
              </div>
              <div class="input-field-group">
                <label>Autor o Institución</label>
                <input type="text" id="coverGenAuthorInput" placeholder="Autor...">
              </div>

              <label style="font-size:0.82rem; font-weight:600; color:var(--hud-subtext); margin-top:10px;">Plantilla de Diseño</label>
              <div class="cover-template-grid" id="coverTemplateGrid"></div>

              <div class="cover-gen-actions" style="margin-top:20px; display:flex; gap:10px;">
                <button class="action-btn primary-action" id="btnApplyCover" style="flex:1; justify-content:center;">Guardar y Aplicar</button>
                <button class="action-btn" id="btnDownloadCoverPng">Descargar PNG</button>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelector('#btnCloseCoverGen').addEventListener('click', () => modal.classList.remove('open'));
    }

    const titleInput = modal.querySelector('#coverGenTitleInput');
    const authorInput = modal.querySelector('#coverGenAuthorInput');
    titleInput.value = defaultTitle || (window.ebookApp ? window.ebookApp.currentDoc?.title : '') || 'Documento sin título';
    authorInput.value = defaultAuthor || (window.ebookApp ? window.ebookApp.currentDoc?.author : '') || 'Autor Desconocido';

    this.selectedTemplateId = 'minimalist';
    this.renderTemplateSelector();
    this.drawCover();

    titleInput.oninput = () => this.drawCover();
    authorInput.oninput = () => this.drawCover();

    modal.querySelector('#btnApplyCover').onclick = () => {
      const canvas = modal.querySelector('#coverGenCanvas');
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

      if (window.ebookApp && window.ebookApp.currentBookId && window.bookStorage) {
        window.bookStorage.updateMetadata(window.ebookApp.currentBookId, {
          title: titleInput.value,
          author: authorInput.value,
          coverThumbnail: dataUrl
        }).then(() => {
          if (window.ebookApp.refreshCatalogList) window.ebookApp.refreshCatalogList();
          window.ebookApp.showToast('Portada actualizada con éxito');
        });
      }

      if (onSave) onSave(dataUrl);
      modal.classList.remove('open');
    };

    modal.querySelector('#btnDownloadCoverPng').onclick = () => {
      const canvas = modal.querySelector('#coverGenCanvas');
      const link = document.createElement('a');
      link.download = `portada-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };

    modal.classList.add('open');
  }

  renderTemplateSelector() {
    const grid = document.getElementById('coverTemplateGrid');
    if (!grid) return;
    grid.innerHTML = '';

    this.templates.forEach(t => {
      const card = document.createElement('div');
      card.className = `cover-template-item ${t.id === this.selectedTemplateId ? 'active' : ''}`;
      card.innerHTML = `
        <div class="template-color-preview" style="background:${t.bg}; border-top: 3px solid ${t.accent};"></div>
        <span class="template-name">${t.name}</span>
      `;
      card.addEventListener('click', () => {
        this.selectedTemplateId = t.id;
        grid.querySelectorAll('.cover-template-item').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this.drawCover();
      });
      grid.appendChild(card);
    });
  }

  drawCover() {
    const canvas = document.getElementById('coverGenCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tpl = this.templates.find(t => t.id === this.selectedTemplateId) || this.templates[0];
    const title = (document.getElementById('coverGenTitleInput')?.value || 'Título de la obra').trim();
    const author = (document.getElementById('coverGenAuthorInput')?.value || 'Autor').trim();

    const w = 600;
    const h = 900;

    // Background
    ctx.fillStyle = tpl.bg;
    ctx.fillRect(0, 0, w, h);

    if (tpl.id === 'minimalist') {
      // Golden Minimalist Accent Line
      ctx.strokeStyle = tpl.accent;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(80, 140);
      ctx.lineTo(160, 140);
      ctx.stroke();

      // Title
      ctx.fillStyle = tpl.text;
      ctx.font = '600 38px system-ui, -apple-system, sans-serif';
      this._wrapText(ctx, title, 80, 240, 440, 48);

      // Author
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.font = '400 20px system-ui, -apple-system, sans-serif';
      ctx.fillText(author.toUpperCase(), 80, 780);

      // Discrete corner framing
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.strokeRect(40, 40, w - 80, h - 80);
    } else if (tpl.id === 'classic') {
      // Classic Serif Border
      ctx.strokeStyle = tpl.accent;
      ctx.lineWidth = 2;
      ctx.strokeRect(50, 50, w - 100, h - 100);
      ctx.strokeRect(58, 58, w - 116, h - 116);

      // Title in Serif
      ctx.fillStyle = tpl.text;
      ctx.font = 'bold 36px "Georgia", "Times New Roman", serif';
      ctx.textAlign = 'center';
      this._wrapText(ctx, title, w / 2, 340, 420, 50);

      // Divider flourish
      ctx.fillStyle = tpl.accent;
      ctx.fillRect(w / 2 - 40, 470, 80, 2);

      // Author
      ctx.fillStyle = tpl.accent;
      ctx.font = 'italic 22px "Georgia", "Times New Roman", serif';
      ctx.fillText(author, w / 2, 530);
      ctx.textAlign = 'left';
    } else if (tpl.id === 'technical') {
      // Technical Grid background
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 30; x < w; x += 30) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 30; y < h; y += 30) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      ctx.fillStyle = tpl.accent;
      ctx.font = '600 13px monospace';
      ctx.fillText('[ DOC // TECHNICAL SPECIFICATION ]', 60, 100);

      ctx.fillStyle = tpl.text;
      ctx.font = 'bold 36px monospace';
      this._wrapText(ctx, title, 60, 220, 460, 44);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px monospace';
      ctx.fillText(`AUTHOR: ${author}`, 60, 780);
      ctx.fillText(`BUILD: ${new Date().toISOString().slice(0, 10)}`, 60, 810);
    } else {
      // Monolith
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#1e1b4b');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Bold geometric block
      ctx.fillStyle = tpl.accent;
      ctx.fillRect(60, 80, 40, 8);

      ctx.fillStyle = '#ffffff';
      ctx.font = '800 42px system-ui, sans-serif';
      this._wrapText(ctx, title, 60, 260, 460, 50);

      ctx.fillStyle = '#a5b4fc';
      ctx.font = '500 22px system-ui, sans-serif';
      ctx.fillText(author, 60, 780);
    }
  }

  _wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let curY = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line.trim(), x, curY);
        line = words[n] + ' ';
        curY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), x, curY);
  }
}

window.coverGenerator = new CoverGenerator();
