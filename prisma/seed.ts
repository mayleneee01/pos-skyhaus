import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // =====================
  // 1. Create / Update Users
  // =====================
  const adminPassword = await bcrypt.hash('AdminSkyhaus!2024', 12);
  const cashierPassword = await bcrypt.hash('KasirKerja!123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@skyhaus.com' },
    update: { password: adminPassword },
    create: {
      name: 'Admin SKY HAUS',
      email: 'admin@skyhaus.com',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  const cashier = await prisma.user.upsert({
    where: { email: 'kasir@skyhaus.com' },
    update: { password: cashierPassword },
    create: {
      name: 'Kasir 1',
      email: 'kasir@skyhaus.com',
      password: cashierPassword,
      role: 'CASHIER',
    },
  });

  const cashier2 = await prisma.user.upsert({
    where: { email: 'kasir2@skyhaus.com' },
    update: { password: cashierPassword },
    create: {
      name: 'Kasir 2',
      email: 'kasir2@skyhaus.com',
      password: cashierPassword,
      role: 'CASHIER',
    },
  });

  console.log('✅ Users created:', admin.email, cashier.email, cashier2.email);

  // =====================
  // 2. Create Categories
  // =====================
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name: 'Kopi' },
      update: {},
      create: { name: 'Kopi' },
    }),
    prisma.category.upsert({
      where: { name: 'Non-Kopi' },
      update: {},
      create: { name: 'Non-Kopi' },
    }),
    prisma.category.upsert({
      where: { name: 'Makanan' },
      update: {},
      create: { name: 'Makanan' },
    }),
    prisma.category.upsert({
      where: { name: 'Snack' },
      update: {},
      create: { name: 'Snack' },
    }),
    prisma.category.upsert({
      where: { name: 'Minuman Dingin' },
      update: {},
      create: { name: 'Minuman Dingin' },
    }),
  ]);

  console.log('✅ Categories created:', categories.map(c => c.name).join(', '));

  // =====================
  // 3. Create Products
  // =====================
  const [kopi, nonKopi, makanan, snack, minumanDingin] = categories;

  const products = await Promise.all([
    // Kopi
    prisma.product.create({
      data: {
        name: 'Americano',
        sku: 'KPI-001',
        price: 18000,
        stock: 100,
        lowStock: 5,
        categoryId: kopi.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Cappuccino',
        sku: 'KPI-002',
        price: 22000,
        stock: 100,
        lowStock: 5,
        categoryId: kopi.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Cafe Latte',
        sku: 'KPI-003',
        price: 24000,
        stock: 100,
        lowStock: 5,
        categoryId: kopi.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Espresso',
        sku: 'KPI-004',
        price: 15000,
        stock: 100,
        lowStock: 5,
        categoryId: kopi.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Mocha Latte',
        sku: 'KPI-005',
        price: 26000,
        stock: 80,
        lowStock: 5,
        categoryId: kopi.id,
      },
    }),
    // Non-Kopi
    prisma.product.create({
      data: {
        name: 'Matcha Latte',
        sku: 'NKP-001',
        price: 25000,
        stock: 80,
        lowStock: 5,
        categoryId: nonKopi.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Coklat Panas',
        sku: 'NKP-002',
        price: 20000,
        stock: 80,
        lowStock: 5,
        categoryId: nonKopi.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Teh Tarik',
        sku: 'NKP-003',
        price: 18000,
        stock: 80,
        lowStock: 5,
        categoryId: nonKopi.id,
      },
    }),
    // Makanan
    prisma.product.create({
      data: {
        name: 'Nasi Goreng Special',
        sku: 'MKN-001',
        price: 28000,
        stock: 50,
        lowStock: 5,
        categoryId: makanan.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Mie Goreng',
        sku: 'MKN-002',
        price: 25000,
        stock: 50,
        lowStock: 5,
        categoryId: makanan.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Roti Bakar',
        sku: 'MKN-003',
        price: 18000,
        stock: 40,
        lowStock: 5,
        categoryId: makanan.id,
      },
    }),
    // Snack
    prisma.product.create({
      data: {
        name: 'French Fries',
        sku: 'SNK-001',
        price: 20000,
        stock: 60,
        lowStock: 5,
        categoryId: snack.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Croissant',
        sku: 'SNK-002',
        price: 15000,
        stock: 30,
        lowStock: 5,
        categoryId: snack.id,
      },
    }),
    // Minuman Dingin
    prisma.product.create({
      data: {
        name: 'Es Teh Manis',
        sku: 'MDG-001',
        price: 10000,
        stock: 100,
        lowStock: 5,
        categoryId: minumanDingin.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Jus Jeruk',
        sku: 'MDG-002',
        price: 18000,
        stock: 60,
        lowStock: 5,
        categoryId: minumanDingin.id,
      },
    }),
  ]);

  console.log('✅ Products created:', products.length, 'items');

  // =====================
  // 4. Create Store Setting
  // =====================
  const existingSetting = await prisma.storeSetting.findFirst();
  if (!existingSetting) {
    await prisma.storeSetting.create({
      data: {
        storeName: 'SKY HAUS',
        address: 'Jl. Lapas, Kec. Jati Agung, Lampung',
        phone: '0857-1952-1461',
        taxRate: 0,
        receiptFooter: 'Terima Kasih Atas Kunjungan Anda!',
      },
    });
    console.log('✅ Store settings created');
  }

  console.log('🎉 Seeding / Update completed!');
  console.log('');
  console.log('📋 Login Credentials Baru:');
  console.log('   Admin: admin@skyhaus.com / AdminSkyhaus!2024');
  console.log('   Kasir: kasir@skyhaus.com / KasirKerja!123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
