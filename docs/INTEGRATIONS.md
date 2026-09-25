# Integração MetaTrader 5 + ProfitDLL

O SaaS recebe dados locais das plataformas por uma API normalizada:

POST /api/connectors/market-push

A análise usa o mesmo motor já existente:
- Forex: /api/connectors/analyze?source=mt5&symbol=EUR%2FUSD&timeframe=5m
- B3: /api/connectors/analyze?source=profit&symbol=PETR4&timeframe=1m
- Status: /api/connectors/status
- Painel: /integracoes

## Segurança

Defina no backend:

CONNECTOR_INGEST_KEY=<chave forte>

Use a mesma chave no computador local do bridge.

Em produção, CONNECTOR_INGEST_KEY é obrigatório. O endpoint rejeita pushes sem a chave.

## MetaTrader 5

O bridge usa o pacote oficial MetaTrader5 para Python e conecta ao terminal instalado no computador.

1. Abra e autentique o MetaTrader 5.
2. Instale Python.
3. Entre em connectors/mt5-bridge.
4. Execute:
   pip install -r requirements.txt
5. Configure as variáveis de .env.example no ambiente.
6. Execute:
   python bridge.py

O bridge:
- conecta ao terminal;
- seleciona os símbolos;
- lê ticks;
- lê OHLC/tick volume;
- envia candles periodicamente ao SaaS;
- não envia ordens.

## Profit / ProfitDLL

O bridge usa o modelo oficial da ProfitDLL:
- DLLInitializeMarketLogin
- TStateCallback
- SetTradeCallbackV2
- TranslateTrade
- SubscribeTicker
- UnsubscribeTicker
- DLLFinalize

Pré-requisitos:
1. licença ProfitDLL/DataFeed ativa;
2. ProfitDLL.dll compatível com a arquitetura do Python;
3. chave de ativação;
4. usuário e senha Nelogica;
5. ticker vigente e código da bolsa.

Para B3, não use código genérico de contrato na operação real. Use o contrato vigente conforme disponibilizado pela Nelogica/B3.

## Persistência

O stream core atual mantém um buffer em memória para desenvolvimento/servidor persistente. Para múltiplas instâncias/serverless, conecte Redis/Postgres usando REDIS_URL e DATABASE_URL antes de considerar produção horizontalmente escalável.

## Modo de segurança

Por padrão os bridges são Market Data/análise. Nenhum deles envia ordens automaticamente.
