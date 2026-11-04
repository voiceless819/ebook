/**
 * LuminaBook - PDF Processing Engine
 * Robust lazy rasterization, structured text extraction, TOC outline & metadata parsing.
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
    this.pageCache = new Map(); // pageNum -> { canvas, width, height, aspectRatio }
    this.pageTexts = new Map(); // pageNum -> extracted text string
    this.structuredPages = [];
    this.renderScale = Math.min(1.8, window.devicePixelRatio || 1.5);
    this.isLoaded = false;

    // Configure PDF.js worker
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
      throw new Error('PDF.js no está disponible en la página');
    }

    this.reset();
    let rawBuffer;

    if (dataOrFile instanceof File || dataOrFile instanceof Blob) {
      this.metadata.title = dataOrFile.name.replace(/\.[^/.]+$/, "");
      rawBuffer = await dataOrFile.arrayBuffer();
    } else if (dataOrFile instanceof ArrayBuffer) {
      rawBuffer = dataOrFile;
    } else if (dataOrFile && dataOrFile.buffer instanceof ArrayBuffer) {
      rawBuffer = dataOrFile.buffer;
    } else {
      throw new Error('Formato de datos no soportado');
    }

    // Always create an isolated copy for PDF.js so original rawBuffer is NEVER detached
    const pdfDataCopy = new Uint8Array(rawBuffer.slice(0));

    const loadingTask = window.pdfjsLib.getDocument({
      data: pdfDataCopy,
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

    // Extract metadata & outline safely
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
      console.warn('Extracción de metadatos omitida:', e);
    }
  }

  async _extractOutline() {
    try {
      const outline = await this.pdfDoc.getOutline();
      if (outline && outline.length > 0) {
        this.outline = await this._processOutlineItems(outline);
      } else {
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
        try {
          let dest = item.dest;
          if (typeof dest === 'string') {
            dest = await this.pdfDoc.getDestination(dest);
          }
          if (Array.isArray(dest)) {
            const pageRef = dest[0];
            pageNum = (await this.pdfDoc.getPageIndex(pageRef)) + 1;
          }
        } catch (e) {}
      }
      const entry = {
        title: item.title || `Sección ${pageNum}`,
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
        title: p === 1 ? 'Inicio / Portada' : `Página ${p}`,
        page: p,
        items: []
      });
    }
    return list;
  }

  /**
   * Render a specific page to an HTML Canvas with safe error boundaries
   */
  async renderPage(pageNum, customScale = null) {
    if (!this.pdfDoc || pageNum < 1 || pageNum > this.numPages) {
      return this._createFallbackCanvas(pageNum, 'Página fuera de rango');
    }

    const cacheKey = `${pageNum}_${customScale || this.renderScale}`;
    if (this.pageCache.has(cacheKey)) {
      return this.pageCache.get(cacheKey);
    }

    try {
      const page = await this.pdfDoc.getPage(pageNum);
      const scale = customScale || Math.min(1.8, this.renderScale);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) {
        throw new Error('No se pudo inicializar el contexto 2D del canvas');
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport,
        intent: 'display'
      };

      await page.render(renderContext).promise;

      const result = {
        pageNum,
        canvas,
        width: viewport.width,
        height: viewport.height,
        aspectRatio: viewport.width / viewport.height
      };

      // Keep cache bounded (max 10 recent pages to avoid GPU/RAM exhaustion)
      if (this.pageCache.size > 10) {
        const firstKey = this.pageCache.keys().next().value;
        this.pageCache.delete(firstKey);
      }
      this.pageCache.set(cacheKey, result);

      return result;
    } catch (e) {
      console.error(`Error al renderizar página ${pageNum}:`, e);
      return this._createFallbackCanvas(pageNum, 'Documento cargado');
    }
  }

  _createFallbackCanvas(pageNum, label = '') {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 1100;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 800, 1100);
      ctx.fillStyle = '#333333';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Página ${pageNum}`, 400, 520);
      if (label) {
        ctx.fillStyle = '#777777';
        ctx.font = '16px sans-serif';
        ctx.fillText(label, 400, 560);
      }
    }
    return {
      pageNum,
      canvas,
      width: 800,
      height: 1100,
      aspectRatio: 800 / 1100
    };
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

      let paragraphs = [];
      let currentPara = [];
      for (const line of lines) {
        if (!line.text) continue;
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
      console.warn(`Error al extraer texto en página ${pageNum}:`, e);
      return '';
    }
  }

  async getPageDataUrl(pageNum, format = 'image/jpeg', quality = 0.85) {
    const rendered = await this.renderPage(pageNum);
    if (!rendered || !rendered.canvas) return null;
    return rendered.canvas.toDataURL(format, quality);
  }
}

window.pdfEngine = new PDFEngine();
