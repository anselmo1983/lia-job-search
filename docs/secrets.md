# Gestão de Segredos

## Armazenamento Seguro
Todos os segredos de produção são mantidos exclusivamente em `/opt/lia-job-search/runtime.env` no host (propriedade `root:root`, permissões `0600`).

## Proibições Estritas
1. **Nunca comitar segredos no Git**.
2. **Nunca passar segredos como `ARG` de build no Dockerfile**.
3. **Nunca expor chaves privadas em variáveis com pré-fixo `NEXT_PUBLIC_`**.
