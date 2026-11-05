# Ebook4u — Visor de PDF, Catálogo Local y Suite de Estudio

Ebook4u es una aplicación web estática para visualizar documentos PDF, organizarlos en un **catálogo personal persistente en el navegador** y convertirlos a formato **EPUB 3.0 estándar**, **Flipbook HTML autónomo** y **Markdown**.

Funciona 100% en el cliente (navegador), sin enviar tus archivos a ningún servidor externo.

---

## Despliegue en GitHub Pages

La aplicación está publicada y activa en GitHub Pages:
* **Enlace directo:** [https://voiceless819.github.io/ebook/](https://voiceless819.github.io/ebook/)
* **Repositorio de código:** [https://github.com/voiceless819/ebook](https://github.com/voiceless819/ebook)

---

## Características y Suite de Funcionalidades

### 1. Visor y Física 3D del Libro
* **Arrastre interactivo de esquina (Peel/Curl):** Arrastre de esquina con el ratón o el dedo con deformación continua en tiempo real y paso automático al soltar tras superar el umbral.
* **Grosor dinámico del lomo y papel:** Grosor del lomo y del apilado lateral de hojas proporcional al volumen real de páginas del documento y al progreso de lectura.
* **Vista de pájaro en cuadrícula (Grid Overview):** Galería a pantalla completa de todas las páginas en miniatura para navegación visual instantánea con un clic (`[G]`).
* **Modo scroll continuo vertical:** Tercer modo de lectura fluida vertical con renderizado perezoso (lazy-loading) mediante `IntersectionObserver`.
* **Sombra reactiva con giroscopio:** Proyección de sombras y pliegues según la inclinación física del dispositivo móvil o tableta (`deviceorientation`) y luz dinámica con el ratón en escritorio.
* **Zoom con lupa de aumento flotante:** Lente circular flotante de 150px con aumento de 2.5x para examinar detalles finos sin distorsionar la página.
* **Modo presentación automática (Slideshow):** Avance cronometrado configurable para lectura o exposición continua sin tocar la pantalla.
* **Modo solo libro (Full Book Solo Mode):** Maximización del libro a 100vw / 100vh ocultando completamente la interfaz para lectura zen sin distracciones (`[Z]`).

### 2. Catálogo Personal y Almacenamiento Local (IndexedDB)
* **Colecciones y etiquetas personalizables:** Categorización por carpetas o etiquetas (*Estudio*, *Trabajo*, *Lectura rápida*) con filtros rápidos.
* **Vistas de estantería:** Alternancia entre cuadrícula de tarjetas con portadas y tabla compacta detallada.
* **Filtros y ordenación avanzada:** Ordenación por último acceso, título, tamaño de archivo, número de páginas y porcentaje completado.
* **Búsqueda transversal en toda la biblioteca:** Búsqueda global que localiza términos en títulos, autores y fragmentos de texto en todos los libros guardados.
* **Edición de metadatos:** Modificación directa de título, autor y etiquetas desde la tarjeta del documento.
* **Estadísticas globales de lectura:** Métricas de tiempo total acumulado de lectura, total de documentos y libros terminados.
* **Papelera de reciclaje local:** Los documentos eliminados se conservan en la papelera durante 7 días con opción de restauración antes de purgarse.

### 3. Herramientas de Estudio y Anotaciones
* **Subrayador multicolor:** Subrayado de texto en 5 tonos pastel (*amarillo*, *menta*, *lavanda*, *cian*, *rosa*) guardados localmente.
* **Notas adhesivas con coordenadas exactas:** Chinchetas interactivas fijadas en puntos porcentuales específicos de la página.
* **Modo dibujo libre con Stylus / Ratón:** Capa de anotación a mano alzada con detección de Apple Pencil / S-Pen, grosor ajustable, borrador y **rechazo de palma (Palm Rejection)**.
* **Tira lateral de miniaturas sincronizadas:** Barra lateral plegable que sigue el avance de lectura en tiempo real.
* **Comparador de dos páginas no consecutivas:** Pantalla dividida para contrastar el cuerpo de texto con anexos, tablas o bibliografía.
* **Exportación académica de citas:** Formateo automático de fragmentos seleccionados en estándares APA 7ª ed., MLA 9ª ed. y Chicago 17ª ed.
* **Modo examen / tarjetas (Flashcards):** Conversión de citas y notas en tarjetas interactivas de memorización con giro 3D.

### 4. Filtros Visuales, Tipografía y Ergonomía
* **Filtro de luz azul / Temperatura de color:** Deslizador para teñir la pantalla en ámbar cálido para lectura nocturna.
* **Modo alto contraste para textos escaneados:** Filtro que blanquea fondos grisáceos y realza la legibilidad de documentos antiguos.
* **Inversión inteligente en modo oscuro:** Invierte textos y fondos pero preserva los colores naturales en imágenes y fotografías.
* **Regla de lectura flotante (Reading Ruler):** Guía horizontal que sigue el puntero o el dedo para no perder la línea.
* **Separación silábica automática (Hyphenation):** Guiones silábicos justificados en modo texto continuo.
* **Carga de fuentes locales:** Soporte para cargar y usar tipografías `.ttf` o `.woff2` del usuario mediante la API `FontFace`.
* **Ajuste continuo de márgenes:** Control milimétrico de la anchura de caja de texto.
* **Atenuación bajo mínimo:** Capa de reducción de brillo por debajo del mínimo del sistema operativo para oscuridad total.
* **Respuesta háptica:** Vibraciones milimétricas (`navigator.vibrate`) en giros de página y acciones en dispositivos compatibles.
* **Bloqueo de orientación:** Fijación de orientación vertical u horizontal desde la aplicación.
* **Modo a una mano:** Base flotante en la esquina inferior con botones ergonómicos al alcance del pulgar.
* **Gestos multitáctiles:** Toque con dos dedos para retroceder página y toque con tres dedos para reiniciar zoom.

### 5. Exportación y Transferencia
* **Generador de portadas para EPUB:** Editor con 4 plantillas sobrias (*Minimalista*, *Clásico Editorial*, *Técnico Cuadrícula*, *Monolito Gráfico*).
* **Exportación de rangos específicos:** Descarga de extractos acotados (ej. pág. 10 a 25) en Markdown o EPUB.
* **Modo impresión para ahorro de tinta:** Formato monocromo limpio sin texturas ni sombras 3D listo para imprimir (`Ctrl + P`).
* **Transferencia rápida mediante código QR:** Generación de código QR en pantalla para abrir el documento y página en móvil o tableta sin cables.
* **Formatos completos:** EPUB 3.0, Flipbook HTML autónomo, Markdown estructurado (.md), Texto plano (.txt) e Informe de anotaciones.

---

## Estructura del Repositorio

```text
├── index.html              # Interfaz y estructura HTML5
├── manifest.json           # Manifiesto PWA para instalación móvil
├── sw.js                   # Service Worker para funcionamiento offline
├── .nojekyll               # Configuración para GitHub Pages
├── .gitignore              # Filtro de archivos locales
├── .github/workflows/
│   └── deploy.yml          # Flujo de despliegue automatizado en GitHub Pages
├── css/
│   └── styles.css          # Estilos visuales, 3D y diseño responsive
├── js/
│   ├── app.js              # Coordinador central de la aplicación
│   ├── storage.js          # IndexedDB, colecciones, papelera y estadísticas
│   ├── flipbook.js         # Motor 3D, grosor de lomo, arrastre de esquina y sombras
│   ├── study-tools.js      # Regla, lupa, cuadrícula, comparador, flashcards y slideshow
│   ├── drawing.js          # Capa de dibujo libre con rechazo de palma (Apple Pencil/Stylus)
│   ├── cover-generator.js  # Diseñador de portadas sobrias para EPUB
│   ├── quick-share.js      # Código QR puro, háptica, orientación y modo a una mano
│   ├── annotations.js      # Subrayado multicolor, notas exactas y citas APA/MLA
│   ├── pdf-engine.js       # Renderizado de PDF bajo demanda (lazy-loading)
│   ├── reflow-reader.js    # Lector de texto continuo y lectura biónica
│   ├── epub-engine.js      # Empaquetador EPUB 3.0
│   ├── exporter.js         # Exportador de rangos, HTML autónomo y Markdown
│   ├── audio.js            # Síntesis acústica de pase de página y ruido ambiental
│   ├── tts.js              # Motor Text-to-Speech
│   ├── gestures.js         # Gestos multitáctiles (swipe, pinch zoom, 2/3 dedos)
│   └── demo-book.js        # Manual de usuario técnico inicial
└── vendor/
    ├── pdf.min.js          # Librería PDF.js
    ├── pdf.worker.min.js   # Worker de procesamiento de PDF
    └── jszip.min.js        # Librería de compresión ZIP
```
