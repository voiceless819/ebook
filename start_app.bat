@echo off
title Ebook4u - Visor y Conversor 3D de PDF a eBook
echo ========================================================
echo   Iniciando Ebook4u...
echo ========================================================
python server.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Si no tienes python en PATH, abriendo directamente index.html...
    start index.html
)
pause
