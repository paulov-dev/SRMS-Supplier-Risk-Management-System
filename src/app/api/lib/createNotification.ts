import { Prisma } from "@prisma/client"

type NotificationEntity =
  | "RiskEvent"
  | "RiskEventPart"
  | "RiskActionPlan"
  | "LogisticsRequest"
  | "Supplier"
  | "User"

type NotificationType =
  | "RISK_ASSIGNED"
  | "RISK_CLOSED"
  | "RISK_REOPENED"
  | "RISK_PART_ASSIGNED"
  | "ACTION_PLAN_ASSIGNED"
  | "ACTION_PLAN_OVERDUE"
  | "ACTION_PLAN_DUE_SOON"
  | "LOGISTICS_REQUEST_CREATED"
  | "LOGISTICS_REQUEST_APPROVED"
  | "LOGISTICS_REQUEST_REJECTED"
  | "COMMENT_MENTION"
  | "SYSTEM_ALERT"
  | "USER_PROFILE_UPDATED"
  | "USER_BLOCKED"
  | "USER_UNBLOCKED"
  | "USER_ROLE_ADDED"
  | "USER_ROLE_REMOVED"
  | "LOGISTICS_REQUEST_IN_REVIEW"
  | "LOGISTICS_REQUEST_CANCELED"
  | "USER_BLOCKED"
  | "USER_UNBLOCKED"

type CreateNotificationInput = {
  userId: string
  title: string
  message: string
  type: NotificationType
  entity?: NotificationEntity | null
  entityId?: string | null
}

export async function createNotification(
  tx: Prisma.TransactionClient,
  input: CreateNotificationInput
) {
  if (!input.userId) {
    return null
  }

  return tx.notification.create({
    data: {
      userId: input.userId,
      title: input.title,
      message: input.message,
      type: input.type,
      entity: input.entity || null,
      entityId: input.entityId || null,
    },
  })
}