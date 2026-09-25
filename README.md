# Mercado Financeiro — SaaS de Inteligência de Mercado

Plataforma multiusuário para análise técnica, macroeconômica e de fluxo, com candles, alertas e motor de sinais explicável.

## Objetivo

Cobrir B3 (ações, WIN, WDO, futuros), ouro e futuros globais, câmbio, índices e ativos configuráveis. O sistema foi desenhado para atualização de mercado a cada 1 minuto e geração de resumos/alertas a cada 10 minutos.

> Importante: nenhum sistema sério pode garantir 99% de acerto ou lucro. A plataforma mede a acurácia real de cada estratégia por ativo, timeframe e regime de mercado, com backtest e validação walk-forward.

## Fontes recomendadas

- B3 Market Data/licenciados: cotações em tempo real, negócios, book e derivativos.
- B3 UP2DATA: fechamento e dados de referência.
- Banco Central do Brasil: PTAX e séries SGS.
- CVM: fatos relevantes, ITR/DFP e dados de companhias.
- CME Group: futuros e opções globais via APIs licenciadas.
- FRED/Federal Reserve: séries macroeconômicas, juros e calendário do FOMC.
- Adaptadores adicionais podem ser plugados sem alterar o motor de sinais.

## Módulos

- Dashboard multiativo em tempo real
- Candlestick 1m / 5m / 15m / 1h / diário
- RSI, MACD, EMA, SMA, ATR, Bollinger, VWAP, ADX
- Tendência, momentum, volatilidade e volume
- Suporte/resistência, pivôs e rompimentos
- Motor de confluência e score de confiança
- Calendário macro e impacto de eventos
- Alertas Compra / Venda / Aguardar
- Relatórios automáticos a cada 10 minutos
- Backtest, paper-trading e auditoria de sinais
- Multi-tenant / multiusuário

## Stack inicial

Next.js + TypeScript. O backend de produção deve usar PostgreSQL/Supabase, Redis e workers/filas para ingestão contínua.

## Rodar

```bash
npm install
npm run dev
```

Acesse http://localhost:3000.

## Status

MVP visual + motor de sinal demonstrativo. Conectores de mercado estão abstraídos para substituição por feeds reais/licenciados.


## Modo público sem credenciais comerciais

O projeto agora inclui um modo operacional que não depende de licenças B3/CME:

- Banco Central do Brasil/SGS automático
- CVM Dados Abertos automático
- importação CSV/JSON de candles OHLCV
- análise técnica completa
- classificação de regime
- COMPRA / VENDA / AGUARDAR com confiança calibrada pela qualidade da fonte
- backtest de sinais
- Laboratório Quantitativo em `/lab`

Endpoints:

- `GET /api/public/macro`
- `GET /api/public/cvm/companies?q=petrobras`
- `POST /api/analyze`
- `POST /api/backtest`

B3 e CME permanecem como conectores opcionais para ativação futura de streaming profissional.
