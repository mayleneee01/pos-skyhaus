const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const tx = await prisma.transaction.findMany({ orderBy: { createdAt: 'desc' } });
  console.log("Latest TX:", tx[0].invoiceNo, tx[0].createdAt.toISOString());
  console.log("Earliest TX:", tx[tx.length-1].invoiceNo, tx[tx.length-1].createdAt.toISOString());
}
run().finally(() => prisma.$disconnect());
