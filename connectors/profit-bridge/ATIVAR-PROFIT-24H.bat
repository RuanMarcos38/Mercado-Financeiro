@echo off
setlocal
title MercadoAI - Ativar Profit 24H
cd /d "%~dp0"

set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "TARGET=%STARTUP%\MercadoAI-Profit-24H.cmd"

echo @echo off>"%TARGET%"
echo cd /d "%~dp0">>"%TARGET%"
echo call "%~dp0INICIAR-PROFIT-24H.bat">>"%TARGET%"

if exist "%TARGET%" (
  echo Profit 24H configurado para iniciar automaticamente com o Windows.
) else (
  echo Nao foi possivel configurar a inicializacao automatica.
)
pause
