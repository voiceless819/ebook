/**
 * LuminaBook - PDF Processing Engine
 * High-definition rasterization, structured text extraction, TOC outline & metadata parsing.
 */

class PDFEngine {
  constructor() {
    this.pdfDoc = null;
    this.numPages = 0;
    this.metadata = {
      title: 'Documento sin título',
      author: 'Autor Desconocido',
      subject: '',
      creator: '',
      keywords: ''
    };
    this.outline = [];
    this.pageCache = new Map(); // pageNum -> { canvas, text, width, height }
    this.pageTexts = new Map(); // pageNum -> extracted text string
    this.structuredPages = []; // array of { pageNum, title, paragraphs: [] }
    this.renderScale = Math.min(2.0, window.devicePixelRatio || 1.5); // High DPI crisp rendering
    this.isLoaded = false;

    // Configure PDF.js worker (supports root and GitHub Pages subdirectory URLs)
    if (window.pdfjsLib) {
      try {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('vendor/pdf.worker.min.js', window.location.href).href;
      } catch (e) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = './vendor/pdf.worker.min.js';
      }
    }
  }

  /**
   * Load PDF from ArrayBuffer or File
   */
  async loadDocument(dataOrFile, onProgress) {
    if (!window.pdfjsLib) {
      throw new Error('PDF.js library is not available');
    }

    this.reset();
    let arrayBuffer;

    if (dataOrFile instanceof File || dataOrFile instanceof Blob) {
      this.metadata.title = dataOrFile.name.replace(/\.[^/.]+$/, "");
      arrayBuffer = await dataOrFile.arrayBuffer();
    } else if (dataOrFile instanceof ArrayBuffer) {
      arrayBuffer = dataOrFile;
    } else {
      throw new Error('Formato de datos no soportado');
    }

    const loadingTask = window.pdfjsLib.getDocument({
      data: arrayBuffer,
      cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
      cMapPacked: true,
    });

    if (onProgress) {
      loadingTask.onProgress = (p) => {
        if (p.total > 0) {
          onProgress(Math.round((p.loaded / p.total) * 100));
        }
      };
    }

    this.pdfDoc = await loadingTask.promise;
    this.numPages = this.pdfDoc.numPages;

    // Extract metadata & outline
    await this._extractMetadata();
    await this._extractOutline();

    this.isLoaded = true;
    return {
      numPages: this.numPages,
      metadata: this.metadata,
      outline: this.outline
    };
  }

  reset() {
    this.pdfDoc = null;
    this.numPages = 0;
    this.pageCache.clear();
    this.pageTexts.clear();
    this.structuredPages = [];
    this.outline = [];
    this.isLoaded = false;
  }

  async _extractMetadata() {
    try {
      const data = await this.pdfDoc.getMetadata();
      if (data && data.info) {
        if (data.info.Title && data.info.Title.trim()) {
          this.metadata.title = data.info.Title.trim();
        }
        if (data.info.Author && data.info.Author.trim()) {
          this.metadata.author = data.info.Author.trim();
        }
        if (data.info.Subject) this.metadata.subject = data.info.Subject;
        if (data.info.Creator) this.metadata.creator = data.info.Creator;
      }
    } catch (e) {
      console.warn('Metadata extraction skipped:', e);
    }
  }

  async _extractOutline() {
    try {
      const outline = await this.pdfDoc.getOutline();
      if (outline && outline.length > 0) {
        this.outline = await this._processOutlineItems(outline);
      } else {
        // Fallback: create basic chapter outline from page intervals
        this.outline = this._generateDefaultOutline();
      }
    } catch (e) {
      this.outline = this._generateDefaultOutline();
    }
  }

  async _processOutlineItems(items) {
    const result = [];
    for (const item of items) {
      let pageNum = 1;
      if (item.dest) {
        let dest = item.dest;
        if (typeof dest === 'string') {
          dest = await this.pdfDoc.getDestination(dest);
        }
        if (Array.isArray(dest)) {
          const pageRef = dest[0];
          pageNum = (await this.pdfDoc.getPageIndex(pageRef)) + 1;
        }
      }
      const entry = {
        title: item.title,
        page: pageNum,
        items: item.items && item.items.length > 0 ? await this._processOutlineItems(item.items) : []
      };
      result.push(entry);
    }
    return result;
  }

  _generateDefaultOutline() {
    const list = [];
    const step = Math.max(1, Math.floor(this.numPages / 10));
    for (let p = 1; p <= this.numPages; p += step) {
      list.push({
        title: p === 1 ? 'Portada / Inicio' : `Página ${p}`,
        page: p,
        items: []
      });
    }
    return list;
  }

  /**
   * Render a specific page to an HTML Canvas
   */
  async renderPage(pageNum, customScale = null) {
    if (!this.pdfDoc || pageNum < 1 || pageNum > this.numPages) return null;

    const cacheKey = `${pageNum}_${customScale || this.renderScale}`;
    if (this.pageCache.has(cacheKey)) {
      return this.pageCache.get(cacheKey);
    }

    const page = await this.pdfDoc.getPage(pageNum);
    const scale = customScale || this.renderScale;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: false });
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Fill white background before rendering
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const renderContext = {
      canvasContext: ctx,
      viewport: viewport,
      intent: 'display'
    };

    await page.render(renderContext).promise;

    // Also extract text asynchronously if not yet cached
    if (!this.pageTexts.has(pageNum)) {
      this.extractPageText(pageNum).catch(console.warn);
    }

    const result = {
      pageNum,
      canvas,
      width: viewport.width,
      height: viewport.height,
      aspectRatio: viewport.width / viewport.height
    };

    // Cache management (keep up to 30 recent pages to preserve memory)
    if (this.pageCache.size > 30) {
      const firstKey = this.pageCache.keys().next().value;
      this.pageCache.delete(firstKey);
    }
    this.pageCache.set(cacheKey, result);

    return result;
  }

  /**
   * Extract clean, structured text for a page
   */
  async extractPageText(pageNum) {
    if (!this.pdfDoc || pageNum < 1 || pageNum > this.numPages) return '';
    if (this.pageTexts.has(pageNum)) return this.pageTexts.get(pageNum);

    try {
      const page = await this.pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const items = textContent.items;

      if (!items || items.length === 0) {
        this.pageTexts.set(pageNum, '');
        return '';
      }

      // Group items into lines and paragraphs by Y position
      let lines = [];
      let currentLine = [];
      let lastY = null;
      let lastFontSize = 0;

      for (const item of items) {
        if (!item.str) continue;
        const y = Math.round(item.transform[5]);
        const fontSize = Math.round(Math.hypot(item.transform[0], item.transform[1]));

        if (lastY === null || Math.abs(y - lastY) > 4) {
          if (currentLine.length > 0) {
            lines.push({
              text: currentLine.map(i => i.str).join(' ').trim(),
              fontSize: lastFontSize,
              y: lastY
            });
          }
          currentLine = [item];
          lastY = y;
          lastFontSize = fontSize;
        } else {
          currentLine.push(item);
        }
      }

      if (currentLine.length > 0) {
        lines.push({
          text: currentLine.map(i => i.str).join(' ').trim(),
          fontSize: lastFontSize,
          y: lastY
        });
      }

      // Format lines into readable paragraphs
      let paragraphs = [];
      let currentPara = [];
      for (const line of lines) {
        if (!line.text) continue;
        // If line is significantly bigger font, treat as heading
        if (line.fontSize > 16) {
          if (currentPara.length > 0) {
            paragraphs.push(currentPara.join(' '));
            currentPara = [];
          }
          paragraphs.push(`## ${line.text}`);
        } else {
          currentPara.push(line.text);
          if (line.text.endsWith('.') || line.text.endsWith(':')) {
            paragraphs.push(currentPara.join(' '));
            currentPara = [];
          }
        }
      }
      if (currentPara.length > 0) {
        paragraphs.push(currentPara.join(' '));
      }

      const fullText = paragraphs.join('\n\n').trim();
      this.pageTexts.set(pageNum, fullText);
      return fullText;
    } catch (e) {
      console.warn(`Error extracting text for page ${pageNum}:`, e);
      return '';
    }
  }

  /**
   * Pre-extract all pages text for full-text search and EPUB export
   */
  async extractAllText(onProgress) {
    const all = [];
    for (let p = 1; p <= this.numPages; p++) {
      const text = await this.extractPageText(p);
      all.push({ pageNum: p, text });
      if (onProgress) {
        onProgress(p, this.numPages);
      }
    }
    return all;
  }

  /**
   * Get High Quality Data URL image of a page (e.g. for cover or standalone export)
   */
  async getPageDataUrl(pageNum, format = 'image/jpeg', quality = 0.88) {
    const rendered = await this.renderPage(pageNum);
    if (!rendered || !rendered.canvas) return null;
    return rendered.canvas.toDataURL(format, quality);
  }
}

// Global instance
window.pdfEngine = new PDFEngine();
