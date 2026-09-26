@echo off
setlocal
title MercadoAI - Ativar AutoInicio
cd /d "%~dp0"

set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "TARGET=%STARTUP%\MercadoAI-MT5-AutoLogin.cmd"

echo @echo off>"%TARGET%"
echo cd /d "%~dp0">>"%TARGET%"
echo call "%~dp0INICIAR-AUTOLOGIN-MT5.bat">>"%TARGET%"

if exist "%TARGET%" (
  echo.
  echo Inicio automatico configurado com sucesso.
  echo Arquivo criado em:
  echo %TARGET%
  echo.
  echo O MercadoAI MT5 Bridge sera iniciado automaticamente no login do Windows.
) else (
  echo.
  echo ERRO: nao foi possivel criar o inicio automatico.
)
echo.
pause
