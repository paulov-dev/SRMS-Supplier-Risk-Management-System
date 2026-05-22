const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {

  // =========================
  // PERMISSIONS
  // =========================
  const permissions = [
    'USER_MANAGE',
    'SUPPLIER_MANAGE',
    'SUPPLIER_VIEW',
    'SUPPLIER_CREATE',
    'SUPPLIER_UPDATE',
    'RISK_VIEW',
    'RISK_CREATE',
    'RISK_UPDATE',
    'RISK_ASSIGN',
    'RISK_CLOSE',
    'LOGISTICS_REQUEST_CREATE',
    'LOGISTICS_REQUEST_REVIEW',
    'LOGISTICS_BUFFER_MANAGE',
    'COMMENT_CREATE',
    'COMMENT_VIEW',
    'DASHBOARD_VIEW',
    'ANALYTICS_VIEW'
  ]

  await prisma.permission.createMany({
    data: permissions.map(name => ({ name })),
    skipDuplicates: true
  })

  // =========================
  // ROLES
  // =========================
  const roles = [
    'ADMIN',
    'RISK_MANAGER',
    'RISK_ANALYST',
    'LOGISTICS',
    'VIEWER'
  ]

  await prisma.role.createMany({
    data: roles.map(name => ({ name })),
    skipDuplicates: true
  })

  // =========================
  // COUNTRIES
  // =========================
  const countries = [
    { name: 'Brazil', isoCode: 'BR' },
    { name: 'United States', isoCode: 'US' },
    { name: 'Germany', isoCode: 'DE' },
    { name: 'Mexico', isoCode: 'MX' },
    { name: 'China', isoCode: 'CN' },
    { name: 'Japan', isoCode: 'JP' },
    { name: 'South Korea', isoCode: 'KR' },
    { name: 'India', isoCode: 'IN' },
    { name: 'France', isoCode: 'FR' },
    { name: 'Italy', isoCode: 'IT' },
    { name: 'Spain', isoCode: 'ES' },
    { name: 'Canada', isoCode: 'CA' },
    { name: 'Argentina', isoCode: 'AR' },
    { name: 'United Kingdom', isoCode: 'GB' },
    { name: 'Portugal', isoCode: 'PT' }
  ]

  await prisma.country.createMany({
    data: countries,
    skipDuplicates: true
  })

  // =========================
  // HELPERS
  // =========================
  const getRole = (name) =>
    prisma.role.findUnique({
      where: { name }
    })

  const getPermissions = (names) =>
    prisma.permission.findMany({
      where: {
        name: {
          in: names
        }
      }
    })

  const assignPermissions = async (
    roleName,
    permNames
  ) => {
    const role = await getRole(roleName)

    const perms =
      await getPermissions(permNames)

    for (const perm of perms) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: perm.id
          }
        },

        update: {},

        create: {
          roleId: role.id,
          permissionId: perm.id
        }
      })
    }
  }

  // =========================
  // ASSIGNMENTS
  // =========================

  // ADMIN → TODAS
  await assignPermissions(
    'ADMIN',
    permissions
  )

  // RISK_MANAGER
  await assignPermissions(
    'RISK_MANAGER',
    [
      'SUPPLIER_VIEW',
      'SUPPLIER_UPDATE',
      'RISK_VIEW',
      'RISK_CREATE',
      'RISK_UPDATE',
      'RISK_ASSIGN',
      'RISK_CLOSE',
      'COMMENT_CREATE',
      'COMMENT_VIEW',
      'DASHBOARD_VIEW',
      'ANALYTICS_VIEW'
    ]
  )

  // RISK_ANALYST
  await assignPermissions(
    'RISK_ANALYST',
    [
      'SUPPLIER_VIEW',
      'RISK_VIEW',
      'RISK_CREATE',
      'RISK_UPDATE',
      'COMMENT_CREATE',
      'COMMENT_VIEW',
      'DASHBOARD_VIEW'
    ]
  )

  // LOGISTICS
  await assignPermissions(
    'LOGISTICS',
    [
      'SUPPLIER_VIEW',
      'RISK_VIEW',
      'LOGISTICS_REQUEST_REVIEW',
      'LOGISTICS_BUFFER_MANAGE',
      'COMMENT_CREATE',
      'COMMENT_VIEW',
      'DASHBOARD_VIEW'
    ]
  )

  // VIEWER
  await assignPermissions(
    'VIEWER',
    [
      'SUPPLIER_VIEW',
      'RISK_VIEW',
      'COMMENT_VIEW',
      'DASHBOARD_VIEW'
    ]
  )

  console.log('RBAC + COUNTRIES Seed concluído ✅')
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })