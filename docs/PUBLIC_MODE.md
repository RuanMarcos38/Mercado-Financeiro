# Modo Público — sem credenciais comerciais

Este modo existe para tornar o SaaS utilizável antes da contratação de B3/CME.

## Fontes automáticas

### Banco Central do Brasil
- SGS / BCData
- Selic (ex.: série 432)
- IPCA (ex.: série 433)
- Outras séries podem ser adicionadas pelo código SGS

### CVM Dados Abertos
- cadastro de companhias
- documentos e dados regulatórios
- fatos e informações periódicas/eventuais conforme disponibilidade dos conjuntos

## Preço/candle sem feed comercial

Não é correto tratar uma página pública ou scraping não documentado como feed profissional da B3.

Por isso o sistema aceita OHLCV por CSV/JSON. Isso permite:
- WIN
- WDO
- PETR4
- VALE3
- ouro
- dólar
- qualquer ativo

Formato mínimo:
time,open,high,low,close,volume

O usuário pode exportar histórico de sua plataforma e analisar sem fornecer credenciais ao SaaS.

## APIs

GET /api/public/macro
GET /api/public/cvm/companies?q=petrobras
POST /api/analyze
POST /api/backtest

### Exemplo de análise
{
  "symbol":"WIN",
  "timeframe":"5m",
  "csv":"time,open,high,low,close,volume\n...",
  "sourceQuality":"imported",
  "macroBias":0.15,
  "newsRisk":0.2
}

## Limite técnico

Sem feed intradiário autorizado, o SaaS não deve afirmar que WIN/WDO estão sendo atualizados automaticamente a cada minuto. Ele pode recalcular a cada minuto os dados que recebeu, mas a atualidade depende da origem dos candles.

Quando B3/CME forem contratados, os mesmos módulos de indicadores, sinal e backtest continuam sendo usados.
