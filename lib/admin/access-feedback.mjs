export function effectiveAccessStatus(value) {
  if (!["active", "suspended", "revoked"].includes(value)) {
    throw new Error("O banco não retornou um estado de acesso válido.")
  }
  return value
}

export function normalizeBlockReason(value) {
  const reason = typeof value === "string" ? value.trim() : ""
  if (reason.length < 3 || reason.length > 500) {
    throw new Error("Informe um motivo entre 3 e 500 caracteres.")
  }
  return reason
}

export function manualAccessMessage(requested, effective) {
  effectiveAccessStatus(effective)
  if (effective === "active") {
    return requested === "active"
      ? "Concessão manual ativa. Acesso ao curso liberado."
      : "Concessão manual atualizada. O acesso continua ativo por uma compra Hotmart válida."
  }
  if (requested === "active") {
    return "Concessão manual ativa, mas o bloqueio administrativo continua impedindo o acesso."
  }
  return `Concessão manual atualizada. Acesso efetivo ${effective === "suspended" ? "suspenso" : "revogado"}; o curso permanece indisponível.`
}

export function blockAccessMessage(blocked, effective) {
  effectiveAccessStatus(effective)
  if (blocked) return "Bloqueio administrativo aplicado a este curso. Compras e progresso foram preservados."
  return effective === "active"
    ? "Bloqueio removido. Acesso restaurado pelos direitos válidos existentes."
    : "Bloqueio removido, mas não há direito ativo. O curso continua sem acesso."
}
