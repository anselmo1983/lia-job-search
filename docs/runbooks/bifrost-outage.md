# Runbook — Indisponibilidade do Bifrost (CT109)

## Sintoma
Falha na inferência de ranking, extração de perfil ou geração de respostas por IA.

## Ações
1. Verificar a conectividade com o gateway Bifrost no CT109.
2. Validar a presença da variável `BIFROST_VIRTUAL_KEY` em `runtime.env`.
3. Testar a rota de status `/api/inference/status`.
