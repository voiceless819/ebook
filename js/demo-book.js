/**
 * Manual de Usuario y Guía de Referencia
 * Documento de inicio sobrio y técnico sin texto artificioso.
 */

window.DEMO_BOOK = {
  title: 'Guía de Usuario — Visor de PDF y Lector eBook',
  author: 'Referencia Técnica',
  subject: 'Documentación y Manual de Uso',
  numPages: 4,
  outline: [
    { title: '1. Portada y Resumen', page: 1, items: [] },
    { title: '2. Catálogo y Almacenamiento Local', page: 2, items: [] },
    { title: '3. Navegación y Controles Táctiles', page: 3, items: [] },
    { title: '4. Conversión y Exportación', page: 4, items: [] }
  ],
  pages: [
    {
      pageNum: 1,
      title: 'Guía de Usuario',
      html: `
        <div class="manual-page">
          <div class="manual-header">
            <span class="manual-doc-id">DOC-REF-01</span>
            <span class="manual-date">VERSIÓN 2.0</span>
          </div>
          <h1 class="manual-title">Visor de PDF & Conversor a eBook</h1>
          <p class="manual-subtitle">Manual de uso, almacenamiento local persistente y opciones de exportación</p>
          <hr class="manual-divider">
          <div class="manual-summary-box">
            <h3>Resumen Ejecutivo</h3>
            <p>Esta aplicación permite visualizar documentos PDF mediante un motor de renderizado de alta definición, organizarlos en un catálogo personal persistente en el dispositivo del usuario y exportarlos a formato EPUB 3.0 estándar, HTML autónomo o Markdown.</p>
          </div>
          <div class="manual-quick-actions">
            <p><strong>Para comenzar de inmediato:</strong> Pulsa el botón superior <em>"+ Añadir PDF"</em> o arrastra cualquier archivo PDF directamente sobre esta ventana.</p>
          </div>
        </div>
      `,
      text: `Guía de Usuario. Visor de PDF y Conversor a eBook. Manual de uso, almacenamiento local persistente y opciones de exportación. Esta aplicación permite visualizar documentos PDF mediante renderizado de alta definición, organizarlos en un catálogo personal en el dispositivo del usuario y exportarlos a EPUB 3.0, HTML o Markdown. Pulsa "+ Añadir PDF" para cargar un documento.`
    },
    {
      pageNum: 2,
      title: 'Catálogo y Almacenamiento Local',
      html: `
        <div class="manual-page">
          <h2>1. Catálogo Personal y Persistencia</h2>
          <p>Los archivos que añades se almacenan directamente en la base de datos interna de tu navegador (IndexedDB). No se transfieren a ningún servidor externo.</p>
          
          <table class="manual-table">
            <thead>
              <tr>
                <th>Característica</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Privacidad</strong></td>
                <td>Los documentos permanecen exclusivamente en tu dispositivo.</td>
              </tr>
              <tr>
                <td><strong>Capacidad</strong></td>
                <td>Soporta cientos de megabytes según el espacio disponible en disco.</td>
              </tr>
              <tr>
                <td><strong>Progreso de lectura</strong></td>
                <td>El sistema registra la última página leída y la restablece al abrir el documento.</td>
              </tr>
              <tr>
                <td><strong>Acceso sin conexión</strong></td>
                <td>Todos los libros guardados están disponibles sin conexión a internet.</td>
              </tr>
            </tbody>
          </table>

          <div class="manual-note">
            <strong>Gestión del catálogo:</strong> Pulsa el botón "Catálogo" en la barra superior para ver todos tus documentos guardados, comprobar tu progreso o eliminar archivos antiguos.
          </div>
        </div>
      `,
      text: `1. Catálogo Personal y Persistencia. Los archivos que añades se almacenan directamente en la base de datos interna de tu navegador (IndexedDB). No se transfieren a ningún servidor externo. Privacidad total: los documentos permanecen en tu dispositivo. Registro automático de la última página leída. Acceso completo sin conexión a internet.`
    },
    {
      pageNum: 3,
      title: 'Navegación y Controles Táctiles',
      html: `
        <div class="manual-page">
          <h2>2. Navegación y Controles</h2>
          <p>La interfaz responde a controles táctiles en smartphones y tablets, así como a teclado y ratón en ordenadores:</p>
          
          <div class="manual-grid">
            <div class="manual-grid-item">
              <h4>Deslizamiento (Swipe)</h4>
              <p>Arrastra horizontalmente para avanzar o retroceder páginas con animación de pase de hoja.</p>
            </div>
            <div class="manual-grid-item">
              <h4>Zonas de Toque</h4>
              <p>Toca el margen derecho para avanzar, el izquierdo para retroceder, o el centro para ocultar las barras de herramientas.</p>
            </div>
            <div class="manual-grid-item">
              <h4>Zoom Táctil</h4>
              <p>Pellizca con dos dedos para ampliar detalles en diagramas o texto denso.</p>
            </div>
            <div class="manual-grid-item">
              <h4>Teclado</h4>
              <p>Flechas Izquierda / Derecha o barra espaciadora para pasar de página. Tecla F para pantalla completa.</p>
            </div>
          </div>
        </div>
      `,
      text: `2. Navegación y Controles. Deslizamiento o swipe horizontal para avanzar o retroceder. Zonas de toque laterales para avanzar o retroceder. Toque central para ocultar barras de menú. Pellizco con dos dedos para zoom. Flechas del teclado para pasar de página.`
    },
    {
      pageNum: 4,
      title: 'Conversión y Exportación',
      html: `
        <div class="manual-page">
          <h2>3. Opciones de Exportación</h2>
          <p>Ebook4u incluye un empaquetador directo para transformar tus documentos PDF en formatos universales:</p>
          
          <ul class="manual-list">
            <li><strong>EPUB 3.0:</strong> Genera un paquete estándar con portada, metadatos, tabla de contenido (NCX y Nav) y hojas de estilo optimizadas para Apple Books, Kindle y Kobo.</li>
            <li><strong>Flipbook HTML Autónomo:</strong> Exporta un único archivo .html autosuficiente que incluye el visor integrado. Se abre en cualquier navegador sin necesidad de conexión ni servidor.</li>
            <li><strong>Markdown (.md):</strong> Extrae los encabezados y párrafos estructurados para su uso en editores de texto plano.</li>
            <li><strong>Anotaciones (.md):</strong> Guarda un informe con todos los marcadores y notas personales registradas durante la lectura.</li>
          </ul>

          <div class="manual-footer-notice">
            <p>Documentación técnica de Ebook4u — Versión 2.0</p>
          </div>
        </div>
      `,
      text: `3. Opciones de Exportación. EPUB 3.0 estándar compatible con Apple Books, Kindle y Kobo. Flipbook HTML Autónomo en un solo archivo independiente. Markdown para editores de texto estructurado. Informe descargable de marcadores y notas.`
    }
  ]
};
