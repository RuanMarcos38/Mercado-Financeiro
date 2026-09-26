@echo off
title MercadoAI - Setup ProfitDLL Bridge
echo.
echo === MercadoAI - ProfitDLL Bridge ===
echo.
where python >nul 2>nul
if errorlevel 1 (
  echo Python nao encontrado. Instale Python 64-bit 3.11+ e marque Add Python to PATH.
  pause
  exit /b 1
)
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
if not exist .env (
  copy .env.example .env >nul
  echo.
  echo Arquivo .env criado.
  echo Configure PROFIT_DLL_PATH, PROFIT_ACTIVATION_KEY, PROFIT_USER,
  echo PROFIT_PASSWORD e CONNECTOR_INGEST_KEY.
)
echo.
echo Setup concluido.
pause
