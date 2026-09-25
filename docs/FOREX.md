# Forex Intelligence

## Escopo
O módulo Forex foi adicionado sem remover o dashboard, APIs B3/BCB/CVM, laboratório ou backtests já existentes.

## Cobertura
- majors
- minors
- exóticos
- catálogo local de pares mais negociados
- sincronização futura com a lista exata de instrumentos do provedor configurado

A expressão "todos os pares" depende do provedor/corretora: nem todo cruzamento ISO é negociável. Em produção, a fonte autorizada passa a ser a autoridade da lista.

## Análise técnica automática
- estrutura de tendência de alta/baixa/lateral
- EMA 9/21/50
- SMA 20/50
- RSI
- MACD
- ADX
- ATR
- Bollinger
- VWAP quando volume/tick volume existe
- volume relativo
- Estocástico
- CCI
- ROC
- Williams %R
- Donchian
- Ichimoku
- pivôs
- suporte e resistência por swings
- pullback em tendência
- retrações de Fibonacci
- volatilidade realizada

## Notícias
O endpoint /api/forex/news consulta notícias globais recentes via GDELT, sem chave, e gera um indicador de risco. A camada deve ser combinada com fontes oficiais de bancos centrais para eventos de política monetária.

## Dados 24h
Para candles intradiários 24h em dias úteis, o backend aceita:
- OANDA REST v20 (opcional, exige token)
- Twelve Data (opcional, exige API key conforme plano)
- CSV/JSON importado sem credenciais

Sem um feed intradiário, o sistema não inventa candles.

## Efetividade
A ferramenta calcula:
- win rate
- profit factor
- payoff
- expectancy
- drawdown
- quantidade de sinais

A meta de 99% não é gravada como garantia. O valor exibido é sempre o resultado observado no histórico usado no teste e deve ser confirmado com forward test.

## Endpoints
GET /api/forex/pairs
GET /api/forex/news?pair=EUR%2FUSD&hours=24
POST /api/forex/analyze
POST /api/forex/backtest

## Tela
/forex
