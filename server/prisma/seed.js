const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Kullanıcıları oluştur
  const customerUser = await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: {
      email: 'customer@example.com',
      password: await bcrypt.hash('password123', 10),
      name: 'Müşteri Adı',
      phone: '5551112233',
      role: 'CUSTOMER',
    },
  });

  const businessUser = await prisma.user.upsert({
    where: { email: 'business@example.com' },
    update: {},
    create: {
      email: 'business@example.com',
      password: await bcrypt.hash('password123', 10),
      name: 'İşletme Sahibi',
      phone: '5554445566',
      role: 'BUSINESS',
    },
  });

  console.log('Users created:', { customerUser, businessUser });

  // İşletmeleri oluştur
  const business1 = await prisma.business.create({
    data: {
      ownerId: businessUser.id,
      name: 'Yıkattır Oto Yıkama Kadıköy',
      type: 'Oto Yıkama',
      city: 'İstanbul',
      district: 'Kadıköy',
      address: 'Örnek Mah. Test Cad. No:1',
      rating: 4.8,
      isActive: true,
      capacity: 3,
      lat: 40.988,
      lng: 29.024,
      imageUrl: 'https://images.unsplash.com/photo-1542362567-b07e54358753?w=1200',
    },
  });

  const business2 = await prisma.business.create({
    data: {
      ownerId: businessUser.id,
      name: 'Hızlı Oto Yıkama Ankara',
      type: 'Oto Yıkama',
      city: 'Ankara',
      district: 'Çankaya',
      address: 'Deneme Sok. No:5',
      rating: 4.5,
      isActive: true,
      capacity: 2,
      lat: 39.920,
      lng: 32.854,
      imageUrl: 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=1200',
    },
  });

  console.log('Businesses created:', { business1, business2 });

  // Hizmetleri oluştur
  const services1 = [
    { name: 'İç-Dış Yıkama (Binek)', price: 300, durationMin: 45, vehicleType: 'SEDAN' },
    { name: 'İç-Dış Yıkama (SUV)', price: 400, durationMin: 60, vehicleType: 'SUV' },
    { name: 'Detaylı İç Temizlik', price: 800, durationMin: 120, addons: ['Ozon Temizliği'] },
    { name: 'Motor Yıkama', price: 250, durationMin: 30 },
    { name: 'Hızlı Dış Yıkama', price: 150, durationMin: 20 },
  ];

  for (const serviceData of services1) {
    await prisma.service.create({
      data: { ...serviceData, businessId: business1.id },
    });
  }

  const services2 = [
    { name: 'Standart Yıkama', price: 200, durationMin: 30, vehicleType: 'SEDAN' },
    { name: 'Premium Yıkama', price: 350, durationMin: 50, vehicleType: 'SUV' },
  ];

  for (const serviceData of services2) {
    await prisma.service.create({
      data: { ...serviceData, businessId: business2.id },
    });
  }
  console.log('Services created.');

  // Çalışma saatlerini oluştur
  const defaultWorkingHours = [
    { dayOfWeek: 1, isOpen: true, openTime: '09:00', closeTime: '18:00' },
    { dayOfWeek: 2, isOpen: true, openTime: '09:00', closeTime: '18:00' },
    { dayOfWeek: 3, isOpen: true, openTime: '09:00', closeTime: '18:00' },
    { dayOfWeek: 4, isOpen: true, openTime: '09:00', closeTime: '18:00' },
    { dayOfWeek: 5, isOpen: true, openTime: '09:00', closeTime: '19:00' },
    { dayOfWeek: 6, isOpen: true, openTime: '10:00', closeTime: '17:00' },
    { dayOfWeek: 7, isOpen: false },
  ];

  for (const hour of defaultWorkingHours) {
    await prisma.workingHour.create({
      data: { ...hour, businessId: business1.id },
    });
    await prisma.workingHour.create({
      data: { ...hour, businessId: business2.id },
    });
  }
  console.log('Working hours created.');

  // Örnek randevu
  const serviceForAppointment = await prisma.service.findFirst({
    where: { businessId: business1.id, name: 'İç-Dış Yıkama (Binek)' },
  });

  if (serviceForAppointment) {
    await prisma.appointment.create({
      data: {
        businessId: business1.id,
        customerId: customerUser.id,
        serviceId: serviceForAppointment.id,
        date: new Date('2025-01-20T10:00:00Z'),
        time: '10:00',
        vehicleType: 'SEDAN',
        plate: '34 ABC 123',
        totalPrice: serviceForAppointment.price,
        status: 'CONFIRMED',
        notes: 'Müşteri notu: Hızlı olsun.',
      },
    });
    console.log('Sample appointment created.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
