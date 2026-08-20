import { PrismaClient } from "@prisma/client"
import * as XLSX from "xlsx"
import * as fs from "fs"
import path from "path"

// Necessário para XLSX.readFile funcionar corretamente em ESM
XLSX.set_fs(fs)

const prisma = new PrismaClient()

type ExcelRow = Record<string, any>

// ======================================================
// ARQUIVOS
// ======================================================

const ACTIVE_FILE = path.join(
  process.cwd(),
  "prisma",
  "seed-data",
  "CW22.xlsx"
)

const CLOSED_FILE = path.join(
  process.cwd(),
  "prisma",
  "seed-data",
  "RISK MANAGEMENT PLAN - Concluidos.xlsx"
)

// ======================================================
// LEITURA DO EXCEL
// ======================================================

function readSheet(
  filePath: string,
  sheetName: string,
  range = 0
): ExcelRow[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Arquivo Excel não encontrado: ${filePath}`
    )
  }

  console.log(`Lendo arquivo: ${filePath}`)

  const workbook = XLSX.readFile(filePath)

  const sheet = workbook.Sheets[sheetName]

  if (!sheet) {
    throw new Error(
      `Aba "${sheetName}" não encontrada em ${filePath}. ` +
      `Abas disponíveis: ${workbook.SheetNames.join(", ")}`
    )
  }

  return XLSX.utils.sheet_to_json(sheet, {
    defval: null,
    range,
  }) as ExcelRow[]
}

// ======================================================
// FUNÇÕES AUXILIARES
// ======================================================

function clean(value: any) {
  if (value === null || value === undefined) {
    return null
  }

  const text = String(value).trim()

  if (!text || text === "-") {
    return null
  }

  return text
}

function normalizeText(value: any) {
  return clean(value)?.toLowerCase() ?? ""
}

function parseBooleanNullable(value: any) {
  const text = normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

  if (
    text === "sim" ||
    text === "yes" ||
    text === "true"
  ) {
    return true
  }

  if (
    text === "nao" ||
    text === "não" ||
    text === "no" ||
    text === "false"
  ) {
    return false
  }

  return null
}

function mapRiskLevel(value: any) {
  const text = normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

  if (text.includes("vermelho") || text === "red") {
    return "RED" as const
  }

  if (text.includes("amarelo") || text === "yellow") {
    return "YELLOW" as const
  }

  if (
    text.includes("verde") ||
    text.includes("azul") ||
    text === "green" ||
    text === "blue"
  ) {
    return "GREEN" as const
  }

  return "YELLOW" as const
}

function mapPartStatus(value: any) {
  const text = normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

  if (text.includes("vermelho") || text === "red") {
    return "RED" as const
  }

  if (text.includes("amarelo") || text === "yellow") {
    return "YELLOW" as const
  }

  if (text.includes("verde") || text === "green") {
    return "GREEN" as const
  }

  if (
    text.includes("laranja") ||
    text.includes("sem demanda") ||
    text === "orange"
  ) {
    return "ORANGE" as const
  }

  if (
    text.includes("cinza") ||
    text.includes("cancelado") ||
    text.includes("cancelada") ||
    text === "grey" ||
    text === "gray"
  ) {
    return "GREY" as const
  }

  if (
    text.includes("azul") ||
    text.includes("concluido") ||
    text.includes("concluído") ||
    text === "blue"
  ) {
    return "BLUE" as const
  }

  return "YELLOW" as const
}

function mapOpeningReason(value: any) {
  const text = normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

  if (
    text.includes("tier 2") ||
    text.includes("adicao de tier")
  ) {
    return "TIER_2_CHANGE" as const
  }

  if (
    text.includes("planta") ||
    text.includes("mudanca de planta")
  ) {
    return "PLANT_CHANGE" as const
  }

  if (
    text.includes("phase out") ||
    text.includes("transferencia de fornecedor")
  ) {
    return "SUPPLIER_TRANSFER_PHASE_OUT" as const
  }

  if (
    text.includes("processo") ||
    text.includes("fabricacao")
  ) {
    return "MANUFACTURING_PROCESS_CHANGE" as const
  }

  return "SUPPLIER_TRANSFER_PHASE_OUT" as const
}

function parseSequenceNumber(code: string) {
  const match = code.match(/\d+/)

  if (!match) {
    return 0
  }

  return Number(match[0])
}

function getCodePrefix(code: string) {
  return code.toUpperCase().startsWith("IRM")
    ? "IRM"
    : "RM"
}

function getCurrentIsoWeekYear() {
  const now = new Date()

  const date = new Date(
    Date.UTC(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    )
  )

  const dayNumber = date.getUTCDay() || 7

  date.setUTCDate(
    date.getUTCDate() + 4 - dayNumber
  )

  const yearStart = new Date(
    Date.UTC(date.getUTCFullYear(), 0, 1)
  )

  const week = Math.ceil(
    (
      (date.getTime() - yearStart.getTime()) /
        86400000 +
      1
    ) / 7
  )

  return {
    week,
    year: date.getUTCFullYear(),
  }
}

// ======================================================
// USUÁRIO DA SEED
// ======================================================

async function getSeedUserId() {
  const user = await prisma.user.findFirst({
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
    },
  })

  if (!user) {
    throw new Error(
      "Nenhum usuário encontrado. " +
      "Crie pelo menos um usuário antes de rodar a seed."
    )
  }

  return user.id
}

// ======================================================
// PAÍS
// ======================================================

async function getBrazilCountryId() {
  const country = await prisma.country.upsert({
    where: {
      isoCode: "BR",
    },
    create: {
      name: "Brasil",
      isoCode: "BR",
    },
    update: {
      name: "Brasil",
    },
    select: {
      id: true,
    },
  })

  return country.id
}

// ======================================================
// FORNECEDOR
// ======================================================

async function findOrCreateSupplier(
  name: string,
  countryId: string
) {
  const existing =
    await prisma.supplier.findFirst({
      where: {
        name,
      },
      select: {
        id: true,
      },
    })

  if (existing) {
    return existing.id
  }

  const supplier =
    await prisma.supplier.create({
      data: {
        name,
        supplierCodeSap: null,
        status: "ACTIVE",
        countryId,
      },
      select: {
        id: true,
      },
    })

  return supplier.id
}

// ======================================================
// SEQUENCE NUMBER
// ======================================================

const usedSequenceNumbers = new Set<number>()

let maxSequenceNumber = 0

async function loadUsedSequenceNumbers() {
  const risks =
    await prisma.riskEvent.findMany({
      select: {
        sequenceNumber: true,
      },
    })

  for (const risk of risks) {
    usedSequenceNumbers.add(
      risk.sequenceNumber
    )

    if (
      risk.sequenceNumber >
      maxSequenceNumber
    ) {
      maxSequenceNumber =
        risk.sequenceNumber
    }
  }
}

function reserveSequenceNumber(
  preferredSequenceNumber: number
) {
  if (
    preferredSequenceNumber > 0 &&
    !usedSequenceNumbers.has(
      preferredSequenceNumber
    )
  ) {
    usedSequenceNumbers.add(
      preferredSequenceNumber
    )

    if (
      preferredSequenceNumber >
      maxSequenceNumber
    ) {
      maxSequenceNumber =
        preferredSequenceNumber
    }

    return preferredSequenceNumber
  }

  maxSequenceNumber += 1

  while (
    usedSequenceNumbers.has(
      maxSequenceNumber
    )
  ) {
    maxSequenceNumber += 1
  }

  usedSequenceNumbers.add(
    maxSequenceNumber
  )

  return maxSequenceNumber
}

// ======================================================
// RISK EVENT
// ======================================================

async function findOrCreateRiskEvent(params: {
  code: string
  supplierId: string
  createdById: string

  openingReason:
    ReturnType<typeof mapOpeningReason>

  riskLevel:
    "GREEN" | "YELLOW" | "RED"

  workflowStatus:
    "OPEN" | "CLOSED" | "CANCELED"

  commodity: string | null
  title: string
  description: string | null
}) {
  const existing =
    await prisma.riskEvent.findUnique({
      where: {
        code: params.code,
      },
      select: {
        id: true,
      },
    })

  const { week, year } =
    getCurrentIsoWeekYear()

  /*
   * IMPORTANTE:
   * Só reservamos um novo sequenceNumber
   * quando realmente vamos criar uma RM.
   *
   * Isso evita consumir números
   * desnecessariamente quando a RM já existe.
   */
  if (existing) {
    const updated =
      await prisma.riskEvent.update({
        where: {
          id: existing.id,
        },
        data: {
          supplierId:
            params.supplierId,

          openingReason:
            params.openingReason,

          riskLevel:
            params.riskLevel,

          workflowStatus:
            params.workflowStatus,

          commodity:
            params.commodity,

          title:
            params.title,

          description:
            params.description,
        },
        select: {
          id: true,
        },
      })

    return updated.id
  }

  const preferredSequenceNumber =
    parseSequenceNumber(params.code)

  const sequenceNumber =
    reserveSequenceNumber(
      preferredSequenceNumber
    )

  const codePrefix =
    getCodePrefix(params.code)

  const risk =
    await prisma.riskEvent.create({
      data: {
        code:
          params.code,

        sequenceNumber,

        codePrefix,

        title:
          params.title,

        description:
          params.description,

        openingReason:
          params.openingReason,

        supplierId:
          params.supplierId,

        commodity:
          params.commodity,

        workflowStatus:
          params.workflowStatus,

        riskLevel:
          params.riskLevel,

        createdWeek:
          week,

        createdYear:
          year,

        createdById:
          params.createdById,
      },
      select: {
        id: true,
      },
    })

  return risk.id
}

// ======================================================
// PART NUMBER
// ======================================================

async function findOrCreatePartNumber(params: {
  partNumber: string
  description: string | null
  vehicleProgram: string | null
}) {
  const part =
    await prisma.partNumber.upsert({
      where: {
        partNumber:
          params.partNumber,
      },
      create: {
        partNumber:
          params.partNumber,

        description:
          params.description,

        vehicleProgram:
          params.vehicleProgram,
      },
      update: {
        description:
          params.description,

        vehicleProgram:
          params.vehicleProgram,
      },
      select: {
        id: true,
      },
    })

  return part.id
}

// ======================================================
// RISK EVENT PART
// ======================================================

async function findOrCreateRiskPart(params: {
  riskEventId: string
  partNumberId: string

  status:
    ReturnType<typeof mapPartStatus>

  assignedToId: string | null
}) {
  const existing =
    await prisma.riskEventPart.findFirst({
      where: {
        riskEventId:
          params.riskEventId,

        partNumberId:
          params.partNumberId,
      },
      select: {
        id: true,
      },
    })

  if (existing) {
    const updated =
      await prisma.riskEventPart.update({
        where: {
          id: existing.id,
        },
        data: {
          status:
            params.status,

          assignedToId:
            params.assignedToId,
        },
        select: {
          id: true,
        },
      })

    return updated.id
  }

  const riskPart =
    await prisma.riskEventPart.create({
      data: {
        riskEventId:
          params.riskEventId,

        partNumberId:
          params.partNumberId,

        status:
          params.status,

        logisticsStatus:
          "NOT_REQUESTED",

        assignedToId:
          params.assignedToId,
      },
      select: {
        id: true,
      },
    })

  return riskPart.id
}

// ======================================================
// RISK PLAN ATIVO
// ======================================================

async function seedActiveRiskPlan(
  createdById: string,
  countryId: string
) {
  console.log("")
  console.log(
    "Importando RMs ativas..."
  )

  const rows =
    readSheet(
      ACTIVE_FILE,
      "Risk Plan",
      3
    )

  console.log(
    `${rows.length} linhas encontradas em Risk Plan`
  )

  let imported = 0
  let skipped = 0

  for (const row of rows) {
    const code =
      clean(row["RMs"])

    const pn =
      clean(row["PN"])

    if (!code || !pn) {
      skipped++
      continue
    }

    const supplierName =
      clean(row["Fornecedor "]) ||
      "Fornecedor não informado"

    const supplierId =
      await findOrCreateSupplier(
        supplierName,
        countryId
      )

    const riskEventId =
      await findOrCreateRiskEvent({
        code,
        supplierId,
        createdById,

        openingReason:
          mapOpeningReason(
            row["Classificação"]
          ),

        riskLevel:
          mapRiskLevel(
            row["Status RM"]
          ),

        workflowStatus:
          "OPEN",

        commodity:
          clean(
            row["Comodity"]
          ),

        title:
          `${code} - ${supplierName}`,

        description:
          clean(
            row["Classificação"]
          ),
      })

    const partNumberId =
      await findOrCreatePartNumber({
        partNumber: pn,

        description:
          clean(
            row["Descrição"]
          ),

        vehicleProgram:
          null,
      })

    const riskPartId =
      await findOrCreateRiskPart({
        riskEventId,
        partNumberId,

        status:
          mapPartStatus(
            row["Status PN"]
          ),

        assignedToId:
          null,
      })

    await prisma.riskPartAssessment.upsert({
      where: {
        riskEventPartId:
          riskPartId,
      },

      create: {
        riskEventPartId:
          riskPartId,

        isPartCanceled:
          parseBooleanNullable(
            row["PN Cancelado"]
          ),

        hasDemand:
          parseBooleanNullable(
            row["PN Com demanda?"]
          ),

        sourceNamed:
          parseBooleanNullable(
            row["Fonte Nomeada"]
          ),

        actionPlanReceived:
          parseBooleanNullable(
            row[
              "Cronograma/Plano de Ação Recebido"
            ]
          ),

        scheduleMeetsDevelopment:
          parseBooleanNullable(
            row[
              "Cronograma Atende Desenvolvimento"
            ]
          ),

        technicalCommercialOk:
          parseBooleanNullable(
            row[
              "Parte Técnica (Eng. & QA) e Comercial resolvida?"
            ]
          ),

        productionRiskMitigated:
          parseBooleanNullable(
            row[
              "Risco p/ Produção Mitigado?"
            ]
          ),

        eopManagementOk:
          parseBooleanNullable(
            row[
              "Gerenciamento de EOP está OK?"
            ]
          ),

        deviationPfpFinished:
          parseBooleanNullable(
            row[
              "Desvio c/ PFP Finalizado?"
            ]
          ),

        onlyVdaPending:
          parseBooleanNullable(
            row[
              "Fórmula\nPendente Somente VDA?"
            ]
          ),

        vdaApproved:
          parseBooleanNullable(
            row[
              "VDA Aprovado (1 ou 3)"
            ]
          ),

        modificationImplemented:
          parseBooleanNullable(
            row[
              "Modificação Implentada?"
            ]
          ),
      },

      update: {
        isPartCanceled:
          parseBooleanNullable(
            row["PN Cancelado"]
          ),

        hasDemand:
          parseBooleanNullable(
            row["PN Com demanda?"]
          ),

        sourceNamed:
          parseBooleanNullable(
            row["Fonte Nomeada"]
          ),

        actionPlanReceived:
          parseBooleanNullable(
            row[
              "Cronograma/Plano de Ação Recebido"
            ]
          ),

        scheduleMeetsDevelopment:
          parseBooleanNullable(
            row[
              "Cronograma Atende Desenvolvimento"
            ]
          ),

        technicalCommercialOk:
          parseBooleanNullable(
            row[
              "Parte Técnica (Eng. & QA) e Comercial resolvida?"
            ]
          ),

        productionRiskMitigated:
          parseBooleanNullable(
            row[
              "Risco p/ Produção Mitigado?"
            ]
          ),

        eopManagementOk:
          parseBooleanNullable(
            row[
              "Gerenciamento de EOP está OK?"
            ]
          ),

        deviationPfpFinished:
          parseBooleanNullable(
            row[
              "Desvio c/ PFP Finalizado?"
            ]
          ),

        onlyVdaPending:
          parseBooleanNullable(
            row[
              "Fórmula\nPendente Somente VDA?"
            ]
          ),

        vdaApproved:
          parseBooleanNullable(
            row[
              "VDA Aprovado (1 ou 3)"
            ]
          ),

        modificationImplemented:
          parseBooleanNullable(
            row[
              "Modificação Implentada?"
            ]
          ),
      },
    })

    imported++

    if (imported % 100 === 0) {
      console.log(
        `${imported} linhas ativas processadas...`
      )
    }
  }

  console.log(
    `CW22.xlsx / Risk Plan: ${imported} linhas importadas, ${skipped} ignoradas`
  )
}

// ======================================================
// RISK PLAN CONCLUÍDO
// ======================================================

async function seedClosedRiskPlan(
  createdById: string,
  countryId: string
) {
  console.log("")
  console.log(
    "Importando RMs concluídas..."
  )

  const rows =
    readSheet(
      CLOSED_FILE,
      "RISK CONCLUÍDOS",
      0
    )

  console.log(
    `${rows.length} linhas encontradas em RISK CONCLUÍDOS`
  )

  let imported = 0
  let skipped = 0

  for (const row of rows) {
    const code =
      clean(row["RMs"]) ||
      clean(row["RM"]) ||
      clean(row["Risk"])

    const pn =
      clean(row["PN"]) ||
      clean(row["Part Number"]) ||
      clean(row["PartNumber"])

    if (!code || !pn) {
      skipped++
      continue
    }

    const supplierName =
      clean(row["Fornecedor "]) ||
      clean(row["Fornecedor"]) ||
      "Fornecedor não informado"

    const supplierId =
      await findOrCreateSupplier(
        supplierName,
        countryId
      )

    const riskEventId =
      await findOrCreateRiskEvent({
        code,
        supplierId,
        createdById,

        openingReason:
          mapOpeningReason(
            row["Classificação"]
          ),

        riskLevel:
          mapRiskLevel(
            row["Status RM"]
          ),

        workflowStatus:
          "CLOSED",

        commodity:
          clean(
            row["Comodity"]
          ) ||
          clean(
            row["Commodity"]
          ),

        title:
          `${code} - ${supplierName}`,

        description:
          clean(
            row["Comentários"]
          ) ||
          clean(
            row["Comentário"]
          ) ||
          clean(
            row["Classificação"]
          ),
      })

    const partNumberId =
      await findOrCreatePartNumber({
        partNumber: pn,

        description:
          clean(
            row["Descrição"]
          ),

        vehicleProgram:
          null,
      })

    await findOrCreateRiskPart({
      riskEventId,
      partNumberId,

      status:
        mapPartStatus(
          row["Status PN"]
        ),

      assignedToId:
        null,
    })

    imported++

    if (imported % 100 === 0) {
      console.log(
        `${imported} linhas concluídas processadas...`
      )
    }
  }

  console.log(
    `RISK MANAGEMENT PLAN - Concluidos.xlsx / RISK CONCLUÍDOS: ${imported} linhas importadas, ${skipped} ignoradas`
  )
}

// ======================================================
// SINCRONIZA SEQUÊNCIA
// ======================================================

async function syncRiskSequence() {
  const lastRisk =
    await prisma.riskEvent.findFirst({
      orderBy: {
        sequenceNumber:
          "desc",
      },
      select: {
        sequenceNumber:
          true,
      },
    })

  await prisma.riskSequence.upsert({
    where: {
      key: "RISK_EVENT",
    },

    create: {
      key: "RISK_EVENT",

      currentNumber:
        lastRisk?.sequenceNumber ??
        0,
    },

    update: {
      currentNumber:
        lastRisk?.sequenceNumber ??
        0,
    },
  })

  console.log(
    `Sequência de RM sincronizada em: ${
      lastRisk?.sequenceNumber ?? 0
    }`
  )
}

// ======================================================
// MAIN
// ======================================================

async function main() {
  console.log(
    "======================================"
  )

  console.log(
    "Iniciando seed SRMS..."
  )

  console.log(
    "======================================"
  )

  console.log(
    `Diretório atual: ${process.cwd()}`
  )

  console.log(
    `Arquivo ativo: ${ACTIVE_FILE}`
  )

  console.log(
    `Arquivo concluído: ${CLOSED_FILE}`
  )

  const createdById =
    await getSeedUserId()

  console.log(
    `Usuário da importação encontrado: ${createdById}`
  )

  const countryId =
    await getBrazilCountryId()

  console.log(
    `País Brasil: ${countryId}`
  )

  await loadUsedSequenceNumbers()

  console.log(
    `${usedSequenceNumbers.size} sequenceNumbers já existentes`
  )

  await seedActiveRiskPlan(
    createdById,
    countryId
  )

  await seedClosedRiskPlan(
    createdById,
    countryId
  )

  await syncRiskSequence()

  console.log("")
  console.log(
    "======================================"
  )

  console.log(
    "Seed SRMS finalizada com sucesso."
  )

  console.log(
    "======================================"
  )
}

main()
  .catch((error) => {
    console.error("")
    console.error(
      "======================================"
    )

    console.error(
      "ERRO DURANTE A SEED SRMS"
    )

    console.error(
      "======================================"
    )

    console.error(error)

    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })