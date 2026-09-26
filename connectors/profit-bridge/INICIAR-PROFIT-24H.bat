@echo off
setlocal
title MercadoAI - Profit 24H
cd /d "%~dp0"

set "PYTHONW="
for /f "delims=" %%P in ('where pythonw 2^>nul') do if not defined PYTHONW set "PYTHONW=%%P"

if not defined PYTHONW (
  echo Python nao encontrado.
  pause
  exit /b 1
)

start "" /min "%PYTHONW%" "%~dp0bridge.py"
exit /b 0
