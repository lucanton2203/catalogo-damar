@echo off
chcp 65001 >nul
echo ==========================================
echo   INICIAR SERVIDOR - Catalogo DAMAR
echo ==========================================
echo.

:: Detectar y matar proceso de Node del servidor anterior
echo [1/3] Deteniendo servidor viejo (si esta corriendo)...
taskkill /F /IM node.exe >nul 2>&1
echo.

:: Cambiar a la carpeta del proyecto
cd /d "C:\Users\Luciano\Downloads\app catalogo"
if %errorlevel% neq 0 (
    echo ERROR: No se pudo acceder a la carpeta del proyecto
    pause
    exit /b 1
)

echo [2/3] Iniciando servidor...
echo.
echo El servidor se abrira en: http://localhost:3000
echo.
echo IMPORTANTE: NO CIERRES ESTA VENTANA
echo Mientras esta ventana este abierta, el servidor funciona.
echo.
echo ==========================================

:: Iniciar el servidor
node server.js

:: Si se cierra, esperar para no cerrar la ventana inmediatamente
echo.
echo Servidor detenido.
pause
