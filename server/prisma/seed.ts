import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const menus = [
  { name: 'Pepián', description: 'Carne con recado, arroz y tortillas', price: '25.00' },
  { name: 'Pollo dorado', description: 'Pollo dorado con guarnición', price: '28.00' },
  { name: 'Caldo de res', description: 'Caldo de res con verduras', price: '22.00' },
  { name: 'Hilachas', description: 'Carne deshilachada en salsa de tomate', price: '26.00' },
  { name: 'Chuleta', description: 'Chuleta de cerdo con guarnición', price: '30.00' },
]

const extras = [
  { name: 'Bebida', price: '5.00' },
  { name: 'Tortillas', price: '2.00' },
  { name: 'Aguacate', price: '5.00' },
]

async function main() {
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.dailyMenuItem.deleteMany()
  await prisma.dailyMenu.deleteMany()
  await prisma.menuItem.deleteMany()
  await prisma.extra.deleteMany()

  await prisma.menuItem.createMany({ data: menus })
  await prisma.extra.createMany({ data: extras })

  console.log(`Seed completado: ${menus.length} menús y ${extras.length} extras.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => prisma.$disconnect())
