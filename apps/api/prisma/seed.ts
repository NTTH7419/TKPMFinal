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

  console.log('\n🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
