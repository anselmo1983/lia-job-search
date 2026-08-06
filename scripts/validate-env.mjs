/**
 * scripts/validate-env.mjs
 *
 * Separação explícita entre validação de ambiente de Build e Runtime (Phase 2).
 *
 * Contrato de Build:
 *  - Não exige secrets nem credenciais reais de produção.
 *  - Valida apenas variáveis genuinamente necessárias para compilar.
 *  - NUNCA grava secrets na imagem.
 *
 * Contrato de Runtime:
 *  - Exige a presença de todas as credenciais/configurações críticas.
 *  - Executa ANTES da aplicação aceitar tráfego (startup/entrypoint).
 *  - Falha imediatamente (FAIL FAST) se alguma variável obrigatória estiver ausente.
 *  - Imprime a variável ausente no formato FATAL: <VAR_NAME> missing.
 *  - NUNCA imprime o valor de secrets.
 */

/**
 * @typedef {Object} EnvClassification
 * @property {string} name
 * @property {'BUILD_REQUIRED' | 'BUILD_OPTIONAL' | 'RUNTIME_REQUIRED' | 'RUNTIME_OPTIONAL' | 'PUBLIC_BUILD_VARIABLE'} classification
 * @property {string} description
 */

/** @type {Record<string, EnvClassification>} */
export const ENV_CATALOG = {
  BIFROST_VIRTUAL_KEY: {
    name: "BIFROST_VIRTUAL_KEY",
    classification: "RUNTIME_REQUIRED",
    description: "Chave virtual secreta do servidor de inferência CT109 Bifrost",
  },
  BIFROST_BASE_URL: {
    name: "BIFROST_BASE_URL",
    classification: "RUNTIME_REQUIRED",
    description: "URL base do servidor de inferência CT109 Bifrost",
  },
  GOOGLE_CLIENT_SECRET: {
    name: "GOOGLE_CLIENT_SECRET",
    classification: "RUNTIME_REQUIRED",
    description: "Secret credential para autenticação Google OAuth",
  },
  GOOGLE_CLIENT_ID: {
    name: "GOOGLE_CLIENT_ID",
    classification: "RUNTIME_REQUIRED",
    description: "Client ID para autenticação Google OAuth",
  },
  BETTER_AUTH_SECRET: {
    name: "BETTER_AUTH_SECRET",
    classification: "RUNTIME_REQUIRED",
    description: "Chave secreta de encriptação do Better Auth",
  },
  BIFROST_MODEL_DEFAULT: {
    name: "BIFROST_MODEL_DEFAULT",
    classification: "RUNTIME_OPTIONAL",
    description: "Modelo padrão para inferência no CT109",
  },
  BIFROST_MODEL_REVIEW: {
    name: "BIFROST_MODEL_REVIEW",
    classification: "RUNTIME_OPTIONAL",
    description: "Modelo de revisão para inferência no CT109",
  },
  LIA_DATA_DIR: {
    name: "LIA_DATA_DIR",
    classification: "RUNTIME_OPTIONAL",
    description: "Diretório de dados persistentes do container (/app/data)",
  },
  APP_COMMIT: {
    name: "APP_COMMIT",
    classification: "BUILD_OPTIONAL",
    description: "Hash/tag de commit da release (identidade exposta em /api/health)",
  },
  NODE_ENV: {
    name: "NODE_ENV",
    classification: "BUILD_OPTIONAL",
    description: "Modo de execução (production, development, test)",
  },
  PORT: {
    name: "PORT",
    classification: "RUNTIME_OPTIONAL",
    description: "Porta de escuta do servidor HTTP (padrão 3000)",
  },
  HOSTNAME: {
    name: "HOSTNAME",
    classification: "RUNTIME_OPTIONAL",
    description: "Interface de rede de escuta do servidor HTTP (padrão 0.0.0.0)",
  },
}

export function validateBuildEnv() {
  console.log("[validate-env] Validating BUILD environment contract...")

  const secretsInBuild = []
  for (const [key, item] of Object.entries(ENV_CATALOG)) {
    if (item.classification === "RUNTIME_REQUIRED" && process.env[key]) {
      secretsInBuild.push(key)
    }
  }

  if (secretsInBuild.length > 0) {
    console.warn(
      `[validate-env] WARNING: Secrets detected in build environment: ${secretsInBuild.join(
        ", "
      )}. Ensure secrets are not baked into the image.`
    )
  }

  console.log("[validate-env] BUILD environment validation PASS")
  return true
}

export function validateRuntimeEnv() {
  console.log("[validate-env] Validating RUNTIME environment contract...")

  const missing = []

  for (const [key, item] of Object.entries(ENV_CATALOG)) {
    if (item.classification === "RUNTIME_REQUIRED") {
      const val = process.env[key]
      if (!val || val.trim() === "") {
        missing.push(key)
      }
    }
  }

  if (missing.length > 0) {
    for (const key of missing) {
      console.error(`FATAL: ${key} missing`)
    }
    return false
  }

  console.log("[validate-env] RUNTIME environment validation PASS")
  return true
}

if (process.argv[1] && process.argv[1].includes("validate-env")) {
  const mode = process.argv[2] || "runtime"
  if (mode === "build") {
    const ok = validateBuildEnv()
    if (!ok) process.exit(1)
  } else if (mode === "runtime") {
    const ok = validateRuntimeEnv()
    if (!ok) process.exit(1)
  } else {
    console.error(`Usage: node scripts/validate-env.mjs <build|runtime>`)
    process.exit(1)
  }
}
