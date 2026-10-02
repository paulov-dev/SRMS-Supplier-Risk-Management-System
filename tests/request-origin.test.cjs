const { test } = require("node:test")
const assert = require("node:assert/strict")

const {
  checkRequestOrigin,
} = require("../src/lib/request-origin.ts")

const publicOrigin = "https://srms.example.com"

const production = {
  NODE_ENV: "production",
  SRMS_ALLOWED_ORIGINS: publicOrigin,
}

function request(
  origin,
  url = "http://localhost:3000/api/risk/ai-analysis",
  extra = {}
) {
  return new Request(url, {
    method: "POST",
    headers: {
      ...(origin === undefined ? {} : { origin }),
      ...extra,
    },
  })
}

test("aceita o endereço público mesmo quando a URL do servidor é interna", () => {
  assert.equal(
    checkRequestOrigin(
      request(publicOrigin),
      production
    ).ok,
    true
  )
})

test("rejeita sites externos, subdomínios parecidos, protocolo e porta diferentes", () => {
  for (const origin of [
    "https://evil.example",
    "https://srms.example.com.evil.example",
    "https://other.srms.example.com",
    "http://srms.example.com",
    "https://srms.example.com:8443",
  ]) {
    const result = checkRequestOrigin(
      request(origin),
      production
    )

    assert.equal(result.ok, false)
    assert.equal(result.status, 403)
  }
})

test("rejeita Origin ausente, null, com credenciais, caminho ou valores múltiplos", () => {
  for (const origin of [
    undefined,
    "null",
    "https://user@srms.example.com",
    `${publicOrigin}/dashboard`,
    `${publicOrigin}, https://evil.example`,
  ]) {
    assert.equal(
      checkRequestOrigin(
        request(origin),
        production
      ).status,
      403
    )
  }
})

test("produção sem configuração ou com configuração inválida falha antes de liberar acesso", () => {
  assert.equal(
    checkRequestOrigin(
      request(publicOrigin),
      { NODE_ENV: "production" }
    ).code,
    "ORIGIN_CONFIG_MISSING"
  )

  for (const allowed of [
    "*",
    `${publicOrigin}/dashboard`,
    `${publicOrigin},`,
    `${publicOrigin}?x=1`,
  ]) {
    assert.equal(
      checkRequestOrigin(
        request(publicOrigin),
        {
          NODE_ENV: "production",
          SRMS_ALLOWED_ORIGINS: allowed,
        }
      ).code,
      "ORIGIN_CONFIG_INVALID"
    )
  }
})

test("aceita somente as origens enumeradas e normaliza barra final e porta padrão", () => {
  const config = {
    NODE_ENV: "production",
    SRMS_ALLOWED_ORIGINS:
      `${publicOrigin}:443/, https://srms-hml.example.com`,
  }

  assert.equal(
    checkRequestOrigin(
      request(publicOrigin),
      config
    ).ok,
    true
  )

  assert.equal(
    checkRequestOrigin(
      request("https://srms-hml.example.com"),
      config
    ).ok,
    true
  )
})

test("mantém desenvolvimento local e não usa cabeçalhos de proxy para autorizar", () => {
  assert.equal(
    checkRequestOrigin(
      request("http://localhost:3000"),
      { NODE_ENV: "development" }
    ).ok,
    true
  )

  assert.equal(
    checkRequestOrigin(
      request("https://evil.example"),
      { NODE_ENV: "development" }
    ).status,
    403
  )

  const forged = request(
    "https://evil.example",
    "http://localhost:3000",
    {
      host: "evil.example",
      "x-forwarded-host": "evil.example",
      "x-forwarded-proto": "https",
    }
  )

  assert.equal(
    checkRequestOrigin(forged, production).status,
    403
  )
})