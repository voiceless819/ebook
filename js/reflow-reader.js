/**
 * LuminaBook - Dynamic Liquid Reflow eBook Reader
 * Reflowable typography, Bionic Reading cognitive engine, customizable fonts, themes & layout.
 */

class ReflowReader {
  constructor(containerEl, options = {}) {
    this.container = containerEl;
    this.options = Object.assign({
      onPageChange: null
    }, options);

    this.pages = [];
    this.currentChapter = 1;
    this.fontSize = 18;
    this.lineHeight = 1.75;
    this.fontFamily = 'serif'; // 'serif', 'sans', 'dyslexic', 'mono'
    this.theme = 'sepia'; // 'sepia', 'ivory', 'white', 'dark', 'oled', 'eink'
    this.bionicMode = false;
    this.textAlign = 'justify';
    this.marginWidth = 'normal'; // 'compact', 'normal', 'wide'

    this.initDOM();
  }

  initDOM() {
    this.container.innerHTML = `
      <div class="reflow-viewport" id="reflowViewport">
        <div class="reflow-document" id="reflowDocument">
          <!-- Chapters rendered here -->
        </div>
      </div>
    `;
    this.viewport = this.container.querySelector('#reflowViewport');
    this.documentEl = this.container.querySelector('#reflowDocument');

    // Track scroll for reading progress
    this.viewport.addEventListener('scroll', () => this._handleScroll(), { passive: true });
  }

  setPages(pages) {
    this.pages = pages || [];
    this.render();
  }

  setFontSize(size) {
    this.fontSize = Math.max(12, Math.min(36, parseInt(size) || 18));
    this.documentEl.style.fontSize = `${this.fontSize}px`;
  }

  setLineHeight(val) {
    this.lineHeight = parseFloat(val) || 1.75;
    this.documentEl.style.lineHeight = `${this.lineHeight}`;
  }

  setFontFamily(family) {
    this.fontFamily = family;
    this.documentEl.classList.remove('font-serif', 'font-sans', 'font-dyslexic', 'font-mono');
    this.documentEl.classList.add(`font-${family}`);
  }

  setTheme(themeName) {
    this.theme = themeName;
    const themes = ['theme-sepia', 'theme-ivory', 'theme-white', 'theme-dark', 'theme-oled', 'theme-eink'];
    document.body.classList.remove(...themes);
    document.body.classList.add(`theme-${themeName}`);
  }

  setMarginWidth(width) {
    this.marginWidth = width;
    this.documentEl.classList.remove('margin-compact', 'margin-normal', 'margin-wide');
    this.documentEl.classList.add(`margin-${width}`);
  }

  setTextAlign(align) {
    this.textAlign = align;
    this.documentEl.style.textAlign = align;
  }

  setBionicReading(enabled) {
    this.bionicMode = !!enabled;
    this.render();
  }

  /**
   * Bionic Reading Engine:
   * Bolds the initial 40-50% of letters in each word for accelerated cognitive reading.
   */
  _applyBionicReading(text) {
    if (!text) return '';
    return text.split(/\s+/).map(word => {
      if (word.length <= 1) return word;
      const mid = Math.ceil(word.length * 0.45);
      const boldPart = word.substring(0, mid);
      const rest = word.substring(mid);
      return `<b class="bionic-bold">${boldPart}</b>${rest}`;
    }).join(' ');
  }

  render() {
    if (this.pages.length === 0) {
      this.documentEl.innerHTML = `<div class="reflow-empty"><p>Carga un archivo PDF o EPUB para comenzar a leer.</p></div>`;
      return;
    }

    let html = '';
    this.pages.forEach((page, idx) => {
      const pageNum = page.pageNum || (idx + 1);
      const title = page.title || `Capítulo ${pageNum}`;

      html += `<section class="reflow-chapter" id="reflow-page-${pageNum}" data-page="${pageNum}">`;
      html += `<header class="reflow-chapter-header">`;
      html += `<span class="reflow-chapter-num">SECCIÓN ${pageNum}</span>`;
      html += `<h2>${this._escapeHtml(title)}</h2>`;
      html += `</header>`;

      if (page.html) {
        // If rich HTML exists (e.g. from EPUB)
        html += `<div class="reflow-chapter-body">${page.html}</div>`;
      } else if (page.text && page.text.trim()) {
        const paragraphs = page.text.split('\n\n');
        html += `<div class="reflow-chapter-body">`;
        paragraphs.forEach(p => {
          const trimmed = p.trim();
          if (!trimmed) return;
          if (trimmed.startsWith('## ')) {
            html += `<h3>${this._escapeHtml(trimmed.replace('## ', ''))}</h3>`;
          } else if (trimmed.startsWith('# ')) {
            html += `<h2>${this._escapeHtml(trimmed.replace('# ', ''))}</h2>`;
          } else if (trimmed.startsWith('> ')) {
            const quoteContent = this.bionicMode
              ? this._applyBionicReading(trimmed.replace('> ', ''))
              : this._escapeHtml(trimmed.replace('> ', ''));
            html += `<blockquote><p>${quoteContent}</p></blockquote>`;
          } else {
            const bodyContent = this.bionicMode
              ? this._applyBionicReading(trimmed)
              : this._escapeHtml(trimmed);
            html += `<p class="reflow-p">${bodyContent}</p>`;
          }
        });
        html += `</div>`;
      } else if (page.canvas || page.imageData) {
        // Visual page fallback
        const imgSrc = page.imageData || (page.canvas ? page.canvas.toDataURL() : '');
        html += `<div class="reflow-chapter-body visual-only">
          <img src="${imgSrc}" class="reflow-embedded-img" alt="Página ${pageNum}"/>
        </div>`;
      } else {
        html += `<div class="reflow-chapter-body lazy-text-body" data-page="${pageNum}">
          <p class="reflow-p" style="color:var(--paper-subtext); font-style:italic;">Extrayendo texto de la página ${pageNum}...</p>
        </div>`;
      }

      html += `<footer class="reflow-chapter-footer"><span>— ${pageNum} —</span></footer>`;
      html += `</section>`;
    });

    this.documentEl.innerHTML = html;
    this.setFontSize(this.fontSize);
    this.setLineHeight(this.lineHeight);
    this.setFontFamily(this.fontFamily);
    this.setMarginWidth(this.marginWidth);
    this.setTextAlign(this.textAlign);

    // Asynchronously resolve text for PDF chapters
    const lazyBodies = this.documentEl.querySelectorAll('.lazy-text-body');
    lazyBodies.forEach(el => {
      const pageNum = parseInt(el.getAttribute('data-page'));
      if (window.pdfEngine && window.pdfEngine.isLoaded && pageNum) {
        window.pdfEngine.extractPageText(pageNum).then(txt => {
          if (txt && txt.trim()) {
            const paragraphs = txt.split('\n\n');
            let bodyHtml = '';
            paragraphs.forEach(p => {
              const trimmed = p.trim();
              if (!trimmed) return;
              const content = this.bionicMode ? this._applyBionicReading(trimmed) : this._escapeHtml(trimmed);
              bodyHtml += `<p class="reflow-p">${content}</p>`;
            });
            el.innerHTML = bodyHtml;
          } else {
            window.pdfEngine.renderPage(pageNum).then(rendered => {
              if (rendered && rendered.canvas) {
                el.innerHTML = `<img src="${rendered.canvas.toDataURL('image/jpeg', 0.8)}" class="reflow-embedded-img" alt="Página ${pageNum}"/>`;
              }
            });
          }
        }).catch(() => {});
      }
    });
  }

  _escapeHtml(text) {
    if (!text) return '';
    return text.replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m]));
  }

  scrollToPage(pageNum) {
    const target = this.documentEl.querySelector(`#reflow-page-${pageNum}`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      this.currentChapter = pageNum;
    }
  }

  _handleScroll() {
    const chapters = this.documentEl.querySelectorAll('.reflow-chapter');
    const scrollPos = this.viewport.scrollTop + 120;

    for (let i = chapters.length - 1; i >= 0; i--) {
      const ch = chapters[i];
      if (ch.offsetTop <= scrollPos) {
        const pageNum = parseInt(ch.getAttribute('data-page')) || (i + 1);
        if (pageNum !== this.currentChapter) {
          this.currentChapter = pageNum;
          if (this.options.onPageChange) {
            this.options.onPageChange(this.currentChapter, this.pages.length);
          }
        }
        break;
      }
    }
  }
}

window.ReflowReader = ReflowReader;
