# LuminaBook — Visor de PDF, Catálogo Local y Conversor a eBook

LuminaBook es una aplicación web estática para visualizar documentos PDF, organizarlos en un **catálogo personal persistente en el navegador** y convertirlos a formato **EPUB 3.0 estándar**, **Flipbook HTML autónomo** y **Markdown**.

Funciona 100% en el cliente (navegador), sin enviar tus archivos a ningún servidor externo.

---

## Despliegue en GitHub Pages

La aplicación está publicada y activa en GitHub Pages:
* **Enlace directo:** [https://voiceless819.github.io/ebook/](https://voiceless819.github.io/ebook/)
* **Repositorio de código:** [https://github.com/voiceless819/ebook](https://github.com/voiceless819/ebook)

---

## Características

### 1. Catálogo Personal y Almacenamiento Local (IndexedDB)
* **Persistencia en el dispositivo:** Cada PDF que añades se almacena de forma segura en la base de datos interna de tu navegador (IndexedDB).
* **Capacidad:** Almacena múltiples documentos y cientos de megabytes según el espacio en disco de tu dispositivo.
* **Memoria de lectura:** Guarda la última página leída y la restablece automáticamente al abrir el documento.
* **Privacidad total:** Tus documentos nunca salen de tu ordenador, tablet o teléfono móvil.
* **Acceso sin conexión:** Los documentos del catálogo están disponibles incluso sin conexión a internet.

### 2. Modos de Lectura
* **Vista Libro (3D Flipbook):**
  * Doble página en pantallas panorámicas con lomo central y curvatura 3D.
  * Página simple en smartphones y orientación vertical.
  * Animación de pase de página interactiva.
  * Síntesis acústica de pase de página en tiempo real (Web Audio API).
* **Vista Texto (Reflow Continuo):**
  * Extracción y reflujo de texto para lectura continua.
  * Modo de Lectura Biónica para acelerar la velocidad de fijación visual.
  * Control métrico de tamaño de letra (14px - 30px), interlineado y tipografías (Sans, Serif, OpenDyslexic, Monospace).

### 3. Controles Táctiles y de Navegación
* **Deslizar (Swipe):** Pasa de página arrastrando horizontalmente con el dedo.
* **Zonas de Toque:**
  * Margen izquierdo (20%): Retroceder página.
  * Margen derecho (20%): Avanzar página.
  * Zona central (60%): Ocultar o mostrar las barras de control (modo inmersivo).
* **Pellizco para Zoom:** Ampliación con dos dedos en tablets y móviles.
* **Teclado:** Flechas izquierda y derecha, barra espaciadora, tecla F (pantalla completa), tecla M (alternar modo).

### 4. Audiolibro (Text-to-Speech)
* Lectura en voz alta del texto del documento con selector de velocidad (0.8x, 1.0x, 1.2x, 1.5x).
* Paso automático de página al completar la lectura de cada hoja.

### 5. Conversión y Exportación
* **eBook EPUB 3.0 Estándar:** Empaquetado completo compatible con Apple Books, Kindle, Calibre y Kobo.
* **Flipbook HTML Autónomo:** Un único archivo web independiente que incluye el visor 3D para abrir en cualquier dispositivo sin internet.
* **Markdown (.md):** Texto limpio estructurado por encabezados y secciones.
* **Texto Plano (.txt):** Transcripción simple de texto.
* **Anotaciones (.md):** Informe descargable de marcadores, notas al margen y estadísticas de lectura.

---

## Estructura del Repositorio

```text
├── index.html              # Interfaz de usuario
├── manifest.json           # Manifiesto PWA para instalación móvil
├── sw.js                   # Service Worker para funcionamiento offline
├── .nojekyll               # Desactiva el procesador Jekyll en GitHub Pages
├── .gitignore              # Filtro de archivos locales
├── .github/workflows/
│   └── deploy.yml          # Flujo de despliegue automatizado en GitHub Pages
├── css/
│   └── styles.css          # Estilos visuales y diseño responsive
├── js/
│   ├── app.js              # Coordinador de la aplicación
│   ├── storage.js          # Gestor de IndexedDB y catálogo personal
│   ├── audio.js            # Generador acústico de sonido de hojas
│   ├── tts.js              # Motor Text-to-Speech
│   ├── pdf-engine.js       # Renderizado de PDF con PDF.js
│   ├── epub-engine.js      # Empaquetador EPUB 3.0
│   ├── exporter.js         # Exportador a HTML autónomo y Markdown
│   ├── flipbook.js         # Motor 3D del libro
│   ├── reflow-reader.js    # Lector de texto continuo y lectura biónica
│   ├── gestures.js         # Gestor táctil (swipe, pinch zoom, toques)
│   ├── annotations.js      # Marcadores, notas y buscador
│   └── demo-book.js        # Manual de usuario inicial
└── vendor/
    ├── pdf.min.js          # Librería PDF.js
    ├── pdf.worker.min.js   # Worker de procesamiento de PDF
    └── jszip.min.js        # Librería de compresión ZIP
```
