import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// ─── Fixed UUIDs (v4 format — required by @IsUUID() validation) ──────────────
const ID = {
  // Non-student users (ADMIN, ORGANIZER, STAFF) — independent
  user: {
    admin:  'a0000000-0000-4000-8000-000000000001',
    organizer: 'a0000000-0000-4000-8000-000000000002',
    staff:  'a0000000-0000-4000-8000-000000000003',
    staff2: 'a0000000-0000-4000-8000-000000000004',
  },
  // Students — independent, NOT linked to users (auto-linked via email during registration)
  student: {
    s1: 'b0000000-0000-4000-8000-000000000001',
    s2: 'b0000000-0000-4000-8000-000000000002',
    s3: 'b0000000-0000-4000-8000-000000000003',
    s4: 'b0000000-0000-4000-8000-000000000004',
    s5: 'b0000000-0000-4000-8000-000000000005',
    s6: 'b0000000-0000-4000-8000-000000000006',
    s7: 'b0000000-0000-4000-8000-000000000007',
  },
  // Workshops — independent
  workshop: {
    w1: 'c0000000-0000-4000-8000-000000000001',
    w2: 'c0000000-0000-4000-8000-000000000002',
    w3: 'c0000000-0000-4000-8000-000000000003',
    w4: 'c0000000-0000-4000-8000-000000000004',
    w5: 'c0000000-0000-4000-8000-000000000005',
    w6: 'c0000000-0000-4000-8000-000000000006',
    w7: 'c0000000-0000-4000-8000-000000000007',
  },
  // StudentImportBatch — independent
  batch: {
    b1: '10000000-0000-4000-8000-000000000001',
  },
  // StudentImportRows — linked to batch only
  importRow: {
    ir1: '20000000-0000-4000-8000-000000000001',
    ir2: '20000000-0000-4000-8000-000000000002',
    ir3: '20000000-0000-4000-8000-000000000003',
    ir4: '20000000-0000-4000-8000-000000000004',
    ir5: '20000000-0000-4000-8000-000000000005',
    ir6: '20000000-0000-4000-8000-000000000006',
    ir7: '20000000-0000-4000-8000-000000000007',
    ir8: '20000000-0000-4000-8000-000000000008',
    ir9: '20000000-0000-4000-8000-000000000009',
  },
};

async function main() {
  console.log('🌱 Seeding database...');

  // ═══════════════════════════════════════════════════════════════════════════════
  // PHASE 1: Seed independent data (no relationships)
  // ═══════════════════════════════════════════════════════════════════════════════

  // ─── Roles ──────────────────────────────────────────────────────────────────
  const roles = [
    { code: 'STUDENT',       name: 'Student' },
    { code: 'ORGANIZER',     name: 'Organizer' },
    { code: 'CHECKIN_STAFF', name: 'Check-in Staff' },
    { code: 'ADMIN',         name: 'Administrator' },
  ];
  for (const role of roles) {
    await prisma.role.upsert({ where: { code: role.code }, update: {}, create: role });
  }
  const adminRole     = await prisma.role.findUniqueOrThrow({ where: { code: 'ADMIN' } });
  const organizerRole = await prisma.role.findUniqueOrThrow({ where: { code: 'ORGANIZER' } });
  const checkinRole   = await prisma.role.findUniqueOrThrow({ where: { code: 'CHECKIN_STAFF' } });
  console.log('✅ Roles seeded');

  // ─── Non-student users (ADMIN, ORGANIZER, STAFF) ─────────────────────────────
  // NOTE: These are independent. STUDENT users are NOT seeded — they are created
  // via self-registration flow and auto-linked to Student records by email.
  async function upsertNonStudentUser(id: string, email: string, password: string, fullName: string, roleId: string) {
    const hash = await bcrypt.hash(password, 12);
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { id, email, passwordHash: hash, fullName, status: 'ACTIVE' },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId } },
      update: {},
      create: { userId: user.id, roleId },
    });
    return user;
  }

  await upsertNonStudentUser(ID.user.admin,     'admin@unihub.edu.vn',     'Admin@123456',  'System Administrator',  adminRole.id);
  await upsertNonStudentUser(ID.user.organizer, 'organizer@unihub.edu.vn', 'Organizer@123', 'Demo Organizer',        organizerRole.id);
  await upsertNonStudentUser(ID.user.staff,  'staff@unihub.edu.vn',  'Staff@123', 'Demo Check-in Staff',   checkinRole.id);
  await upsertNonStudentUser(ID.user.staff2, 'staff2@unihub.edu.vn', 'Staff@123', 'Demo Check-in Staff 2', checkinRole.id);
  console.log('✅ Non-student users seeded (ADMIN, ORGANIZER, STAFF)');

  // ─── Students (independent — NOT linked to any users) ──────────────────────────
  // Students are created via import batches. They auto-link to users when users
  // register with matching email via auth.service.ts registerUser() method.
  const studentData = [
    { id: ID.student.s1, studentCode: 'SE123456', email: 'student1@unihub.edu.vn',  fullName: 'Nguyễn Văn A', faculty: 'Software Engineering'    },
    { id: ID.student.s2, studentCode: 'SE123457', email: 'student2@unihub.edu.vn',  fullName: 'Trần Thị B',   faculty: 'Software Engineering'    },
    { id: ID.student.s3, studentCode: 'SE123458', email: 'student3@unihub.edu.vn',  fullName: 'Lê Văn C',     faculty: 'Information Systems'     },
    { id: ID.student.s4, studentCode: 'SE123459', email: 'student4@unihub.edu.vn',  fullName: 'Phạm Thị D',   faculty: 'Computer Science'        },
    { id: ID.student.s5, studentCode: 'SE123460', email: 'student5@unihub.edu.vn',  fullName: 'Hoàng Văn E',  faculty: 'Software Engineering'    },
    { id: ID.student.s6, studentCode: 'IT000001', email: 'it000001@student.edu.vn', fullName: 'Ngô Thị F',    faculty: 'Information Technology'  },
    { id: ID.student.s7, studentCode: 'IT000002', email: 'it000002@student.edu.vn', fullName: 'Đinh Văn G',   faculty: 'Information Technology'  },
  ];
  for (const sd of studentData) {
    await prisma.student.upsert({
      where: { studentCode: sd.studentCode },
      update: {},
      create: { ...sd, status: 'ACTIVE', sourceBatchId: ID.batch.b1 },
    });
  }
  console.log('✅ Students seeded (7 students, userId = null)');

  // ─── StudentImportBatch (independent) ────────────────────────────────────────
  const batchChecksum = crypto.createHash('sha256').update('seed-batch-demo-v1').digest('hex');
  await prisma.studentImportBatch.upsert({
    where: { checksum: batchChecksum },
    update: {},
    create: {
      id:          ID.batch.b1,
      filePath:    'imports/demo-batch-001.csv',
      checksum:    batchChecksum,
      status:      'PROMOTED',
      totalRows:   9,
      validRows:   7,
      errorRows:   2,
      startedAt:   new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 5000),
    },
  });
  console.log('✅ StudentImportBatch seeded');

  // ─── StudentImportRows (linked to batch) ────────────────────────────────────
  const existingRows = await prisma.studentImportRow.findMany({ where: { batchId: ID.batch.b1 } });
  if (existingRows.length === 0) {
    await prisma.studentImportRow.createMany({
      data: [
        { id: ID.importRow.ir1, batchId: ID.batch.b1, studentId: ID.student.s1, rowNumber: 1, studentCode: 'SE123456', email: 'student1@unihub.edu.vn',  fullName: 'Nguyễn Văn A', faculty: 'Software Engineering',   rowStatus: 'VALID' },
        { id: ID.importRow.ir2, batchId: ID.batch.b1, studentId: ID.student.s2, rowNumber: 2, studentCode: 'SE123457', email: 'student2@unihub.edu.vn',  fullName: 'Trần Thị B',   faculty: 'Software Engineering',   rowStatus: 'VALID' },
        { id: ID.importRow.ir3, batchId: ID.batch.b1, studentId: ID.student.s3, rowNumber: 3, studentCode: 'SE123458', email: 'student3@unihub.edu.vn',  fullName: 'Lê Văn C',     faculty: 'Information Systems',    rowStatus: 'VALID' },
        { id: ID.importRow.ir4, batchId: ID.batch.b1, studentId: ID.student.s4, rowNumber: 4, studentCode: 'SE123459', email: 'student4@unihub.edu.vn',  fullName: 'Phạm Thị D',   faculty: 'Computer Science',       rowStatus: 'VALID' },
        { id: ID.importRow.ir5, batchId: ID.batch.b1, studentId: ID.student.s5, rowNumber: 5, studentCode: 'SE123460', email: 'student5@unihub.edu.vn',  fullName: 'Hoàng Văn E',  faculty: 'Software Engineering',   rowStatus: 'VALID' },
        { id: ID.importRow.ir6, batchId: ID.batch.b1, studentId: ID.student.s6, rowNumber: 6, studentCode: 'IT000001', email: 'it000001@student.edu.vn', fullName: 'Ngô Thị F',    faculty: 'Information Technology', rowStatus: 'VALID' },
        { id: ID.importRow.ir7, batchId: ID.batch.b1, studentId: ID.student.s7, rowNumber: 7, studentCode: 'IT000002', email: 'it000002@student.edu.vn', fullName: 'Đinh Văn G',   faculty: 'Information Technology', rowStatus: 'VALID' },
        { id: ID.importRow.ir8, batchId: ID.batch.b1, studentId: null,          rowNumber: 8, studentCode: 'ERR001',   email: 'not-an-email',            fullName: 'Error Row',    faculty: 'Unknown',                rowStatus: 'ERROR',     errorMessage: 'Email không hợp lệ' },
        { id: ID.importRow.ir9, batchId: ID.batch.b1, studentId: null,          rowNumber: 9, studentCode: 'SE123456', email: 'student1@unihub.edu.vn',  fullName: 'Nguyễn Văn A', faculty: 'Software Engineering',   rowStatus: 'DUPLICATE', errorMessage: 'studentCode đã tồn tại' },
      ],
    });
  }
  console.log('✅ StudentImportRows seeded (7 VALID, 1 ERROR, 1 DUPLICATE)');

  // ─── Workshops (independent) ─────────────────────────────────────────────────
  const now = new Date();
  const h = (n: number) => new Date(now.getTime() + n * 60 * 60 * 1000);

  await prisma.workshop.upsert({ where: { id: ID.workshop.w1 }, update: {}, create: { id: ID.workshop.w1, title: 'Kỹ năng phỏng vấn kỹ thuật',  speakerName: 'Nguyễn Thị Bích', roomName: 'E1.001', capacity: 50, confirmedCount: 0, heldCount: 0, feeType: 'FREE',  price: null,   startsAt: h(2),   endsAt: h(4),   status: 'OPEN',      summaryStatus: 'PENDING' } });
  await prisma.workshop.upsert({ where: { id: ID.workshop.w2 }, update: {}, create: { id: ID.workshop.w2, title: 'Product Design cho Developer', speakerName: 'Trần Minh Khoa',  roomName: 'B3.205', capacity: 30, confirmedCount: 0, heldCount: 0, feeType: 'PAID', price: 50000,  startsAt: h(24),  endsAt: h(26),  status: 'OPEN',      summaryStatus: 'PENDING' } });
  await prisma.workshop.upsert({ where: { id: ID.workshop.w3 }, update: {}, create: { id: ID.workshop.w3, title: 'Git & GitHub nâng cao',        speakerName: 'Lê Hoàng Nam',    roomName: 'A2.101', capacity: 80, confirmedCount: 0, heldCount: 0, feeType: 'FREE',  price: null,   startsAt: h(48),  endsAt: h(50),  status: 'DRAFT',     summaryStatus: 'PENDING' } });
  await prisma.workshop.upsert({ where: { id: ID.workshop.w4 }, update: {}, create: { id: ID.workshop.w4, title: 'Clean Code & Refactoring',     speakerName: 'Bùi Quang Huy',   roomName: 'C1.302', capacity: 40, confirmedCount: 0, heldCount: 0, feeType: 'FREE',  price: null,   startsAt: h(-48), endsAt: h(-46), status: 'CLOSED',    summaryStatus: 'PENDING' } });
  await prisma.workshop.upsert({ where: { id: ID.workshop.w5 }, update: {}, create: { id: ID.workshop.w5, title: 'UX Research cơ bản',           speakerName: 'Vũ Thị Lan',      roomName: 'D2.201', capacity: 30, confirmedCount: 0, heldCount: 0, feeType: 'FREE',  price: null,   startsAt: h(72),  endsAt: h(74),  status: 'CANCELLED', summaryStatus: 'PENDING' } });
  await prisma.workshop.upsert({ where: { id: ID.workshop.w6 }, update: {}, create: { id: ID.workshop.w6, title: 'DevOps cho Sinh Viên',         speakerName: 'Đặng Minh Tuấn',  roomName: 'E2.104', capacity: 5,  confirmedCount: 0, heldCount: 0, feeType: 'PAID', price: 100000, startsAt: h(96),  endsAt: h(98),  status: 'OPEN',      summaryStatus: 'PENDING' } });
  await prisma.workshop.upsert({ where: { id: ID.workshop.w7 }, update: {}, create: { id: ID.workshop.w7, title: 'System Design Interview',      speakerName: 'Cao Thị Hương',   roomName: 'B1.101', capacity: 2,  confirmedCount: 0, heldCount: 0, feeType: 'PAID', price: 80000,  startsAt: h(120), endsAt: h(122), status: 'OPEN',      summaryStatus: 'PENDING' } });
  console.log('✅ Workshops seeded (7 workshops)');

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📋 Non-student demo accounts (pre-seeded):');
  console.log('  admin@unihub.edu.vn      / Admin@123456  (ADMIN)');
  console.log('  organizer@unihub.edu.vn  / Organizer@123 (ORGANIZER)');
  console.log('  staff@unihub.edu.vn      / Staff@123     (CHECKIN_STAFF)');
  console.log('  staff2@unihub.edu.vn     / Staff@123     (CHECKIN_STAFF)');
  console.log('\n📚 Student records (import batch):');
  console.log('  SE123456 / student1@unihub.edu.vn  — Nguyễn Văn A');
  console.log('  SE123457 / student2@unihub.edu.vn  — Trần Thị B');
  console.log('  SE123458 / student3@unihub.edu.vn  — Lê Văn C');
  console.log('  SE123459 / student4@unihub.edu.vn  — Phạm Thị D');
  console.log('  SE123460 / student5@unihub.edu.vn  — Hoàng Văn E');
  console.log('  IT000001 / it000001@student.edu.vn — Ngô Thị F');
  console.log('  IT000002 / it000002@student.edu.vn — Đinh Văn G');
  console.log('\n💡 Students are NOT linked to User accounts in seed.');
  console.log('   They will auto-link via email when they register (auth.service.ts)');
  console.log('\n📊 Seeded data summary:');
  console.log('  4 non-student users (ADMIN, ORGANIZER, STAFF×2)');
  console.log('  7 students (independent, userId = null)');
  console.log('  7 workshops (OPEN×4, DRAFT×1, CLOSED×1, CANCELLED×1)');
  console.log('  1 import batch (7 VALID + 1 ERROR + 1 DUPLICATE rows)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
