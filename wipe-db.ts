import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Menghapus data transaksi (pemasukan)...');
  await prisma.transactionItem.deleteMany();
  await prisma.transaction.deleteMany();
  
  console.log('Menghapus data menu (produk & kategori)...');
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  
  console.log('Berhasil mengosongkan database untuk production!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
