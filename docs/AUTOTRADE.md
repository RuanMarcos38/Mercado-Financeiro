# AI Trade Radar & AutoTrade

Nova camada adicionada sem remover o projeto existente.

## Fluxo
Market stream -> análise -> radar -> política de risco -> intenção de ordem -> bridge -> corretora/plataforma -> auditoria.

## Estados
- OFF: análise e alertas sem criação de ordem.
- PAPER: intenções automáticas são criadas e simuladas.
- LIVE: intenções podem chegar ao bridge real, mas somente se AUTOTRADE_LIVE_ENABLED=true no backend e o bridge local também estiver armado.

## Critérios
Por padrão:
- confiança >= 72%
- |score| >= 48
- risco de notícia <= 0.45
- spread <= limite
- feed <= 120s
- direção permitida
- stop por ATR
- alvo por R:R

## Endpoints
GET /api/autotrade/radar
GET/POST /api/autotrade/config
GET/POST /api/autotrade/intents
GET /api/autotrade/audit

## Segurança
Writes de configuração exigem AUTOTRADE_ADMIN_KEY em produção.
Bridges usam CONNECTOR_INGEST_KEY.
Live exige AUTOTRADE_LIVE_ENABLED=true.

## Precisão
A ferramenta não grava 99% como promessa. Mede win rate, profit factor, payoff, expectancy e drawdown em backtest/forward test e auditoria real.
