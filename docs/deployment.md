# Deploy e Runtime do CT223

## Instalação e Execução via Docker Compose
O container `lia-job-search` executa em modo standalone.

```yaml
services:
  lia-job-search:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: lia-job-search
    restart: unless-stopped
    env_file:
      - runtime.env
    ports:
      - "127.0.0.1:3000:3000"
    volumes:
      - /opt/lia-job-search/data:/app/data
    security_opt:
      - "no-new-privileges:true"
```

## Variáveis Obrigatórias em `runtime.env`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `LJS_AUTH_ALLOWED_EMAILS`
- `BIFROST_VIRTUAL_KEY`
