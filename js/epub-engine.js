/**
 * Ebook4u - EPUB Engine (EPUB 3.0 Packager & Importer)
 * Uses JSZip to create fully compliant, standard EPUB 3.0 eBooks and to import existing EPUB files.
 */

class EPUBEngine {
  constructor() {
    this.zip = null;
  }

  _escapeXml(unsafe) {
    if (!unsafe) return '';
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
      }
    });
  }

  /**
   * Convert current PDF document into a standard EPUB 3.0 file
   */
  async generateEpub({ title, author, pages, coverDataUrl, outline }, onProgress) {
    if (!window.JSZip) {
      throw new Error('JSZip library is required to generate EPUB');
    }

    const zip = new window.JSZip();
    const bookTitle = title || 'Libro Digital';
    const bookAuthor = author || 'Autor Desconocido';
    const bookId = 'urn:uuid:' + this._generateUUID();
    const dateModified = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

    // 1. mimetype (Must be first and uncompressed)
    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

    // 2. META-INF/container.xml
    const containerXml = `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
    zip.folder('META-INF').file('container.xml', containerXml);

    const oebps = zip.folder('OEBPS');

    // 3. Stylesheet
    const cssContent = `
@charset "utf-8";
body {
  margin: 5% 8%;
  font-family: "Georgia", "Merriweather", "Times New Roman", serif;
  font-size: 1.1em;
  line-height: 1.7;
  color: #1a1a1a;
  background-color: #faf8f5;
}
h1, h2, h3 {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #111;
  margin-top: 1.5em;
  margin-bottom: 0.6em;
  line-height: 1.25;
}
h1 { font-size: 2em; text-align: center; border-bottom: 1px solid #ddd; padding-bottom: 0.5em; }
h2 { font-size: 1.5em; }
h3 { font-size: 1.2em; }
p {
  margin-top: 0;
  margin-bottom: 1em;
  text-align: justify;
  text-indent: 1.5em;
}
p.first-p, p:first-of-type {
  text-indent: 0;
}
blockquote {
  margin: 1.5em 2em;
  padding-left: 1em;
  border-left: 3px solid #b39b7d;
  font-style: italic;
  color: #555;
}
.cover-img {
  max-width: 100%;
  max-height: 95vh;
  display: block;
  margin: 0 auto;
}
.page-badge {
  text-align: center;
  font-size: 0.85em;
  color: #888;
  margin-top: 3em;
  border-top: 1px solid #eee;
  padding-top: 0.5em;
}
`;
    oebps.file('style.css', cssContent);

    // 4. Cover image if available
    let hasCover = false;
    if (coverDataUrl) {
      try {
        const base64Data = coverDataUrl.split(',')[1];
        oebps.folder('images').file('cover.jpg', base64Data, { base64: true });
        hasCover = true;

        const coverXhtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>Portada</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
  <style>
    body { margin: 0; padding: 0; text-align: center; background: #000; }
    img { max-width: 100%; height: auto; max-height: 100vh; object-fit: contain; }
  </style>
</head>
<body>
  <div style="text-align:center;">
    <img src="images/cover.jpg" alt="Portada de ${this._escapeXml(bookTitle)}" class="cover-img"/>
  </div>
</body>
</html>`;
        oebps.file('cover.xhtml', coverXhtml);
      } catch (e) {
        console.warn('Cover generation failed:', e);
      }
    }

    // 5. Generate Chapter XHTML files
    const manifestItems = [
      `<item id="style" href="style.css" media-type="text/css"/>`,
      `<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`,
      `<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>`
    ];
    const spineItems = [];
    const navEntries = [];
    const ncxEntries = [];

    if (hasCover) {
      manifestItems.push(`<item id="cover-image" href="images/cover.jpg" media-type="image/jpeg" properties="cover-image"/>`);
      manifestItems.push(`<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>`);
      spineItems.push(`<itemref idref="cover" linear="yes"/>`);
    }

    const totalPages = pages.length;
    for (let i = 0; i < totalPages; i++) {
      const page = pages[i];
      const pageNum = page.pageNum || (i + 1);
      const filename = `chapter_${pageNum}.xhtml`;
      const itemId = `chapter_${pageNum}`;
      const pageTitle = page.title || `Capítulo / Página ${pageNum}`;

      // Convert page text to HTML paragraphs and headings
      let contentHtml = '';
      if (page.text && page.text.trim()) {
        const rawLines = page.text.split('\n');
        for (const line of rawLines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed.startsWith('## ')) {
            contentHtml += `<h2>${this._escapeXml(trimmed.replace('## ', ''))}</h2>\n`;
          } else if (trimmed.startsWith('# ')) {
            contentHtml += `<h1>${this._escapeXml(trimmed.replace('# ', ''))}</h1>\n`;
          } else if (trimmed.startsWith('> ')) {
            contentHtml += `<blockquote><p>${this._escapeXml(trimmed.replace('> ', ''))}</p></blockquote>\n`;
          } else {
            contentHtml += `<p>${this._escapeXml(trimmed)}</p>\n`;
          }
        }
      } else {
        contentHtml = `<p><em>[Página visual ilustrada ${pageNum}]</em></p>`;
      }

      const chapterXml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>${this._escapeXml(pageTitle)}</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <section epub:type="chapter">
    <h1>${this._escapeXml(pageTitle)}</h1>
    ${contentHtml}
    <div class="page-badge">— ${pageNum} —</div>
  </section>
</body>
</html>`;

      oebps.file(filename, chapterXml);

      manifestItems.push(`<item id="${itemId}" href="${filename}" media-type="application/xhtml+xml"/>`);
      spineItems.push(`<itemref idref="${itemId}"/>`);

      navEntries.push(`<li><a href="${filename}">${this._escapeXml(pageTitle)}</a></li>`);
      ncxEntries.push(`
        <navPoint id="np_${pageNum}" playOrder="${hasCover ? pageNum + 1 : pageNum}">
          <navLabel><text>${this._escapeXml(pageTitle)}</text></navLabel>
          <content src="${filename}"/>
        </navPoint>`);

      if (onProgress) {
        onProgress(Math.round(((i + 1) / totalPages) * 70));
      }
    }

    // 6. Navigation doc: OEBPS/nav.xhtml (EPUB 3)
    const navXml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>Índice de Contenido</title>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Índice de Contenido</h1>
    <ol>
      ${hasCover ? '<li><a href="cover.xhtml">Portada</a></li>' : ''}
      ${navEntries.join('\n      ')}
    </ol>
  </nav>
</body>
</html>`;
    oebps.file('nav.xhtml', navXml);

    // 7. NCX table of contents: OEBPS/toc.ncx (EPUB 2 compatibility)
    const ncxXml = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${bookId}"/>
    <meta name="dtb:depth" content="2"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${this._escapeXml(bookTitle)}</text></docTitle>
  <docAuthor><text>${this._escapeXml(bookAuthor)}</text></docAuthor>
  <navMap>
    ${hasCover ? `
    <navPoint id="np_cover" playOrder="1">
      <navLabel><text>Portada</text></navLabel>
      <content src="cover.xhtml"/>
    </navPoint>` : ''}
    ${ncxEntries.join('\n')}
  </navMap>
</ncx>`;
    oebps.file('toc.ncx', ncxXml);

    // 8. Package Document: OEBPS/content.opf
    const opfXml = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookID">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="BookID">${bookId}</dc:identifier>
    <dc:title>${this._escapeXml(bookTitle)}</dc:title>
    <dc:creator>${this._escapeXml(bookAuthor)}</dc:creator>
    <dc:language>es</dc:language>
    <dc:date>${dateModified.split('T')[0]}</dc:date>
    <meta property="dcterms:modified">${dateModified}</meta>
    ${hasCover ? '<meta name="cover" content="cover-image"/>' : ''}
  </metadata>
  <manifest>
    ${manifestItems.join('\n    ')}
  </manifest>
  <spine toc="ncx">
    ${spineItems.join('\n    ')}
  </spine>
</package>`;
    oebps.file('content.opf', opfXml);

    // 9. Generate the EPUB zip Blob
    const content = await zip.generateAsync(
      {
        type: 'blob',
        mimeType: 'application/epub+zip',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 }
      },
      (metadata) => {
        if (onProgress) {
          onProgress(70 + Math.round(metadata.percent * 0.3));
        }
      }
    );

    return {
      blob: content,
      filename: `${bookTitle.replace(/[\\/:*?"<>|]/g, '_')}.epub`
    };
  }

  /**
   * Import and parse an EPUB file into readable book structure
   */
  async parseEpub(fileOrBuffer) {
    if (!window.JSZip) {
      throw new Error('JSZip library is required to read EPUB');
    }

    const zip = await window.JSZip.loadAsync(fileOrBuffer);

    // Read container.xml to locate rootfile (.opf)
    const containerXml = await zip.file('META-INF/container.xml')?.async('text');
    if (!containerXml) {
      throw new Error('Archivo EPUB no válido: falta META-INF/container.xml');
    }

    const parser = new DOMParser();
    const containerDoc = parser.parseFromString(containerXml, 'application/xml');
    const rootfileEl = containerDoc.querySelector('rootfile');
    const opfPath = rootfileEl?.getAttribute('full-path') || 'OEBPS/content.opf';
    const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';

    const opfContent = await zip.file(opfPath)?.async('text');
    if (!opfContent) {
      throw new Error(`No se pudo encontrar el archivo OPF en ${opfPath}`);
    }

    const opfDoc = parser.parseFromString(opfContent, 'application/xml');

    // Extract metadata
    const title = opfDoc.querySelector('dc\\:title, title')?.textContent || 'Libro EPUB';
    const author = opfDoc.querySelector('dc\\:creator, creator')?.textContent || 'Autor Desconocido';

    // Parse manifest
    const manifest = {};
    opfDoc.querySelectorAll('manifest > item').forEach(item => {
      manifest[item.getAttribute('id')] = {
        href: opfDir + item.getAttribute('href'),
        mediaType: item.getAttribute('media-type'),
        properties: item.getAttribute('properties') || ''
      };
    });

    // Parse spine items in reading order
    const pages = [];
    const itemrefs = opfDoc.querySelectorAll('spine > itemref');
    let pageCounter = 1;

    for (const ref of itemrefs) {
      const idref = ref.getAttribute('idref');
      const item = manifest[idref];
      if (item && item.href) {
        const file = zip.file(item.href);
        if (file) {
          const htmlText = await file.async('text');
          const doc = parser.parseFromString(htmlText, 'text/html');

          // Extract clean text
          const bodyText = doc.body.innerText || doc.body.textContent || '';
          const headings = Array.from(doc.querySelectorAll('h1, h2, h3')).map(h => h.textContent.trim());
          const pageTitle = headings.length > 0 ? headings[0] : `Página ${pageCounter}`;

          pages.push({
            pageNum: pageCounter,
            title: pageTitle,
            text: bodyText.trim(),
            html: doc.body.innerHTML
          });
          pageCounter++;
        }
      }
    }

    return {
      title,
      author,
      numPages: pages.length,
      pages
    };
  }

  _generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

// Global instance
window.epubEngine = new EPUBEngine();
