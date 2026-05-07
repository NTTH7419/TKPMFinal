import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Seed Roles ─────────────────────────────────────────────────────────────
  const roles = [
    { code: 'STUDENT', name: 'Student' },
    { code: 'ORGANIZER', name: 'Organizer' },
    { code: 'CHECKIN_STAFF', name: 'Check-in Staff' },
    { code: 'ADMIN', name: 'Administrator' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: {},
      create: role,
    });
  }
  console.log('✅ Roles seeded');

  // ─── Seed Admin User ─────────────────────────────────────────────────────────
  const adminPasswordHash = await bcrypt.hash('Admin@123456', 12);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@unihub.edu.vn' },
    update: {},
    create: {
      email: 'admin@unihub.edu.vn',
      passwordHash: adminPasswordHash,
      fullName: 'System Administrator',
      status: 'ACTIVE',
    },
  });

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { code: 'ADMIN' } });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  });
  console.log('✅ Admin user seeded (admin@unihub.edu.vn / Admin@123456)');

  // ─── Seed Demo Organizer ─────────────────────────────────────────────────────
  const organizerPasswordHash = await bcrypt.hash('Organizer@123', 12);
  const organizerUser = await prisma.user.upsert({
    where: { email: 'organizer@unihub.edu.vn' },
    update: {},
    create: {
      email: 'organizer@unihub.edu.vn',
      passwordHash: organizerPasswordHash,
      fullName: 'Demo Organizer',
      status: 'ACTIVE',
    },
  });

  const organizerRole = await prisma.role.findUniqueOrThrow({ where: { code: 'ORGANIZER' } });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: organizerUser.id, roleId: organizerRole.id } },
    update: {},
    create: { userId: organizerUser.id, roleId: organizerRole.id },
  });
  console.log('✅ Demo organizer seeded');

  // ─── Seed Demo Student ───────────────────────────────────────────────────────
  const studentPasswordHash = await bcrypt.hash('Student@123', 12);
  const studentUser = await prisma.user.upsert({
    where: { email: 'student@unihub.edu.vn' },
    update: {},
    create: {
      email: 'student@unihub.edu.vn',
      passwordHash: studentPasswordHash,
      fullName: 'Nguyễn Văn A',
      status: 'ACTIVE',
    },
  });

  const studentRole = await prisma.role.findUniqueOrThrow({ where: { code: 'STUDENT' } });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: studentUser.id, roleId: studentRole.id } },
    update: {},
    create: { userId: studentUser.id, roleId: studentRole.id },
  });

  // Must have a linked Student record to pass the Registration Guard
  await prisma.student.upsert({
    where: { studentCode: 'SE123456' },
    update: { userId: studentUser.id },
    create: {
      studentCode: 'SE123456',
      email: 'student@unihub.edu.vn',
      fullName: 'Nguyễn Văn A',
      faculty: 'Software Engineering',
      status: 'ACTIVE',
      userId: studentUser.id,
    },
  });
  console.log('✅ Demo student seeded (student@unihub.edu.vn / Student@123)');

  // ─── Seed Demo CHECKIN_STAFF ─────────────────────────────────────────────────
  const staffPasswordHash = await bcrypt.hash('Staff@123', 12);
  const staffUser = await prisma.user.upsert({
    where: { email: 'staff@unihub.edu.vn' },
    update: {},
    create: {
      email: 'staff@unihub.edu.vn',
      passwordHash: staffPasswordHash,
      fullName: 'Demo Check-in Staff',
      status: 'ACTIVE',
    },
  });
  const checkinRole = await prisma.role.findUniqueOrThrow({ where: { code: 'CHECKIN_STAFF' } });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: staffUser.id, roleId: checkinRole.id } },
    update: {},
    create: { userId: staffUser.id, roleId: checkinRole.id },
  });
  console.log('✅ Demo check-in staff seeded (staff@unihub.edu.vn / Staff@123)');

  // ─── Seed Demo Workshops ─────────────────────────────────────────────────────
  const now = new Date();

  const workshop1 = await prisma.workshop.upsert({
    where: { id: 'demo-workshop-001' },
    update: {},
    create: {
      id: 'demo-workshop-001',
      title: 'Kỹ năng phỏng vấn kỹ thuật',
      speakerName: 'Nguyễn Thị Bích',
      roomName: 'E1.001',
      roomMapUrl: null,
      capacity: 50,
      confirmedCount: 12,
      heldCount: 3,
      feeType: 'FREE',
      price: null,
      startsAt: new Date(now.getTime() + 2 * 60 * 60 * 1000),   // +2h từ now
      endsAt: new Date(now.getTime() + 4 * 60 * 60 * 1000),     // +4h từ now
      status: 'OPEN',
      summaryStatus: 'PENDING',
    },
  });

  const workshop2 = await prisma.workshop.upsert({
    where: { id: 'demo-workshop-002' },
    update: {},
    create: {
      id: 'demo-workshop-002',
      title: 'Product Design cho Developer',
      speakerName: 'Trần Minh Khoa',
      roomName: 'B3.205',
      roomMapUrl: null,
      capacity: 30,
      confirmedCount: 5,
      heldCount: 0,
      feeType: 'PAID',
      price: 50000,
      startsAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),  // +1 ngày
      endsAt: new Date(now.getTime() + 26 * 60 * 60 * 1000),
      status: 'OPEN',
      summaryStatus: 'PENDING',
    },
  });

  await prisma.workshop.upsert({
    where: { id: 'demo-workshop-003' },
    update: {},
    create: {
      id: 'demo-workshop-003',
      title: 'Git & GitHub nâng cao',
      speakerName: 'Lê Hoàng Nam',
      roomName: 'A2.101',
      roomMapUrl: null,
      capacity: 80,
      confirmedCount: 0,
      heldCount: 0,
      feeType: 'FREE',
      price: null,
      startsAt: new Date(now.getTime() + 48 * 60 * 60 * 1000),  // +2 ngày
      endsAt: new Date(now.getTime() + 50 * 60 * 60 * 1000),
      status: 'DRAFT',   // Chưa mở — không hiện ở public list
      summaryStatus: 'PENDING',
    },
  });

  // Tạo một registration CONFIRMED cho student ở workshop1 (để test QR)
  const existingReg = await prisma.registration.findFirst({
    where: { studentId: (await prisma.student.findUnique({ where: { studentCode: 'SE123456' } }))!.id, workshopId: workshop1.id },
  });
  if (!existingReg) {
    const student = await prisma.student.findUniqueOrThrow({ where: { studentCode: 'SE123456' } });
    await prisma.registration.create({
      data: {
        workshopId: workshop1.id,
        studentId: student.id,
        status: 'CONFIRMED',
        idempotencyKey: 'seed-reg-001',
        qrTokenHash: 'seed-placeholder-hash',
        holdExpiresAt: null,
      },
    });
  }

  console.log(`✅ Demo workshops seeded:
  - "${workshop1.title}" (FREE, OPEN, +2h) — id: ${workshop1.id}
  - "${workshop2.title}" (PAID 50k, OPEN, +1 ngày) — id: ${workshop2.id}
  - "Git & GitHub nâng cao" (FREE, DRAFT — không hiện ở public)`);

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📋 Demo accounts:');
  console.log('  admin@unihub.edu.vn     / Admin@123456  (ADMIN)');
  console.log('  organizer@unihub.edu.vn / Organizer@123 (ORGANIZER)');
  console.log('  staff@unihub.edu.vn     / Staff@123     (CHECKIN_STAFF)');
  console.log('  student@unihub.edu.vn   / Student@123   (STUDENT)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
