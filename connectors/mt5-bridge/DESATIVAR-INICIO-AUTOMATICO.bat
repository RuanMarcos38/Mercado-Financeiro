@echo off
setlocal
title MercadoAI - Desativar AutoInicio

set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "TARGET=%STARTUP%\MercadoAI-MT5-AutoLogin.cmd"

if exist "%TARGET%" del /f /q "%TARGET%"

if exist "%TARGET%" (
  echo Nao foi possivel remover o inicio automatico.
) else (
  echo Inicio automatico removido com sucesso.
)
echo.
pause
