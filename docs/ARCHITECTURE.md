# Arquitetura de produção

## Serviços

1. **Market Gateway**
   - Conecta B3/CME/provedores licenciados via streaming/REST.
   - Normaliza símbolos, timezone e qualidade do feed.
   - Detecta atraso, gaps, duplicidade e dados fora de faixa.

2. **Candle Builder**
   - Consolida ticks/trades em OHLCV de 1 minuto.
   - Deriva 5m/15m/1h/dia.
   - Mantém timestamp UTC e sessão de negociação.

3. **Feature Engine**
   - EMA, SMA, RSI, MACD, ATR, Bollinger, VWAP, ADX.
   - Volume relativo, realized volatility e regime.
   - Order flow somente se o feed contratado disponibilizar.

4. **Macro/Event Engine**
   - BCB, CVM, Fed/FRED e calendários oficiais.
   - Eventos têm janela de risco antes/depois da divulgação.
   - Séries respeitam a frequência original da fonte.

5. **Signal Engine**
   - Ensemble por regime de mercado.
   - COMPRA / VENDA / AGUARDAR.
   - Sempre retorna motivos, score, confiança e risco.
   - Confiança limitada e calibrada por validação histórica.

6. **Backtest + Validation**
   - Walk-forward e out-of-sample.
   - Sem look-ahead bias.
   - Custos, slippage e latência.
   - Métricas: win rate, payoff, expectancy, drawdown e profit factor.

7. **Alert Service**
   - Web Push/PWA imediatamente quando regra do usuário dispara.
   - WhatsApp somente via API oficial e templates/regras aplicáveis.
   - Resumo consolidado a cada 10 minutos.

8. **Multi-tenant API**
   - Cada recurso de usuário leva tenant_id.
   - Isolamento no banco e autorização no backend.
   - Credenciais de provedores ficam no servidor, nunca no navegador.

## Jobs

### A cada 1 minuto
- validar saúde de feeds
- fechar candle 1m
- recalcular features incrementais
- classificar regime
- gerar sinais
- persistir snapshot e auditoria
- disparar alerta se cruzar limiar

### A cada 10 minutos
- consolidar sinais
- destacar mudanças de regime
- listar ativos com maior confluência
- listar eventos de risco
- calcular performance recente
- entregar relatório no canal configurado

## Segurança

- MFA para administradores
- segredo por ambiente
- criptografia de tokens sensíveis
- rate limit por tenant
- logs imutáveis de sinal
- trilha de auditoria
- nenhum token de corretora no client-side

## Execução de ordens

Manter desacoplada da análise. Antes de habilitar trading automático:
- usar apenas API oficial/autorizada da corretora;
- validar permissões, termos e controles de risco;
- exigir limite de perda, limite de posição, kill switch e confirmação configurável;
- paper-trading obrigatório antes de produção.
