# Trader Skill Pro — MercadoAI

## Objetivo
Camada de análise educacional e gestão de risco conectada ao motor existente do MercadoAI, sem substituir seus sinais nem executar ordens.

## Fontes
- Dados B3 via adaptador brapi existente, com atraso explicitamente identificado.
- Indicadores e regime calculados pelo motor `analyzeCandles` existente.
- Não inventar cotações nem interpretar horário de consulta como horário do preço.

## Protocolo de análise
1. Confirmar ativo, data/hora do último candle, qualidade da fonte e regime.
2. Verificar RSI, EMA, MACD, ADX, volume e volatilidade presentes no motor.
3. Mostrar sinal do motor apenas como cenário analítico; confiança é pontuação heurística, não probabilidade de lucro.
4. Bloquear qualquer indicação acionável quando candle estiver atrasado, indisponível ou faltarem candles.
5. Calcular risco financeiro por capital x risco%, diferença entre entrada e stop e quantidade teórica; validar tick, lote, custos, slippage e corretora antes de negociar.
6. Usar cenário AGUARDAR quando os dados não forem suficientes.
7. Nunca executar ordens automaticamente nem solicitar chaves privadas na interface.

## Restrições
Sem ordens reais, sem retorno garantido, sem recomendação personalizada, sem vazamento de dados entre usuários. Qualquer integração futura com MT5/Profit exige credenciais em segredo no servidor, autorização específica, paper trading, kill switch, limites por dia e testes.
