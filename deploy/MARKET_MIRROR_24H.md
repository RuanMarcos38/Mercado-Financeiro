# Mercado Espelho 24h no EasyPanel

O Mercado Espelho mantém análise de mercado mesmo quando nenhum usuário está conectado ao MetaTrader 5 ou Profit.

## Arquitetura

Feed autorizado (OANDA/Twelve Data/B3)
-> worker market-mirror
-> /api/market-mirror/push
-> candles globais
-> motor de análise contínuo
-> oportunidades COMPRA / VENDA / AGUARDAR
-> Radar por empresa
-> navegador / WhatsApp

MT5 e Profit continuam opcionais por empresa para:
- conta individual;
- confirmação de dados;
- Paper;
- execução Live quando explicitamente habilitada.

## Criar segundo serviço no EasyPanel

Crie um novo App no mesmo projeto:

- Nome: mercado-mirror
- Fonte: GitHub
- Repositório: RuanMarcos38/Mercado-Financeiro
- Branch: main
- Build Path: /workers/market-mirror
- Dockerfile: Dockerfile
- Não precisa de domínio público.

## Variáveis do worker

SAAS_URL=https://mercadoia.rrestrategiaperformance.com.br
MARKET_WORKER_KEY=<chave forte igual à configurada no app principal>
MARKET_PROVIDER=oanda

OANDA_API_TOKEN=<token do feed>
OANDA_ENV=practice

# Alternativa:
TWELVE_DATA_API_KEY=

MARKET_PUSH_SECONDS=60
MARKET_REQUEST_DELAY=0.25
MARKET_MIRROR_PAIRS=EUR/USD,GBP/USD,USD/JPY,USD/CHF,AUD/USD,USD/CAD,NZD/USD,EUR/GBP,EUR/JPY,GBP/JPY,AUD/JPY,EUR/CHF,GBP/CHF,USD/BRL
MARKET_MIRROR_TIMEFRAMES=1m,5m,15m,1h

## Variáveis no app principal

MARKET_WORKER_KEY=<a mesma chave forte>

Para WhatsApp:
META_WHATSAPP_TOKEN=
META_WHATSAPP_PHONE_NUMBER_ID=
META_GRAPH_VERSION=v23.0
META_WHATSAPP_SIGNAL_TEMPLATE=
META_WHATSAPP_TEMPLATE_LANG=pt_BR

## Observações

- O worker não executa ordens.
- O feed central é separado das contas de corretora dos usuários.
- Para B3 intradiário/tempo real, use um feed B3/Profit DataFeed autorizado.
- A frequência real depende do provedor/plano e do horário de negociação do mercado.
- Alertas proativos no WhatsApp usam template aprovado.
