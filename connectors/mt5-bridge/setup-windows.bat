@echo off
title MercadoAI - Setup MetaTrader 5 Bridge
echo.
echo === MercadoAI - MetaTrader 5 Bridge ===
echo.
where python >nul 2>nul
if errorlevel 1 (
  echo Python nao encontrado. Instale Python 3.11+ e marque Add Python to PATH.
  pause
  exit /b 1
)
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
if not exist .env (
  copy .env.example .env >nul
  echo.
  echo Arquivo .env criado.
  echo Edite CONNECTOR_INGEST_KEY antes de iniciar.
)
echo.
echo Setup concluido.
pause
