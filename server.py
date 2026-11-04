#!/usr/bin/env python3
"""
LuminaBook — Servidor Local y Lanzador
Inicia un servidor HTTP local y abre automáticamente la aplicación en el navegador predeterminado.
"""

import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Enable CORS and Cache headers for smooth local development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

def run_server():
    port = PORT
    max_retries = 10
    httpd = None

    for i in range(max_retries):
        try:
            httpd = socketserver.TCPServer(("", port), Handler)
            break
        except OSError:
            print(f"[!] Puerto {port} ocupado, probando {port + 1}...")
            port += 1

    if not httpd:
        print("[X] No se pudo encontrar un puerto disponible.")
        sys.exit(1)

    url = f"http://localhost:{port}"
    print("=" * 60)
    print("  📖 LUMINA BOOK — VISUALIZADOR Y CONVERSOR DE PDF A EBOOK")
    print("=" * 60)
    print(f"  Servidor iniciado en: {url}")
    print("  Directorio activo   :", DIRECTORY)
    print("  Presiona CTRL + C para detener el servidor.")
    print("=" * 60)

    try:
        webbrowser.open(url)
    except Exception as e:
        print(f"Aviso: abre manualmente {url} en tu navegador.")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido. ¡Hasta pronto!")
        httpd.server_close()

if __name__ == '__main__':
    run_server()
