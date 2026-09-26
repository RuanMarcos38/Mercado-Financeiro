@echo off
setlocal
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "TARGET=%STARTUP%\MercadoAI-Profit-24H.cmd"
if exist "%TARGET%" del /f /q "%TARGET%"
echo Inicializacao automatica do Profit removida.
pause
