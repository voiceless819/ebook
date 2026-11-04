# 📖 LuminaBook — Visualizador y Conversor de PDF a eBook 3D

> **LuminaBook** es una aplicación web estática, autónoma y táctil que transforma documentos PDF en una experiencia de lectura viva y humana, con capacidad de exportación a **EPUB 3.0 estándar**, **Flipbook HTML autónomo** y **Markdown**.
>
> 🚀 **100% Client-Side:** No requiere ningún backend, base de datos ni servidor. Funciona directamente en el navegador y está listo para ser alojado gratis en **GitHub Pages**.

---

## 🌐 Despliegue Inmediato en GitHub Pages (Sin Servidor)

Dado que **LuminaBook** es 100% estático (HTML5, CSS3, JS Vanilla), puedes publicarlo gratis en GitHub Pages en menos de 2 minutos:

### Paso 1: Crear el repositorio en GitHub
1. Ve a [GitHub](https://github.com/new) y crea un nuevo repositorio (por ejemplo, `luminabook` o `visualizador-pdf`).
2. Déjalo **Público** (para GitHub Pages gratuito).

### Paso 2: Subir el código desde tu equipo
Abre tu terminal en esta carpeta y ejecuta:
```bash
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

### Paso 3: Activar GitHub Pages
En la página de tu repositorio en GitHub:
1. Ve a **Settings** (Configuración) > pestaña **Pages** (en el menú lateral izquierdo).
2. En **Build and deployment** > **Source**:
   * Si eliges **GitHub Actions**: Ya dejamos listo el archivo `.github/workflows/deploy.yml` para desplegar automáticamente con cada push.
   * O si prefieres **Deploy from a branch**: Elige la rama `main` y la carpeta `/ (root)`, luego pulsa **Save**.
3. En unos segundos tu aplicación estará activa en:
   ```text
   https://TU_USUARIO.github.io/TU_REPOSITORIO/
   ```

¡Y listo! Ya puedes compartir ese enlace o abrirlo desde cualquier teléfono móvil, tablet u ordenador.

---

## 📱 Uso en Móviles y Tablets (PWA)
Una vez abierto en GitHub Pages desde Safari (iOS/iPadOS) o Chrome (Android):
1. Toca el botón **Compartir** o los **tres puntos** del navegador.
2. Selecciona **"Añadir a la pantalla de inicio"**.
3. La aplicación se instalará como una App nativa con pantalla completa, soporte táctil fluido y funcionamiento sin conexión a internet.

---

## ✨ Características Principales

### 1. 📚 Modo Libro 3D Realista (Flipbook)
* **Doble página en ordenador y tablet horizontal**: Reproduce la sensación de un libro abierto con lomo central y sombras de encuadernación.
* **Página simple en móviles y modo vertical**: Adaptación responsiva automática para lectura ergonómica con una sola mano.
* **Física y curvatura 3D**: Animación de giro de página con proyección de sombras que varían dinámicamente con el ángulo.
* **Esquinas interactivas (*Dog-Ear*)**: Al pasar el ratón o el dedo cerca de la esquina inferior, la hoja se comba invitando al paso.
* **Síntesis acústica de papel**: Efecto de sonido de fricción de papel generado en tiempo real con Web Audio API (100% offline, sin necesidad de archivos MP3 externos).

### 2. ⚡ Modo eBook Dinámico / Liquid Reflow Reader
* **Reflujo de texto adaptativo**: Convierte el PDF en texto líquido responsive como un Kindle o Apple Books.
* **Lectura Biónica (*Bionic Reading*)**: Resalta las primeras letras de cada palabra para acelerar la velocidad lectora y reducir la fatiga cognitiva.
* **Tipografías editoriales**: Serif clásica (Georgia/Merriweather), Sans moderna (Inter), OpenDyslexic (adaptada para dislexia) y Monoespaciada.
* **Control métrico**: Ajuste en vivo de tamaño de letra (14px - 32px), interlineado (1.4x - 2.4x) y márgenes.

### 3. 🎨 Estilo Humano y Ambientes Inmersivos
* **6 Temas de Papel**:
  * 📜 **Pergamino Clásico**: Tono sepia cálido reconfortante.
  * 📖 **Novela Marfil**: Fondo suave crema de edición de bolsillo.
  * ☀️ **Blanco Editorial**: Alto contraste y nitidez limpia.
  * 🌙 **Carbón Nocturno**: Fondo pizarra suave para leer en penumbra.
  * 🖤 **OLED Negro Puro**: Negro absoluto `#000000` para ahorrar batería en pantallas móviles AMOLED.
  * 📟 **E-Ink Paper**: Simulación de tinta electrónica de bajo brillo.
* **Paisajes Sonoros Ambientales**:
  * Generador procedural de Lluvia Suave, Silencio de Biblioteca y Café Acogedor con control de volumen independiente.

### 4. 📱 Controles Táctiles en Todos los Dispositivos
* **Deslizar / Swipe**: Pasa páginas arrastrando suavemente hacia la izquierda o derecha con detección de inercia.
* **Navegación por Zonas Táctiles**:
  * **Margen Izquierdo (20%)**: Retroceder página.
  * **Margen Derecho (20%)**: Avanzar página.
  * **Zona Central (60%)**: Ocultar/Mostrar barras de herramientas (modo de inmersión total sin distracciones).
* **Pellizco para Zoom (*Pinch-to-zoom*)**: Amplía cualquier gráfico o texto con dos dedos.
* **Doble Toque**: Restablece el zoom o encaja a pantalla completa.
* **Barra de navegación táctil inferior (*Scrubber*)**: Arrastra el control deslizante para desplazarte rápidamente por todo el volumen.

### 5. 🎧 Audiolibro con Voz Humana (Text-to-Speech)
* Lee en voz alta la página actual utilizando la síntesis de voz natural del sistema operativo.
* Selector de velocidad (0.8x, 1.0x, 1.2x, 1.5x).
* Resaltado dinámico frase a frase en una barra flotante estilizada.
* **Paso de página automático**: Al terminar de leer la página, avanza a la siguiente sin intervención manual.

### 6. 📦 Suite de Conversión y Exportación
* **📕 eBook EPUB 3.0 Estándar**: Empaqueta un archivo `.epub` 100% válido (con `mimetype` sin comprimir, `container.xml`, `content.opf`, `nav.xhtml`, `toc.ncx` e imagen de portada generada de la página 1). Compatible con Apple Books, Calibre, Kindle y Google Play Libros.
* **🌐 Flipbook HTML Autónomo**: Genera un archivo `.html` único y ligero con todo el contenido y visor 3D embebido. Puedes enviarlo por correo o WhatsApp y cualquiera puede abrirlo sin instalar nada.
* **📝 Markdown Editorial (.md)**: Extrae los títulos, capítulos y cuerpo de texto con formato limpio para Obsidian, Notion o blogs.
* **📄 Texto Plano (.txt)**: Transcripción completa y limpia.
* **🔖 Exportación de Notas y Marcadores**: Resumen descargable de todas tus reflexiones, citas y estadísticas de lectura.

---

## 💻 Ejecución Local Opcional (Si alguna vez la necesitas)
Si deseas probarlo localmente sin internet, puedes simplemente:
* Abrir directamente `index.html` en tu navegador.
* O si estás en Windows, hacer doble clic en `start_app.bat`.

---

## 📂 Estructura del Repositorio

```text
├── index.html              # Aplicación estática principal
├── manifest.json           # Manifiesto PWA para instalación móvil
├── sw.js                   # Service Worker (offline caching)
├── .nojekyll               # Desactiva el procesamiento Jekyll en GitHub Pages
├── .gitignore              # Ignora temporales del sistema
├── .github/
│   └── workflows/
│       └── deploy.yml      # Despliegue automatizado en GitHub Pages
├── css/
│   └── styles.css          # Estilos 3D, temas de lectura y responsive
├── js/
│   ├── app.js              # Orquestador general
│   ├── audio.js            # Síntesis procedural de sonido de papel y ambiente
│   ├── tts.js              # Audiolibro Text-to-Speech
│   ├── pdf-engine.js       # Renderizado HD y extracción con PDF.js
│   ├── epub-engine.js      # Empaquetador y lector de EPUB 3.0
│   ├── exporter.js         # Exportador a HTML autónomo, Markdown y notas
│   ├── flipbook.js         # Motor 3D del libro y física de giro
│   ├── reflow-reader.js    # Lector de texto líquido y lectura biónica
│   ├── gestures.js         # Controlador táctil (swipe, pinch zoom, toques)
│   ├── annotations.js      # Marcadores, notas, buscador y analíticas
│   └── demo-book.js        # Obra maestra ilustrada de demostración incluida
├── vendor/
│   ├── pdf.min.js          # Mozilla PDF.js
│   ├── pdf.worker.min.js   # Worker de procesamiento de PDF
│   └── jszip.min.js        # Compresor ZIP para empaquetar EPUBs
└── assets/
    ├── icon-192.png        # Icono PWA
    └── icon-512.png        # Icono PWA HD
```
