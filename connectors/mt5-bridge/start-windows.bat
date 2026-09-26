@echo off
title MercadoAI - MetaTrader 5 Bridge
for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
  if not "%%A"=="" if not "%%A:~0,1%"=="#" set "%%A=%%B"
)
echo Iniciando MT5 Bridge em %SAAS_URL%
python bridge.py
pause
