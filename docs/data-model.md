# Modelo de Dados SQLite (lia.db)

## Schema
O banco SQLite `<LIA_DATA_DIR>/database/lia.db` contém as seguintes tabelas:

### Autenticação (Better Auth)
- `user`: Usuários cadastrados (ID, nome, email, timestamps).
- `session`: Sessões ativas (token, userId, expiresAt).
- `account`: Vinculações OAuth e credenciais.
- `verification`: Tokens de verificação.

### Domínio da Aplicação
- `profile`: Perfil profissional do usuário (`user_id` UNIQUE).
- `resumes`: PDFs de currículo (`sha256` UNIQUE, `storage_filename`, `is_active`).
- `jobs`: Vagas encontradas (`content_hash`, `source_url`, `fit`, `score`).
- `applications`: Candidaturas vinculadas (`user_id`, `job_id`, `resume_id`, `status`).
- `application_events`: Histórico de alteração de candidaturas.
- `agent_run`: Registros de execuções de IA e consumo de tokens.
