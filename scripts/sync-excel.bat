@echo off
chcp 65001 >nul
echo ==========================================
echo   SYNC EXCEL - CATALOGO DAMAR
echo ==========================================
echo.

:: Ir a la carpeta del proyecto
pushd "C:\Users\Luciano\Downloads\app catalogo"
if %errorlevel% neq 0 (
    echo ERROR: No se pudo acceder a la carpeta del proyecto
    echo Ruta: C:\Users\Luciano\Downloads\app catalogo
    pause
    exit /b 1
)

echo [1/4] Preparando Excel...
git add data/productos.xlsx
echo.

echo [2/4] Creando commit con cambios...
git commit -m "Actualizar precios y catalogo desde PC" --no-verify 2>nul
echo.

echo [3/4] Subiendo a GitHub...
echo Esto puede tardar unos segundos...
git push origin main
if %errorlevel% neq 0 (
    echo.
    echo ERROR: No se pudo subir a GitHub
    pause
    exit /b 1
)

popd
echo.
echo ==========================================
echo   i  SINCRONIZACION COMPLETA!
echo ==========================================
echo.
echo Tus cambios se estan aplicando en Render.
echo En 2-3 minutos estaran disponibles.
echo.
pause
