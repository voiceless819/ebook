/**
 * LuminaBook - Universal Exporter Suite
 * Exports books to Standalone Self-Contained HTML Flipbook, Markdown, Plain Text, Annotations & Image Zip.
 */

class UniversalExporter {
  /**
   * Helper to trigger browser file download
   */
  downloadFile(blobOrString, filename, mimeType = 'text/plain;charset=utf-8') {
    let blob;
    if (blobOrString instanceof Blob) {
      blob = blobOrString;
    } else {
      blob = new Blob([blobOrString], { type: mimeType });
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 500);
  }

  /**
   * Export to Markdown (.md)
   */
  exportToMarkdown(title, author, pages) {
    let md = `# ${title || 'Libro Digital'}\n`;
    if (author) md += `**Autor:** ${author}\n`;
    md += `**Exportado desde LuminaBook:** ${new Date().toLocaleDateString()}\n\n---\n\n`;

    pages.forEach((page, index) => {
      const pageNum = page.pageNum || (index + 1);
      md += `\n\n## Página / Capítulo ${pageNum}\n\n`;
      if (page.text && page.text.trim()) {
        md += page.text + '\n\n';
      } else {
        md += `*[Contenido visual]*\n\n`;
      }
      md += `---\n`;
    });

    const filename = `${(title || 'libro').replace(/[\\/:*?"<>|]/g, '_')}.md`;
    this.downloadFile(md, filename, 'text/markdown;charset=utf-8');
  }

  /**
   * Export to Plain Text (.txt)
   */
  exportToText(title, author, pages) {
    let txt = `========================================\n`;
    txt += `${title || 'LIBRO DIGITAL'}\n`;
    if (author) txt += `Autor: ${author}\n`;
    txt += `Fecha: ${new Date().toLocaleDateString()}\n`;
    txt += `========================================\n\n`;

    pages.forEach((page, index) => {
      const pageNum = page.pageNum || (index + 1);
      txt += `\n--- PÁGINA ${pageNum} ---\n\n`;
      txt += (page.text || '') + '\n';
    });

    const filename = `${(title || 'libro').replace(/[\\/:*?"<>|]/g, '_')}.txt`;
    this.downloadFile(txt, filename, 'text/plain;charset=utf-8');
  }

  /**
   * Export Annotations, Highlights and Bookmarks (.md or .json)
   */
  exportAnnotations(title, annotationsData, format = 'md') {
    const filename = `Notas_${(title || 'libro').replace(/[\\/:*?"<>|]/g, '_')}.${format}`;
    if (format === 'json') {
      const jsonStr = JSON.stringify(annotationsData, null, 2);
      this.downloadFile(jsonStr, filename, 'application/json');
    } else {
      let md = `# Notas y Anotaciones: ${title || 'Libro'}\n\n`;
      md += `**Fecha de exportación:** ${new Date().toLocaleString()}\n`;
      md += `**Marcadores guardados:** ${annotationsData.bookmarks?.length || 0}\n`;
      md += `**Citas destacadas:** ${annotationsData.highlights?.length || 0}\n\n---\n\n`;

      if (annotationsData.bookmarks && annotationsData.bookmarks.length > 0) {
        md += `### Marcadores\n`;
        annotationsData.bookmarks.forEach(bm => {
          md += `- **Página ${bm.page}:** ${bm.title || 'Marcador'} (${bm.date || ''})\n`;
        });
        md += `\n`;
      }

      if (annotationsData.highlights && annotationsData.highlights.length > 0) {
        md += `### Citas y Subrayados\n`;
        annotationsData.highlights.forEach(h => {
          md += `> "${h.text}"\n`;
          md += `*— Página ${h.page} [${h.color || 'amarillo'}]*\n\n`;
        });
      }

      if (annotationsData.notes && annotationsData.notes.length > 0) {
        md += `### Notas Personales\n`;
        annotationsData.notes.forEach(n => {
          md += `#### Página ${n.page} (${n.date || ''})\n`;
          md += `${n.content}\n\n`;
        });
      }

      this.downloadFile(md, filename, 'text/markdown;charset=utf-8');
    }
  }

  /**
   * Export Specific Page Range (Extract) to Markdown, Plain Text or EPUB
   */
  exportPageRange(title, author, pages, format = 'md', startPage = 1, endPage = 1) {
    const s = Math.max(1, Math.min(pages.length, parseInt(startPage) || 1));
    const e = Math.max(s, Math.min(pages.length, parseInt(endPage) || s));
    const sliced = pages.slice(s - 1, e);
    const extractTitle = `${title || 'Libro'} (Páginas ${s}-${e})`;

    if (format === 'txt') {
      this.exportToText(extractTitle, author, sliced);
    } else if (format === 'epub' && window.epubEngine) {
      window.epubEngine.generateEPUB({
        title: extractTitle,
        author: author || 'Autor',
        pages: sliced
      });
    } else {
      this.exportToMarkdown(extractTitle, author, sliced);
    }
  }

  /**
   * Export Academic Citations (APA, MLA, Chicago)
   */
  exportAcademicCitations(title, author, highlights, format = 'APA') {
    if (!highlights || highlights.length === 0) return '';
    let doc = `# Citas Académicas (${format.toUpperCase()})\n`;
    doc += `**Documento:** ${title || 'Sin título'} — **Autor:** ${author || 'Autor'}\n`;
    doc += `**Fecha:** ${new Date().toLocaleDateString()}\n\n---\n\n`;

    highlights.forEach((h, idx) => {
      if (window.bookAnnotations) {
        doc += `${idx + 1}. ${window.bookAnnotations.formatCitation(h.text, format, { title, author, page: h.page })}\n\n`;
      } else {
        doc += `${idx + 1}. "${h.text}" (${author}, p. ${h.page})\n\n`;
      }
    });

    const filename = `Citas_${format}_${(title || 'libro').replace(/[\\/:*?"<>|]/g, '_')}.md`;
    this.downloadFile(doc, filename, 'text/markdown;charset=utf-8');
  }

  /**
   * Export All Rendered Pages as High-Res Images in a ZIP
   */
  async exportImagesZip(title, pageCanvases, onProgress) {
    if (!window.JSZip) {
      throw new Error('JSZip es requerido para exportar imágenes');
    }
    const zip = new window.JSZip();
    const folder = zip.folder('paginas');
    const total = pageCanvases.length;

    for (let i = 0; i < total; i++) {
      const item = pageCanvases[i];
      if (!item || !item.canvas) continue;
      const pageNum = String(item.pageNum || (i + 1)).padStart(3, '0');
      const dataUrl = item.canvas.toDataURL('image/png');
      const base64 = dataUrl.split(',')[1];
      folder.file(`pagina_${pageNum}.png`, base64, { base64: true });
      if (onProgress) {
        onProgress(Math.round(((i + 1) / total) * 100));
      }
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const filename = `${(title || 'paginas').replace(/[\\/:*?"<>|]/g, '_')}_imagenes.zip`;
    this.downloadFile(zipBlob, filename, 'application/zip');
  }

  /**
   * Export Standalone Self-Contained HTML Flipbook
   * Generates a single, beautiful .html file that runs 100% offline anywhere!
   */
  exportStandaloneHtml(title, author, pagesWithImagesOrText) {
    const safeTitle = (title || 'Libro Digital').replace(/[<>&'"]/g, '');
    const safeAuthor = (author || 'Autor Desconocido').replace(/[<>&'"]/g, '');

    const pagesData = pagesWithImagesOrText.map((p, idx) => ({
      pageNum: p.pageNum || (idx + 1),
      title: p.title || `Página ${idx + 1}`,
      text: p.text || '',
      imageData: p.imageData || null
    }));

    const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0, user-scalable=yes">
  <title>${safeTitle} — LuminaBook</title>
  <style>
    :root {
      --bg: #121316;
      --paper: #fbf7ee;
      --text: #2a2521;
      --accent: #d97706;
      --shadow: rgba(0,0,0,0.35);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: #e5e7eb;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Georgia, serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      overflow-x: hidden;
      user-select: none;
      touch-action: pan-y pinch-zoom;
    }
    header {
      width: 100%;
      padding: 12px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(20,20,24,0.85);
      backdrop-filter: blur(8px);
      border-bottom: 1px solid rgba(255,255,255,0.08);
      z-index: 100;
    }
    .book-info h1 { font-size: 1.05rem; font-weight: 600; color: #fff; }
    .book-info p { font-size: 0.8rem; color: #9ca3af; }
    .header-controls { display: flex; gap: 8px; }
    button {
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.15);
      color: #fff;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.85rem;
      transition: all 0.2s;
    }
    button:hover { background: rgba(255,255,255,0.18); }
    .stage {
      flex: 1;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      perspective: 2000px;
      padding: 15px;
    }
    .book-container {
      position: relative;
      width: min(92vw, 900px);
      height: min(78vh, 650px);
      display: flex;
      box-shadow: 0 25px 60px var(--shadow);
      border-radius: 8px;
      background: var(--paper);
      transform-style: preserve-3d;
      transition: transform 0.4s ease;
    }
    .page-sheet {
      flex: 1;
      height: 100%;
      background: var(--paper);
      color: var(--text);
      padding: 30px;
      overflow-y: auto;
      position: relative;
      font-family: "Georgia", serif;
      line-height: 1.65;
      font-size: 1.02rem;
      box-shadow: inset 0 0 30px rgba(0,0,0,0.04);
    }
    .page-sheet:first-child {
      border-right: 1px solid rgba(0,0,0,0.1);
      box-shadow: inset -15px 0 25px rgba(0,0,0,0.06);
    }
    .page-sheet:last-child {
      box-shadow: inset 15px 0 25px rgba(0,0,0,0.06);
    }
    .page-sheet img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      display: block;
      margin: auto;
    }
    .page-num {
      position: absolute;
      bottom: 10px;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 0.8rem;
      color: #888;
    }
    footer {
      width: 100%;
      padding: 12px 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 15px;
      background: rgba(20,20,24,0.9);
      border-top: 1px solid rgba(255,255,255,0.08);
    }
    .scrubber {
      width: min(400px, 60vw);
      accent-color: var(--accent);
    }
    @media (max-width: 768px) {
      .book-container { flex-direction: column; width: 95vw; height: 80vh; }
      .page-sheet:first-child { display: none; }
    }
  </style>
</head>
<body>
  <header>
    <div class="book-info">
      <h1>${safeTitle}</h1>
      <p>${safeAuthor}</p>
    </div>
    <div class="header-controls">
      <button onclick="toggleTheme()">🌓 Tema</button>
      <button onclick="toggleFullscreen()">⛶ Pantalla</button>
    </div>
  </header>

  <div class="stage" id="stage" onclick="handleStageClick(event)">
    <div class="book-container" id="bookContainer">
      <div class="page-sheet" id="leftPage"></div>
      <div class="page-sheet" id="rightPage"></div>
    </div>
  </div>

  <footer>
    <button onclick="prevPage()">◀ Anterior</button>
    <input type="range" class="scrubber" id="scrubber" min="1" max="${pagesData.length}" value="1" oninput="jumpToPage(this.value)">
    <span id="pageIndicator" style="font-size: 0.85rem; color: #bbb;">1 / ${pagesData.length}</span>
    <button onclick="nextPage()">Siguiente ▶</button>
  </footer>

  <script>
    const pages = ${JSON.stringify(pagesData)};
    let currentIndex = 0;
    const isMobile = () => window.innerWidth < 768;

    function render() {
      const leftEl = document.getElementById('leftPage');
      const rightEl = document.getElementById('rightPage');
      const mobile = isMobile();

      if (mobile) {
        renderPageInto(rightEl, currentIndex);
      } else {
        const leftIdx = currentIndex % 2 === 0 ? currentIndex - 1 : currentIndex;
        const rightIdx = leftIdx + 1;
        renderPageInto(leftEl, leftIdx);
        renderPageInto(rightEl, rightIdx);
      }

      document.getElementById('scrubber').value = currentIndex + 1;
      document.getElementById('pageIndicator').innerText = (currentIndex + 1) + ' / ' + pages.length;
    }

    function renderPageInto(el, idx) {
      if (idx < 0 || idx >= pages.length) {
        el.innerHTML = '<div style="display:flex;height:100%;align-items:center;justify-content:center;color:#aaa;"><em>Fin del libro</em></div>';
        return;
      }
      const page = pages[idx];
      if (page.imageData) {
        el.innerHTML = '<img src="' + page.imageData + '" alt="Página ' + (idx + 1) + '"><div class="page-num">— ' + (idx + 1) + ' —</div>';
      } else {
        el.innerHTML = '<h2>' + page.title + '</h2><div style="margin-top:15px;white-space:pre-wrap;">' + page.text + '</div><div class="page-num">— ' + (idx + 1) + ' —</div>';
      }
    }

    function nextPage() {
      const step = isMobile() ? 1 : 2;
      if (currentIndex + step < pages.length) {
        currentIndex += step;
      } else if (currentIndex < pages.length - 1) {
        currentIndex = pages.length - 1;
      }
      render();
    }

    function prevPage() {
      const step = isMobile() ? 1 : 2;
      if (currentIndex - step >= 0) {
        currentIndex -= step;
      } else {
        currentIndex = 0;
      }
      render();
    }

    function jumpToPage(num) {
      currentIndex = Math.max(0, Math.min(pages.length - 1, parseInt(num) - 1));
      render();
    }

    function handleStageClick(e) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      if (x > rect.width * 0.7) nextPage();
      else if (x < rect.width * 0.3) prevPage();
    }

    // Touch Swipe Support
    let touchStartX = 0;
    document.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].clientX; }, { passive: true });
    document.addEventListener('touchend', e => {
      const diff = e.changedTouches[0].clientX - touchStartX;
      if (diff > 50) prevPage();
      else if (diff < -50) nextPage();
    }, { passive: true });

    // Keyboard support
    document.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === ' ') nextPage();
      if (e.key === 'ArrowLeft') prevPage();
    });

    let dark = true;
    function toggleTheme() {
      dark = !dark;
      document.documentElement.style.setProperty('--bg', dark ? '#121316' : '#e5e7eb');
      document.documentElement.style.setProperty('--paper', dark ? '#fbf7ee' : '#ffffff');
      document.documentElement.style.setProperty('--text', '#1a1a1a');
    }

    function toggleFullscreen() {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
      else document.exitFullscreen().catch(() => {});
    }

    window.addEventListener('resize', render);
    render();
  </script>
</body>
</html>`;

    const filename = `${(title || 'libro').replace(/[\\/:*?"<>|]/g, '_')}_flipbook.html`;
    this.downloadFile(htmlContent, filename, 'text/html;charset=utf-8');
  }
}

// Global instance
window.universalExporter = new UniversalExporter();
