# EasyPanel — Mercado-Financeiro

## Source
- Type: GitHub
- Repository: RuanMarcos38/Mercado-Financeiro
- Branch: main
- Build Path: /
- Builder: Dockerfile
- Dockerfile: Dockerfile
- Internal port: 3000

## Domain
Add this domain to the App service:

mercadoia.rrestrategiaperformance.com.br

Enable HTTPS/Let's Encrypt after DNS resolves to the EasyPanel server.

## Healthcheck
GET /api/health

## Required production environment
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
DATABASE_URL=
REDIS_URL=

CONNECTOR_INGEST_KEY=
AUTOTRADE_ADMIN_KEY=
AUTOTRADE_LIVE_ENABLED=false

## Optional providers
B3_MARKET_DATA_URL=
B3_MARKET_DATA_TOKEN=
B3_UP2DATA_URL=
B3_UP2DATA_TOKEN=
CME_API_URL=
CME_API_KEY=
FRED_API_KEY=
OANDA_API_TOKEN=
OANDA_ACCOUNT_ID=
TWELVE_DATA_API_KEY=
META_WHATSAPP_TOKEN=
META_WHATSAPP_PHONE_NUMBER_ID=
WEB_PUSH_VAPID_PUBLIC_KEY=
WEB_PUSH_VAPID_PRIVATE_KEY=
BROKER_API_URL=
BROKER_API_KEY=

## Security
- Do not place secrets in GitHub.
- Keep AUTOTRADE_LIVE_ENABLED=false until Paper/forward tests are approved.
- CONNECTOR_INGEST_KEY must match the local MT5/Profit bridge.
