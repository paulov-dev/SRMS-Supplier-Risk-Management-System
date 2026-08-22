import { Prisma } from "@prisma/client"

type AuditLogEntityType =
  | "RiskEvent"
  | "RiskEventPart"
  | "RiskActionPlan"
  | "LogisticsRequest"
  | "Supplier"
  | "User"
  | "Role"
  | "Permission"
  | "Notification"
  | string

type CreateAuditLogInput = {
  entityType: AuditLogEntityType
  entityId: string
  action: string
  changedBy: string
  oldValue?: Record<string, unknown> | null
  newValue?: Record<string, unknown> | null
  ipAddress?: string | null
}

function toPrismaJsonObject(
  value: Record<string, unknown>
): Prisma.InputJsonObject {
  return JSON.parse(
    JSON.stringify(value)
  ) as Prisma.InputJsonObject
}

export async function createAuditLog(
  tx: Prisma.TransactionClient,
  input: CreateAuditLogInput
) {
  return tx.auditLog.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      changedBy: input.changedBy,
      ipAddress: input.ipAddress || null,
      oldValue: input.oldValue
        ? toPrismaJsonObject(input.oldValue)
        : undefined,
      newValue: input.newValue
        ? toPrismaJsonObject(input.newValue)
        : undefined,
    },
  })
}