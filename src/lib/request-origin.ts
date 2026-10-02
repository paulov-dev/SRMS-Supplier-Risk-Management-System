type OriginConfig = {
  NODE_ENV?: string
  SRMS_ALLOWED_ORIGINS?: string
}

type OriginResult =
  | { ok: true }
  | {
      ok: false
      status: 403 | 503
      error: string
      code: string
    }

function normalizeOrigin(value: string): string | null {
  const input = value.trim()

  if (!/^https?:\/\//i.test(input)) {
    return null
  }

  try {
    const url = new URL(input)

    if (
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return null
    }

    return url.origin
  } catch {
    return null
  }
}

export function checkRequestOrigin(
  request: Pick<Request, "url" | "headers">,
  config: OriginConfig = process.env
): OriginResult {
  const configured =
    config.SRMS_ALLOWED_ORIGINS?.trim()

  let allowed: string[]

  if (configured) {
    const parsed = configured
      .split(",")
      .map(normalizeOrigin)

    if (parsed.some(origin => origin === null)) {
      return {
        ok: false,
        status: 503,
        code: "ORIGIN_CONFIG_INVALID",
        error:
          "SRMS_ALLOWED_ORIGINS contém um endereço inválido. Configure apenas protocolo, domínio e porta, se necessária.",
      }
    }

    allowed = parsed as string[]
  } else if (
    config.NODE_ENV === "development" ||
    config.NODE_ENV === "test"
  ) {
    allowed = [new URL(request.url).origin]
  } else {
    return {
      ok: false,
      status: 503,
      code: "ORIGIN_CONFIG_MISSING",
      error:
        "Configure SRMS_ALLOWED_ORIGINS no servidor com o endereço público do SRMS.",
    }
  }

  const header = request.headers.get("origin")
  const origin = header
    ? normalizeOrigin(header)
    : null

  if (!origin || !allowed.includes(origin)) {
    return {
      ok: false,
      status: 403,
      code: "INVALID_ORIGIN",
      error: "Origem inválida.",
    }
  }

  return { ok: true }
}