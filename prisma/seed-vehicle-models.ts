import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const vehicleData = [
  {
    family: "Delivery",
    models: [
      "9.170",
      "11.180",
      "13.180",
      "11.180 4x4",
      "12.260",
      "13.260",
    ],
  },
  {
    family: "Constellation",
    models: [
      "13.180",
      "15.180",
      "17.190",
      "17.230",
      "17.260",
      "17.280",
      "24.260",
      "24.280",
      "25.320",
      "26.260",
      "31.280",
      "31.320",
    ],
  },
  {
    family: "Meteor",
    models: [
      "28.460",
      "29.520",
      "29.530",
      "29.640",
    ],
  },
  {
    family: "Volksbus",
    models: [
      "8.160",
      "9.160",
      "11.180",
      "15.190",
      "17.230",
      "18.280",
    ],
  },
]

async function main() {
  for (const item of vehicleData) {
    const family = await prisma.vehicleFamily.upsert({
      where: {
        name: item.family,
      },
      create: {
        name: item.family,
        isActive: true,
      },
      update: {
        isActive: true,
      },
    })

    for (const modelCode of item.models) {
      await prisma.vehicleModel.upsert({
        where: {
          familyId_code: {
            familyId: family.id,
            code: modelCode,
          },
        },
        create: {
          familyId: family.id,
          code: modelCode,
          isActive: true,
        },
        update: {
          isActive: true,
        },
      })
    }
  }

  console.log("Famílias e modelos veiculares criados com sucesso.")
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })