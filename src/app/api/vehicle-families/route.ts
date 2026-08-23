import { NextResponse } from "next/server"

import { prisma } from "@/app/api/lib/prisma"
import { getUserFromRequest } from "@/app/api/lib/getUserFromToken"
import { createAuditLog } from "@/app/api/lib/createAuditLog"
import { getRequestIp } from "@/app/api/lib/request-ip"

function getPermissions(user: any): string[] {
  const permissions = user.roles.flatMap((ur: any) =>
    ur.role.permissions.map((rp: any) =>
      String(rp.permission.name)
    )
  )

  return Array.from(new Set<string>(permissions))
}

function hasAnyPermission(
  permissions: string[],
  allowed: string[]
) {
  return allowed.some((permission) =>
    permissions.includes(permission)
  )
}

function getDateLimits() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const endOfToday = new Date(today)
  endOfToday.setHours(23, 59, 59, 999)

  return { today, endOfToday }
}

function isApplicationCurrent(
  application: any,
  today: Date,
  endOfToday: Date
) {
  if (!application.isActive) return false

  const validFrom = application.validFrom
    ? new Date(application.validFrom)
    : null

  const validTo = application.validTo
    ? new Date(application.validTo)
    : null

  return (
    (!validFrom || validFrom <= endOfToday) &&
    (!validTo || validTo >= today)
  )
}

function getCurrentApplications(applications: any[]) {
  const { today, endOfToday } = getDateLimits()

  return applications.filter((application) =>
    isApplicationCurrent(
      application,
      today,
      endOfToday
    )
  )
}

function getModelRiskEvents(applications: any[]) {
  const currentApplications =
    getCurrentApplications(applications)
  const riskEvents = new Map<string, any>()

  for (const application of currentApplications) {
    const addRiskPart = (
      riskPart: any,
      relationSource: "EXPLICIT" | "PART_NUMBER"
    ) => {
      const riskEvent = riskPart.riskEvent
      let item = riskEvents.get(riskEvent.id)

      if (!item) {
        item = {
          id: riskEvent.id,
          code: riskEvent.code,
          title: riskEvent.title,
          workflowStatus: riskEvent.workflowStatus,
          riskLevel: riskEvent.riskLevel,
          supplier: riskEvent.supplier,
          assignedTo: riskEvent.assignedTo,
          logisticsAnalysts: [],
          parts: [],
        }

        riskEvents.set(riskEvent.id, item)
      }

      for (const request of riskPart.logisticsRequests) {
        if (!request.assignedTo) continue

        const analystAlreadyAdded =
          item.logisticsAnalysts.some(
            (analyst: any) =>
              analyst.id === request.assignedTo.id
          )

        if (!analystAlreadyAdded) {
          item.logisticsAnalysts.push({
            id: request.assignedTo.id,
            name: request.assignedTo.name,
          })
        }
      }

      const existingPart = item.parts.find(
        (part: any) =>
          part.riskEventPartId === riskPart.id
      )

      if (existingPart) {
        if (relationSource === "EXPLICIT") {
          existingPart.relationSource = "EXPLICIT"
        }

        return
      }

      item.parts.push({
        riskEventPartId: riskPart.id,
        partNumberId: application.partNumber.id,
        partNumber:
          application.partNumber.partNumber,
        description:
          application.partNumber.description,
        status: riskPart.status,
        relationSource,
      })
    }

    for (const link of
      application.riskEventPartApplications) {
      addRiskPart(link.riskEventPart, "EXPLICIT")
    }

    for (const riskPart of
      application.partNumber.riskParts) {
      addRiskPart(riskPart, "PART_NUMBER")
    }
  }

  return Array.from(riskEvents.values()).sort(
    (left, right) => {
      if (
        left.workflowStatus === "OPEN" &&
        right.workflowStatus !== "OPEN"
      ) {
        return -1
      }

      if (
        left.workflowStatus !== "OPEN" &&
        right.workflowStatus === "OPEN"
      ) {
        return 1
      }

      return left.code.localeCompare(right.code)
    }
  )
}

function getApplicationAlerts(applications: any[]) {
  const { today, endOfToday } = getDateLimits()
  const thirtyDaysFromNow = new Date(today)
  thirtyDaysFromNow.setDate(
    thirtyDaysFromNow.getDate() + 30
  )
  const alerts: any[] = []

  for (const application of applications) {
    if (!application.isActive || !application.validTo) {
      continue
    }

    const validTo = new Date(application.validTo)
    const status =
      validTo < today
        ? "EXPIRED"
        : validTo <= thirtyDaysFromNow &&
            isApplicationCurrent(
              application,
              today,
              endOfToday
            )
          ? "EXPIRING"
          : null

    if (!status) continue

    alerts.push({
      applicationId: application.id,
      partNumberId: application.partNumber.id,
      partNumber: application.partNumber.partNumber,
      description: application.partNumber.description,
      validTo: validTo.toISOString(),
      status,
    })
  }

  return alerts.sort((left, right) => {
    if (left.status !== right.status) {
      return left.status === "EXPIRED" ? -1 : 1
    }

    return (
      new Date(left.validTo).getTime() -
      new Date(right.validTo).getTime()
    )
  })
}

function getApplicationMetrics(applications: any[]) {
  const { today, endOfToday } = getDateLimits()

  const thirtyDaysFromNow = new Date(today)
  thirtyDaysFromNow.setDate(
    thirtyDaysFromNow.getDate() + 30
  )

  const currentApplications =
    getCurrentApplications(applications)

  const expiredActiveApplications = applications.filter(
    (application) =>
      application.isActive &&
      application.validTo &&
      new Date(application.validTo) < today
  )

  const expiringApplications = applications.filter(
    (application) => {
      if (
        !application.validTo ||
        !isApplicationCurrent(
          application,
          today,
          endOfToday
        )
      ) {
        return false
      }

      const validTo = new Date(application.validTo)

      return (
        validTo >= today &&
        validTo <= thirtyDaysFromNow
      )
    }
  )

  const uniquePartNumbers = new Set(
    applications.map(
      (application) => application.partNumberId
    )
  )

  const currentPartNumbers = new Set(
    currentApplications.map(
      (application) => application.partNumberId
    )
  )

  const partNumbersWithOpenRisks = new Set(
    currentApplications
      .filter(
        (application) =>
          application.partNumber.riskParts.some(
            (riskPart: any) =>
              riskPart.riskEvent.workflowStatus ===
              "OPEN"
          )
      )
      .map((application) => application.partNumberId)
  )

  const criticalPartNumbers = new Set(
    currentApplications
      .filter((application) =>
        application.partNumber.riskParts.some(
          (riskPart: any) =>
            riskPart.riskEvent.workflowStatus ===
              "OPEN" &&
            riskPart.status === "RED"
        )
      )
      .map((application) => application.partNumberId)
  )

  const riskEvents = getModelRiskEvents(applications)
  const openRiskEvents = riskEvents.filter(
    (riskEvent) =>
      riskEvent.workflowStatus === "OPEN"
  )

  return {
    totalApplications: applications.length,
    currentApplications: currentApplications.length,
    inactiveApplications: applications.filter(
      (application) => !application.isActive
    ).length,
    expiredActiveApplications:
      expiredActiveApplications.length,
    expiringApplications: expiringApplications.length,
    uniquePartNumbers: uniquePartNumbers.size,
    currentPartNumbers: currentPartNumbers.size,
    partNumbersWithOpenRisks:
      partNumbersWithOpenRisks.size,
    criticalPartNumbers: criticalPartNumbers.size,
    relatedRiskEvents: riskEvents.length,
    openRiskEvents: openRiskEvents.length,
    criticalRiskEvents: openRiskEvents.filter(
      (riskEvent) =>
        riskEvent.parts.some(
          (part: any) => part.status === "RED"
        )
    ).length,
  }
}

export async function GET() {
  try {
    const currentUser = await getUserFromRequest()

    if (!currentUser) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      )
    }

    const permissions = getPermissions(currentUser)

    if (
      !hasAnyPermission(permissions, [
        "RISK_VIEW",
        "RISK_CREATE",
        "RISK_UPDATE",
        "USER_MANAGE",
      ])
    ) {
      return NextResponse.json(
        {
          error:
            "Sem permissão para consultar classes veiculares",
        },
        { status: 403 }
      )
    }

    const families = await prisma.vehicleFamily.findMany({
      include: {
        models: {
          include: {
            applications: {
              select: {
                id: true,
                partNumberId: true,
                isActive: true,
                validFrom: true,
                validTo: true,
                partNumber: {
                  select: {
                    id: true,
                    partNumber: true,
                    description: true,
                    riskParts: {
                      select: {
                        id: true,
                        status: true,
                        logisticsRequests: {
                          where: {
                            status: {
                              not: "CANCELED",
                            },
                          },
                          select: {
                            id: true,
                            status: true,
                            assignedTo: {
                              select: {
                                id: true,
                                name: true,
                              },
                            },
                          },
                        },
                        riskEvent: {
                          select: {
                            id: true,
                            code: true,
                            title: true,
                            workflowStatus: true,
                            riskLevel: true,
                            supplier: {
                              select: {
                                id: true,
                                name: true,
                              },
                            },
                            assignedTo: {
                              select: {
                                id: true,
                                name: true,
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
                riskEventPartApplications: {
                  select: {
                    riskEventPart: {
                      select: {
                        id: true,
                        status: true,
                        logisticsRequests: {
                          where: {
                            status: {
                              not: "CANCELED",
                            },
                          },
                          select: {
                            id: true,
                            status: true,
                            assignedTo: {
                              select: {
                                id: true,
                                name: true,
                              },
                            },
                          },
                        },
                        riskEvent: {
                          select: {
                            id: true,
                            code: true,
                            title: true,
                            workflowStatus: true,
                            riskLevel: true,
                            supplier: {
                              select: {
                                id: true,
                                name: true,
                              },
                            },
                            assignedTo: {
                              select: {
                                id: true,
                                name: true,
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: {
            code: "asc",
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    })

    return NextResponse.json(
      families.map((family) => {
        const familyApplications =
          family.models.flatMap(
            (model) => model.applications
          )

        return {
          id: family.id,
          name: family.name,
          description: family.description,
          isActive: family.isActive,
          createdAt: family.createdAt,
          updatedAt: family.updatedAt,
          metrics: {
            totalModels: family.models.length,
            activeModels: family.models.filter(
              (model) => model.isActive
            ).length,
            inactiveModels: family.models.filter(
              (model) => !model.isActive
            ).length,
            modelsWithoutCurrentApplications:
              family.models.filter(
                (model) =>
                  model.isActive &&
                  getApplicationMetrics(
                    model.applications
                  ).currentApplications === 0
              ).length,
            ...getApplicationMetrics(
              familyApplications
            ),
          },
          models: family.models.map((model) => ({
            id: model.id,
            familyId: model.familyId,
            code: model.code,
            name: model.name,
            description: model.description,
            isActive: model.isActive,
            createdAt: model.createdAt,
            updatedAt: model.updatedAt,
            metrics: getApplicationMetrics(
              model.applications
            ),
            riskEvents: getModelRiskEvents(
              model.applications
            ),
            applicationAlerts: getApplicationAlerts(
              model.applications
            ),
          })),
        }
      })
    )
  } catch (error) {
    console.error("ERRO AO BUSCAR CLASSES VEICULARES:", error)

    return NextResponse.json(
      {
        error: "Erro ao buscar classes veiculares",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await getUserFromRequest()

    if (!currentUser) {
      return NextResponse.json(
        { error: "Não autenticado" },
        { status: 401 }
      )
    }

    const permissions = getPermissions(currentUser)

    if (
      !hasAnyPermission(permissions, [
        "RISK_UPDATE",
        "USER_MANAGE",
      ])
    ) {
      return NextResponse.json(
        {
          error:
            "Sem permissão para cadastrar classe veicular",
        },
        { status: 403 }
      )
    }

    const body = await req.json()

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : ""

    const description =
      typeof body.description === "string" &&
      body.description.trim()
        ? body.description.trim()
        : null

    const isActive =
      typeof body.isActive === "boolean"
        ? body.isActive
        : true

    if (!name) {
      return NextResponse.json(
        { error: "Informe o nome da classe" },
        { status: 400 }
      )
    }

    const existing = await prisma.vehicleFamily.findUnique({
      where: {
        name,
      },
    })

    if (existing) {
      return NextResponse.json(
        {
          error:
            "Já existe uma classe veicular com este nome",
        },
        { status: 409 }
      )
    }

    const ipAddress = getRequestIp(req)
    const userAgent = req.headers.get("user-agent")

    const created = await prisma.$transaction(async (tx) => {
      const family = await tx.vehicleFamily.create({
        data: {
          name,
          description,
          isActive,
        },
      })

      await createAuditLog(tx, {
        entityType: "VehicleFamily",
        entityId: family.id,
        action: "VEHICLE_FAMILY_CREATE",
        changedBy: currentUser.id,
        ipAddress,
        newValue: {
          id: family.id,
          name: family.name,
          description: family.description,
          isActive: family.isActive,
          changedByUser: {
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
          },
          userAgent,
        },
      })

      return family
    })

    return NextResponse.json(
      {
        id: created.id,
        name: created.name,
        description: created.description,
        isActive: created.isActive,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
        metrics: {
          totalModels: 0,
          activeModels: 0,
          inactiveModels: 0,
          modelsWithoutCurrentApplications: 0,
          totalApplications: 0,
          currentApplications: 0,
          inactiveApplications: 0,
          expiredActiveApplications: 0,
          expiringApplications: 0,
          uniquePartNumbers: 0,
          currentPartNumbers: 0,
          partNumbersWithOpenRisks: 0,
          criticalPartNumbers: 0,
          relatedRiskEvents: 0,
          openRiskEvents: 0,
          criticalRiskEvents: 0,
        },
        models: [],
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("ERRO AO CADASTRAR CLASSE VEICULAR:", error)

    return NextResponse.json(
      {
        error: "Erro ao cadastrar classe veicular",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    )
  }
}
