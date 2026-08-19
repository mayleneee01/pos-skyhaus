const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function getWibRangeFromDateString(dateStr) {
  const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, day, -7, 0, 0, 0));
  const end = new Date(Date.UTC(year, month - 1, day, 16, 59, 59, 999));
  return { start, end };
}

async function run() {
  try {
    const { start, end } = getWibRangeFromDateString("2026-08-12");
    console.log(start, end);
    const transactions = await prisma.transaction.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: start, lte: end },
      },
      include: {
        items: true,
      },
    });
    console.log("Success! Found:", transactions.length);
  } catch (err) {
    console.error("Failed:", err);
  }
}
run().finally(() => prisma.$disconnect());
