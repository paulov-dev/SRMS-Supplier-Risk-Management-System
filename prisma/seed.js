const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log("SEED INICIADO 🚀")

  await prisma.role.createMany({
    data: [
      { name: 'ADMIN' },
      { name: 'RISK_MANAGER' },
      { name: 'LOGISTICS' }
    ],
    skipDuplicates: true
  })

  await prisma.riskStatus.createMany({
    data: [
      { name: 'OPEN' },
      { name: 'MITIGATING' },
      { name: 'RESOLVED' },
      { name: 'CLOSED' }
    ],
    skipDuplicates: true
  })

  await prisma.impactLevel.createMany({
    data: [
      { name: 'HIGH' },
      { name: 'MEDIUM' },
      { name: 'LOW' }
    ],
    skipDuplicates: true
  })

  console.log("Seed executado com sucesso 🚀")
}

main()
  .catch((e) => {
    console.error(e)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })