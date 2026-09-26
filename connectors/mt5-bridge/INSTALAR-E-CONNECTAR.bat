@echo off
setlocal EnableExtensions EnableDelayedExpansion
title MercadoAI - Instalador MT5 Completo
cd /d "%~dp0"

echo.
echo ==================================================
echo   MERCADOAI - INSTALACAO AUTOMATICA MT5 BRIDGE
echo ==================================================
echo.

set "PY_CMD="
where py >nul 2>nul
if %errorlevel%==0 set "PY_CMD=py -3"

if not defined PY_CMD (
  where python >nul 2>nul
  if %errorlevel%==0 (
    python --version >nul 2>nul
    if %errorlevel%==0 set "PY_CMD=python"
  )
)

if not defined PY_CMD (
  where winget >nul 2>nul
  if %errorlevel%==0 (
    echo Python nao encontrado. Instalando Python 3.11...
    winget install -e --id Python.Python.3.11 --accept-package-agreements --accept-source-agreements
    echo.
    echo Python instalado. Feche esta janela e execute este arquivo novamente.
    pause
    exit /b 0
  ) else (
    echo Python e winget nao foram encontrados.
    echo Instale Python 3.11+ marcando Add Python to PATH.
    pause
    exit /b 1
  )
)

echo Python detectado:
%PY_CMD% --version
echo.

if not exist ".env" copy ".env.example" ".env" >nul

set /p "NEWKEY=Cole a NOVA chave do MercadoAI (mai_...): "
if "%NEWKEY%"=="" (
  echo Chave nao informada.
  pause
  exit /b 1
)
echo %NEWKEY% | findstr /b "mai_" >nul
if errorlevel 1 (
  echo A chave precisa comecar com mai_
  pause
  exit /b 1
)

set "MT5PATH="
for %%P in (
  "C:\Program Files\MetaTrader 5\terminal64.exe"
  "C:\Program Files\MetaTrader 5\metatrader64.exe"
  "C:\Program Files (x86)\MetaTrader 5\terminal64.exe"
) do (
  if exist %%P if not defined MT5PATH set "MT5PATH=%%~P"
)

if not defined MT5PATH (
  echo.
  echo Nao encontrei o executavel do MT5 nos caminhos padrao.
  set /p "MT5PATH=Digite o caminho completo do terminal64.exe: "
)

if not exist "%MT5PATH%" (
  echo.
  echo Executavel MT5 nao encontrado em:
  echo %MT5PATH%
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$p='.env'; $c=Get-Content $p -Raw; " ^
  "$c=[regex]::Replace($c,'(?m)^CONNECTOR_INGEST_KEY=.*$','CONNECTOR_INGEST_KEY=%NEWKEY%'); " ^
  "$c=[regex]::Replace($c,'(?m)^MT5_TERMINAL_PATH=.*$','MT5_TERMINAL_PATH=%MT5PATH:\=\\%'); " ^
  "Set-Content -Path $p -Value $c -Encoding ASCII"

echo.
echo Instalando dependencias...
%PY_CMD% -m pip install --upgrade pip
%PY_CMD% -m pip install -r requirements.txt
if errorlevel 1 (
  echo Falha ao instalar dependencias.
  pause
  exit /b 1
)

echo.
echo Abrindo MetaTrader 5...
start "" "%MT5PATH%"
timeout /t 12 /nobreak >nul

echo.
echo Testando conexao...
%PY_CMD% diagnose.py
if errorlevel 1 (
  echo.
  echo O teste falhou.
  echo Confirme que o MT5 esta aberto e conectado em uma conta DEMO ou REAL.
  pause
  exit /b 1
)

echo.
echo Criando inicializacao automatica no Windows...
schtasks /Create /F /SC ONLOGON /RL LIMITED /TN "MercadoAI MT5 Bridge" /TR "\"%~dp0INICIAR-MT5.bat\"" >nul 2>nul

echo.
echo ==================================================
echo  INSTALACAO CONCLUIDA
echo ==================================================
echo O bridge sera iniciado automaticamente no logon.
echo Voce pode iniciar agora executando INICIAR-MT5.bat
echo.
pause
