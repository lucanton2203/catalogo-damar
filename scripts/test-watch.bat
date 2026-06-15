@echo off
echo ==========================================
echo   PROBAR DETECCION DE EXCEL
echo ==========================================
echo.
echo Esto va a monitorear si el Excel cambia
echo Apreta Ctrl+C para detener
echo.

node -e "const fs=require('fs'); const p='C:/Users/Luciano/Downloads/app catalogo/data/productos.xlsx'; let last=0; function check(){ if(!fs.existsSync(p))return; const s=fs.statSync(p); const val=s.size+'_'+s.mtime.getTime(); if(val!==last){ if(last!==0)console.log('CAMBIO DETECTADO:', new Date().toLocaleTimeString()); last=val; } } check(); setInterval(check,1000); console.log('Monitoreando', p);"
