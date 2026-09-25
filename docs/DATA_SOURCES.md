# Fontes de dados e política de precisão

## Regra principal

Nunca misturar "precisão do dado" com "taxa de acerto de sinal". O feed pode ser preciso e licenciado, mas o mercado continua probabilístico. A plataforma registra toda decisão e calcula win rate, payoff, drawdown, expectancy, profit factor e estabilidade fora da amostra.

## Brasil

### B3 Market Data
Uso: preço em tempo real, negócios, market depth/book, derivativos e instrumentos.
Produção: contratar feed/licença adequada para exibição e/ou redistribuição no SaaS.

### B3 UP2DATA
Uso: fechamento e dados de referência para renda variável, renda fixa, moedas e commodities.
Observação: não substituir feed intradiário de baixa latência por UP2DATA.

### Banco Central do Brasil
Uso: PTAX, câmbio oficial, Selic e séries macro via SGS/BCData.

### CVM
Uso: fatos relevantes, comunicados, ITR, DFP, dados cadastrais e dados abertos de companhias e fundos.

## Global

### CME Group Market Data APIs
Uso: futuros e opções globais, ouro, moedas, índices e estatísticas. Produção exige licença adequada para o uso/redistribuição.

### Federal Reserve / FRED
Uso: juros, atividade, inflação, condições financeiras, séries históricas e calendário de FOMC.

## IQ Option / corretoras

Não assumir endpoint privado ou API reversa como infraestrutura de produção. Implementar adaptador somente quando houver API oficial/autorizada e termos compatíveis. Caso contrário, o SaaS entrega análise e alerta sem executar ordens.

## Pipeline recomendado

1. Ingestão de tick/trades quando disponível.
2. Normalização de símbolos e timestamps em UTC.
3. Construção de candles 1m.
4. Armazenamento imutável dos OHLCV.
5. Features técnicas e de microestrutura.
6. Features macro/eventos/notícias.
7. Classificador de regime (trend/range/high-vol/low-vol).
8. Ensemble de estratégias por regime.
9. Geração de sinal explicável.
10. Auditoria e avaliação pós-sinal.

## Sinais

O score combina:
- tendência: EMA/SMA/ADX
- momentum: RSI/MACD
- preço relativo: VWAP/Bollinger
- volatilidade: ATR/realized vol
- volume: volume relativo e, quando licenciado, agressão/order-flow
- macro: juros, dólar, commodities, índices externos
- evento/notícia: penalização de confiança antes/depois de evento de alto impacto

## Atualização

- Market data: streaming quando contratado; agregação mínima de 1 minuto para a interface.
- Indicadores: recalculados no fechamento/incremento do candle.
- Dashboard: até 1 minuto.
- Relatório: job a cada 10 minutos.
- Dados macro: respeitar a periodicidade real da fonte; não inventar atualização a cada minuto para séries mensais/diárias.

## Multiusuário

Toda tabela de usuário/configuração/alerta deve conter tenant_id e usar isolamento por RLS/ACL. Nunca compartilhar watchlists, credenciais, alertas ou integrações entre tenants.
