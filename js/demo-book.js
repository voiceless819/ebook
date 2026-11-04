/**
 * LuminaBook - Pre-loaded Masterpiece Demo Book
 * "El Arte de la Lectura Humana y Digital"
 * Ready out-of-the-box so the app is 100% usable immediately on first launch.
 */

window.DEMO_BOOK = {
  title: 'El Arte de la Lectura Humana y Digital',
  author: 'LuminaBook Studio & Editorial Antigravity',
  subject: 'Literatura, Tipografía y Experiencia Táctil',
  numPages: 6,
  outline: [
    { title: 'Portada de la Obra', page: 1, items: [] },
    { title: 'Manifiesto: El Tacto de las Letras', page: 2, items: [] },
    { title: 'Índice General & Filosofía', page: 3, items: [] },
    { title: 'Capítulo I: Sinfonía de Tintas y Algoritmos', page: 4, items: [] },
    { title: 'Capítulo II: Gestos y Controles Táctiles', page: 5, items: [] },
    { title: 'Capítulo III: Conversión y Libertad de Formato', page: 6, items: [] }
  ],
  pages: [
    {
      pageNum: 1,
      title: 'Portada',
      html: `
        <div class="demo-cover-wrapper">
          <div class="cover-frame-outer">
            <div class="cover-frame-inner">
              <div class="cover-crown">✦ EDICIÓN DE LUJO ILUSTRADA ✦</div>
              <h1 class="cover-main-title">EL ARTE DE LA LECTURA</h1>
              <div class="cover-subtitle">HUMANA Y DIGITAL</div>
              <div class="cover-ornament">❧ ❦ ❧</div>
              <p class="cover-description">Del PDF estático al libro vivo, táctil y reflowable</p>
              <div class="cover-author">LuminaBook Studio</div>
              <div class="cover-badge">EXPERIENCIA TÁCTIL 3D & EBOOK COMPLETO</div>
            </div>
          </div>
        </div>
      `,
      text: `EL ARTE DE LA LECTURA HUMANA Y DIGITAL. Edición de Lujo Ilustrada. Del PDF estático al libro vivo, táctil y reflowable. Por LuminaBook Studio. Experiencia Táctil 3D y Conversor Universal a eBook.`
    },
    {
      pageNum: 2,
      title: 'Manifiesto: El Tacto de las Letras',
      html: `
        <div class="editorial-page">
          <span class="chapter-number">PROEMIO</span>
          <h2 class="editorial-title">El Tacto de las Letras</h2>
          <p class="dropcap-p"><span class="dropcap">L</span>eer nunca ha sido únicamente un acto óptico; es, ante todo, un rito táctil. El crujido de la fibra de celulosa al doblarse sobre sí misma, la sombra fugaz que proyecta la página al alzarse en el aire y el reposo sosegado de los márgenes han acompañado a la humanidad durante siglos.</p>
          <p>Durante décadas, el formato PDF congeló los textos en fotocopias digitales rígidas: frías, difíciles de leer en pantallas pequeñas y desprovistas de calidez. LuminaBook nace para devolverle al lector la sensualidad del papel sin renunciar al poder del hipertexto.</p>
          <blockquote>
            "De los diversos instrumentos del hombre, el más asombroso es, sin duda, el libro. Los demás son extensiones de su cuerpo: el microscopio y el telescopio son extensiones de su vista; el teléfono es extensión de su voz; pero el libro es otra cosa: el libro es una extensión de la memoria y de la imaginación."
            <cite>— Jorge Luis Borges</cite>
          </blockquote>
          <p>Hoy inauguramos una lectura viva: donde la física del movimiento, la síntesis acústica del papel y la tipografía líquida se funden en una sola caricia sobre el cristal.</p>
        </div>
      `,
      text: `Manifiesto: El Tacto de las Letras. Leer nunca ha sido únicamente un acto óptico; es, ante todo, un rito táctil. El crujido de la fibra de celulosa al doblarse sobre sí misma, la sombra fugaz que proyecta la página al alzarse en el aire y el reposo sosegado de los márgenes han acompañado a la humanidad durante siglos. Durante décadas, el formato PDF congeló los textos en fotocopias digitales rígidas. LuminaBook nace para devolverle al lector la sensualidad del papel. De los diversos instrumentos del hombre, el más asombroso es, sin duda, el libro: es una extensión de la memoria y de la imaginación.`
    },
    {
      pageNum: 3,
      title: 'Índice General & Filosofía',
      html: `
        <div class="editorial-page">
          <span class="chapter-number">ESTRUCTURA</span>
          <h2 class="editorial-title">Tabla de Contenidos</h2>
          <div class="toc-interactive-list">
            <div class="toc-row">
              <span class="toc-title">I. Sinfonía de Tintas y Algoritmos</span>
              <span class="toc-dots"></span>
              <span class="toc-num">Pág. 4</span>
            </div>
            <div class="toc-row">
              <span class="toc-title">II. Guía de Gestos en Móviles y Tablets</span>
              <span class="toc-dots"></span>
              <span class="toc-num">Pág. 5</span>
            </div>
            <div class="toc-row">
              <span class="toc-title">III. Conversión y Exportación Abierta</span>
              <span class="toc-dots"></span>
              <span class="toc-num">Pág. 6</span>
            </div>
          </div>
          <div class="human-quote-box">
            <h4>✦ Tres Pilares de la Experiencia Lumina</h4>
            <ul>
              <li><strong>Física y Acústica Real:</strong> Cada paso de página genera una curvatura tridimensional y un crujido sintetizado por osciladores de audio natural.</li>
              <li><strong>Modo Dual Simbiótico:</strong> Alterna al instante entre el realismo de un libro físico y la fluidez responsiva de un lector Kindle moderno.</li>
              <li><strong>Universalidad Táctil:</strong> Diseñado desde la base con gestos intuitivos de barrido, doble toque y zoom adaptativo.</li>
            </ul>
          </div>
        </div>
      `,
      text: `Tabla de Contenidos. I. Sinfonía de Tintas y Algoritmos, Página 4. II. Guía de Gestos en Móviles y Tablets, Página 5. III. Conversión y Exportación Abierta, Página 6. Tres Pilares de la Experiencia Lumina: Física y Acústica Real con síntesis de sonido, Modo Dual Simbiótico entre Flipbook y e-Reader Líquido, y Universalidad Táctil para todos los dispositivos.`
    },
    {
      pageNum: 4,
      title: 'Capítulo I: Sinfonía de Tintas y Algoritmos',
      html: `
        <div class="editorial-page">
          <span class="chapter-number">CAPÍTULO I</span>
          <h2 class="editorial-title">Sinfonía de Tintas y Algoritmos</h2>
          <p class="dropcap-p"><span class="dropcap">U</span>n libro no es un cúmulo estático de bytes; es una conversación íntima entre el autor y la mirada que lo recorre. Cuando abres un volumen en LuminaBook, el documento cobra vida propia.</p>
          <p>Prueba a activar el <strong>Modo Audiolibro</strong> en la barra superior: una voz humana comenzará a declamar estas mismas frases, resaltando rítmicamente cada sentencia a medida que tus oídos la reciben.</p>
          <p>Si sientes cansancio visual al caer la tarde, despliega el panel de estilo y sumérgete en el tono <em>Pergamino Sepia</em> o activa el modo <em>Carbón Nocturno</em>. La lectura biónica, por su parte, destacará las sílabas ancla para que tus ojos se deslicen a más de 350 palabras por minuto sin fatiga alguna.</p>
          <div class="signature-box">
            <em>"Un buen libro no se lee: se habita."</em>
          </div>
        </div>
      `,
      text: `Capítulo I: Sinfonía de Tintas y Algoritmos. Un libro no es un cúmulo estático de bytes; es una conversación íntima entre el autor y la mirada que lo recorre. Prueba a activar el Modo Audiolibro en la barra superior: una voz humana comenzará a declamar estas mismas frases. Si sientes cansancio visual al caer la tarde, despliega el panel de estilo y sumérgete en el tono Pergamino Sepia o activa el modo Carbón Nocturno. Un buen libro no se lee: se habita.`
    },
    {
      pageNum: 5,
      title: 'Capítulo II: Gestos y Controles Táctiles',
      html: `
        <div class="editorial-page">
          <span class="chapter-number">CAPÍTULO II</span>
          <h2 class="editorial-title">Controles Táctiles & Gestos</h2>
          <p>LuminaBook está optimizado milimétricamente para <strong>smartphones, tablets iPad/Android y ordenadores táctiles</strong>. Disfruta de una navegación orgánica:</p>
          <div class="gestures-grid">
            <div class="gesture-card">
              <div class="gesture-icon">👈 👉</div>
              <div class="gesture-title">Deslizar / Swipe</div>
              <div class="gesture-desc">Arrastra tu dedo hacia la izquierda o derecha para pasar la hoja con física natural y sonido de papel.</div>
            </div>
            <div class="gesture-card">
              <div class="gesture-icon">📱 👆</div>
              <div class="gesture-title">Toque Lateral</div>
              <div class="gesture-desc">Toca el margen derecho para avanzar o el izquierdo para retroceder cómodamente con una sola mano.</div>
            </div>
            <div class="gesture-card">
              <div class="gesture-icon">🤏 🔍</div>
              <div class="gesture-title">Pellizco / Zoom</div>
              <div class="gesture-desc">Pellizca con dos dedos para ampliar cualquier ilustración o doble toque para encajar al instante.</div>
            </div>
            <div class="gesture-card">
              <div class="gesture-icon">🎯 ✨</div>
              <div class="gesture-title">Centro Zen</div>
              <div class="gesture-desc">Toca en el centro de la pantalla para ocultar todas las barras y entrar en inmersión absoluta.</div>
            </div>
          </div>
        </div>
      `,
      text: `Capítulo II: Controles Táctiles y Gestos. LuminaBook está optimizado milimétricamente para smartphones, tablets iPad y Android, y ordenadores táctiles. Deslizar o Swipe hacia la izquierda o derecha para pasar la hoja con física natural. Toque lateral en los márgenes para avanzar o retroceder. Pellizco para hacer zoom con dos dedos. Toque en el centro para ocultar barras y entrar en inmersión absoluta.`
    },
    {
      pageNum: 6,
      title: 'Capítulo III: Conversión y Libertad de Formato',
      html: `
        <div class="editorial-page">
          <span class="chapter-number">CAPÍTULO III</span>
          <h2 class="editorial-title">Conversión & Libertad Abierta</h2>
          <p class="dropcap-p"><span class="dropcap">T</span>u biblioteca te pertenece. Cualquier archivo PDF que arrastres a esta ventana puede ser exportado de inmediato con un solo clic:</p>
          <ul class="export-features-list">
            <li><strong>📦 Formato EPUB 3.0:</strong> Genera un archivo estándar internacional listo para abrir en Apple Books, Kindle, Kobo o Google Play Libros.</li>
            <li><strong>🌐 Flipbook HTML Autónomo:</strong> Un archivo web independiente con visor 3D integrado que funciona sin conexión a internet en cualquier dispositivo.</li>
            <li><strong>📝 Markdown Editorial:</strong> Convierte el texto y sus capítulos a sintaxis limpia para tus notas en Obsidian, Notion o tu blog.</li>
            <li><strong>🔖 Resumen de Anotaciones:</strong> Exporta todos tus marcadores, citas subrayadas y reflexiones en un clic.</li>
          </ul>
          <div class="call-to-action-box">
            <p><strong>¿Listo para transformar tus propios documentos?</strong></p>
            <p>Haz clic en el botón <em>"Abrir Archivo"</em> o arrastra un PDF aquí para iniciar tu viaje.</p>
          </div>
        </div>
      `,
      text: `Capítulo III: Conversión y Libertad Abierta. Tu biblioteca te pertenece. Cualquier archivo PDF que arrastres a esta ventana puede ser exportado de inmediato con un solo clic a: Formato EPUB 3.0 para Apple Books o Kindle, Flipbook HTML Autónomo que funciona sin internet, Markdown Editorial y Resumen de Anotaciones. Arrastra tu propio PDF para comenzar.`
    }
  ]
};
