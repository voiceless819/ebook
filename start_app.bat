@echo off
title LuminaBook - Visor y Conversor 3D de PDF a eBook
echo ========================================================
echo   Iniciando LuminaBook...
echo ========================================================
python server.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Si no tienes python en PATH, abriendo directamente index.html...
    start index.html
)
pause
