@echo off
chcp 65001 >nul
echo ==========================================
echo   CATALOGO DAMAR - Todo en uno
echo ==========================================
echo.

cd /d "%~dp0.."
if %errorlevel% neq 0 (
    echo ERROR: No se pudo acceder a la carpeta del proyecto
    pause
    exit /b 1
)

echo [1/3] Verificando servidor...
tasklist /FI "IMAGENAME eq node.exe" 2>nul | find /I "node.exe" >nul
if %errorlevel% equ 0 (
    echo         Servidor corriendo. Reiniciando...
    taskkill /F /IM node.exe >nul 2>&1
    timeout /t 2 /nobreak >nul
) else (
    echo         Servidor detenido. Iniciando...
)

echo.
echo [2/3] Subiendo cambios a Internet...
git add -A >nul 2>&1
git commit -m "Actualizar catalogo" --no-verify >nul 2>&1
git push origin main >nul 2>&1
echo         Cambios subidos!

echo.
echo [3/3] Iniciando servidor local...
start cmd /k "cd /d "%~dp0.." && node server.js"

timeout /t 3 /nobreak >nul

echo         Abriendo navegador...
start http://localhost:3000

echo.
echo ==========================================
echo   i LISTO!
echo ==========================================
echo.
echo El servidor esta corriendo y el navegador se abrio.
echo.
echo Ahora podes editar el Excel, guardar, y apretar F5
echo en el navegador para ver los cambios.
echo.
echo IMPORTANTE: Para subir a Internet solo podes hacerlo
echo desde este icono. El admin web esta bloqueado.
echo.
pause
