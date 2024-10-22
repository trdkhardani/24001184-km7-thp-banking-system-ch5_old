import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Create users
  await prisma.user.createMany({
    data: [
    {
        name: 'Admin',
        email: 'admin@example.com', 
        password: '$2a$12$A8xMlvKFUZ.pOTC8MdjqaeSETeeI3zURuQAqMIEHu/jQ4MbscC9.G',
        role: 'admin'
    },
    ],
  });

  console.log('Seeding completed!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
