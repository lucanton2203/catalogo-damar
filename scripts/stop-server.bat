@echo off
chcp 65001 >nul
echo ==========================================
echo   DETENER SERVIDOR - Catalogo DAMAR
echo ==========================================
echo.

taskkill /F /IM node.exe >nul 2>&1
echo ✅ Servidor detenido.
echo.
pause
