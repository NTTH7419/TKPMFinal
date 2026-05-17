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

  // ─── StudentImportBatch (independent) — MUST be created first ────────────────
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

  // ─── Students (from import batch) ────────────────────────────────────────────
  // All 7 students from import. Some will be linked to user accounts below.
  // NOTE: Do NOT set IDs manually — let Prisma auto-generate UUIDs
  const studentData = [
    { studentCode: 'SE123456', email: 'student1@unihub.edu.vn',  fullName: 'Nguyễn Văn A', faculty: 'Software Engineering'    },
    { studentCode: 'SE123457', email: 'student2@unihub.edu.vn',  fullName: 'Trần Thị B',   faculty: 'Software Engineering'    },
    { studentCode: 'SE123458', email: 'student3@unihub.edu.vn',  fullName: 'Lê Văn C',     faculty: 'Information Systems'     },
    { studentCode: 'SE123459', email: 'student4@unihub.edu.vn',  fullName: 'Phạm Thị D',   faculty: 'Computer Science'        },
    { studentCode: 'SE123460', email: 'student5@unihub.edu.vn',  fullName: 'Hoàng Văn E',  faculty: 'Software Engineering'    },
    { studentCode: 'IT000001', email: 'it000001@student.edu.vn', fullName: 'Ngô Thị F',    faculty: 'Information Technology'  },
    { studentCode: 'IT000002', email: 'it000002@student.edu.vn', fullName: 'Đinh Văn G',   faculty: 'Information Technology'  },
  ];
  for (const sd of studentData) {
    const result = await prisma.student.upsert({
      where: { studentCode: sd.studentCode },
      update: {},
      create: { ...sd, status: 'ACTIVE', sourceBatchId: ID.batch.b1 },
    });
    console.log(`  Student ${sd.studentCode}: id=${result.id.slice(0,8)}`);
  }
  console.log('✅ Students seeded (7 students from import batch)');

  // ─── StudentImportRows (linked to batch) ────────────────────────────────────
  // Fetch actual student IDs from DB (they're now auto-generated UUIDs)
  const studentMap: Record<string, string> = {};
  for (const code of ['SE123456', 'SE123457', 'SE123458', 'SE123459', 'SE123460', 'IT000001', 'IT000002']) {
    const student = await prisma.student.findUnique({ where: { studentCode: code } });
    if (student) {
      studentMap[code] = student.id;
    }
  }

  const existingRows = await prisma.studentImportRow.findMany({ where: { batchId: ID.batch.b1 } });
  if (existingRows.length === 0) {
    await prisma.studentImportRow.createMany({
      data: [
        { batchId: ID.batch.b1, studentId: studentMap['SE123456'], rowNumber: 1, studentCode: 'SE123456', email: 'student1@unihub.edu.vn',  fullName: 'Nguyễn Văn A', faculty: 'Software Engineering',   rowStatus: 'VALID' },
        { batchId: ID.batch.b1, studentId: studentMap['SE123457'], rowNumber: 2, studentCode: 'SE123457', email: 'student2@unihub.edu.vn',  fullName: 'Trần Thị B',   faculty: 'Software Engineering',   rowStatus: 'VALID' },
        { batchId: ID.batch.b1, studentId: studentMap['SE123458'], rowNumber: 3, studentCode: 'SE123458', email: 'student3@unihub.edu.vn',  fullName: 'Lê Văn C',     faculty: 'Information Systems',    rowStatus: 'VALID' },
        { batchId: ID.batch.b1, studentId: studentMap['SE123459'], rowNumber: 4, studentCode: 'SE123459', email: 'student4@unihub.edu.vn',  fullName: 'Phạm Thị D',   faculty: 'Computer Science',       rowStatus: 'VALID' },
        { batchId: ID.batch.b1, studentId: studentMap['SE123460'], rowNumber: 5, studentCode: 'SE123460', email: 'student5@unihub.edu.vn',  fullName: 'Hoàng Văn E',  faculty: 'Software Engineering',   rowStatus: 'VALID' },
        { batchId: ID.batch.b1, studentId: studentMap['IT000001'], rowNumber: 6, studentCode: 'IT000001', email: 'it000001@student.edu.vn', fullName: 'Ngô Thị F',    faculty: 'Information Technology', rowStatus: 'VALID' },
        { batchId: ID.batch.b1, studentId: studentMap['IT000002'], rowNumber: 7, studentCode: 'IT000002', email: 'it000002@student.edu.vn', fullName: 'Đinh Văn G',   faculty: 'Information Technology', rowStatus: 'VALID' },
        { batchId: ID.batch.b1, studentId: null,                   rowNumber: 8, studentCode: 'ERR001',   email: 'not-an-email',            fullName: 'Error Row',    faculty: 'Unknown',                rowStatus: 'ERROR',     errorMessage: 'Email không hợp lệ' },
        { batchId: ID.batch.b1, studentId: null,                   rowNumber: 9, studentCode: 'SE123456', email: 'student1@unihub.edu.vn',  fullName: 'Nguyễn Văn A', faculty: 'Software Engineering',   rowStatus: 'DUPLICATE', errorMessage: 'studentCode đã tồn tại' },
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

  // ═══════════════════════════════════════════════════════════════════════════════
  // PHASE 2: Seed student user accounts (4 out of 7) + link + sample registrations
  // ═══════════════════════════════════════════════════════════════════════════════

  const studentRole = await prisma.role.findUniqueOrThrow({ where: { code: 'STUDENT' } });

  // ─── Student User Accounts (4 students — enough for demo) ───────────────────
  const studentUsers = [
    { email: 'student1@unihub.edu.vn', password: 'Student@123', fullName: 'Nguyễn Văn A' },
    { email: 'student2@unihub.edu.vn', password: 'Student@123', fullName: 'Trần Thị B' },
    { email: 'student3@unihub.edu.vn', password: 'Student@123', fullName: 'Lê Văn C' },
    { email: 'student4@unihub.edu.vn', password: 'Student@123', fullName: 'Phạm Thị D' },
    { email: 'student5@unihub.edu.vn', password: 'Student@123', fullName: 'Hoàng Văn E' },
    { email: 'it000001@student.edu.vn', password: 'Student@123', fullName: 'Ngô Thị F' },
    { email: 'it000002@student.edu.vn', password: 'Student@123', fullName: 'Đinh Văn G' },
  ];

  // Map student emails to student codes (UPPERCASE)
  const studentCodeMap: Record<string, string> = {
    'student1@unihub.edu.vn': 'SE123456',
    'student2@unihub.edu.vn': 'SE123457',
    'student3@unihub.edu.vn': 'SE123458',
    'student4@unihub.edu.vn': 'SE123459',
    'student5@unihub.edu.vn': 'SE123460',
    'it000001@student.edu.vn': 'IT000001',
    'it000002@student.edu.vn': 'IT000002',
  };

  const linkedStudents: { userId: string; studentId: string }[] = [];
  for (const su of studentUsers) {
    const hash = await bcrypt.hash(su.password, 12);
    const user = await prisma.user.upsert({
      where: { email: su.email },
      update: {},
      create: { email: su.email, passwordHash: hash, fullName: su.fullName, status: 'ACTIVE' },
    });

    // Link to Student record — use studentCode (unique) to avoid updateMany conflicts
    const studentCode = studentCodeMap[su.email];
    if (!studentCode) {
      throw new Error(`No studentCode mapping for ${su.email}`);
    }

    const studentBefore = await prisma.student.findUnique({ where: { studentCode } });
    console.log(`  Linking ${su.email} (${studentCode}): student before = ${studentBefore?.id.slice(0,8)}`);

    await prisma.student.update({
      where: { studentCode },
      data: { userId: user.id },
    });

    // Assign STUDENT role
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: studentRole.id } },
      update: {},
      create: { userId: user.id, roleId: studentRole.id },
    });

    // Track for sample registrations
    const student = await prisma.student.findUnique({ where: { studentCode } });
    if (student) {
      linkedStudents.push({ userId: user.id, studentId: student.id });
      console.log(`  → ${su.email}: user ${user.id.slice(0,8)} linked to student ${student.id.slice(0,8)}`);
    } else {
      console.log(`  ⚠️ ${su.email} (${studentCode}): no student found!`);
    }
  }
  console.log('✅ Student user accounts seeded (7 accounts, password: Student@123)');


  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📋 Demo accounts (pre-seeded):');
  console.log('\n  🔐 Non-student accounts:');
  console.log('    admin@unihub.edu.vn      / Admin@123456  (ADMIN)');
  console.log('    organizer@unihub.edu.vn  / Organizer@123 (ORGANIZER)');
  console.log('    staff@unihub.edu.vn      / Staff@123     (CHECKIN_STAFF)');
  console.log('    staff2@unihub.edu.vn     / Staff@123     (CHECKIN_STAFF)');
  console.log('\n  👨‍🎓 Student accounts (linked + can register):');
  console.log('    student1@unihub.edu.vn     / Student@123   (SE123456 — Nguyễn Văn A)');
  console.log('    student2@unihub.edu.vn     / Student@123   (SE123457 — Trần Thị B)');
  console.log('    student3@unihub.edu.vn     / Student@123   (SE123458 — Lê Văn C)');
  console.log('    student4@unihub.edu.vn     / Student@123   (SE123459 — Phạm Thị D)');
  console.log('    student5@unihub.edu.vn     / Student@123   (SE123460 — Hoàng Văn E)');
  console.log('    it000001@student.edu.vn    / Student@123   (IT000001 — Ngô Thị F)');
  console.log('    it000002@student.edu.vn    / Student@123   (IT000002 — Đinh Văn G)');
  console.log('\n📊 Seeded data summary:');
  console.log('  Roles: 4 (STUDENT, ORGANIZER, CHECKIN_STAFF, ADMIN)');
  console.log('  Users: 11 (4 non-student + 7 student with accounts)');
  console.log('  Students: 7 (all linked to user accounts)');
  console.log('  Workshops: 7 (OPEN×4, DRAFT×1, CLOSED×1, CANCELLED×1)');
  console.log('  Import batch: 1 (7 VALID + 1 ERROR + 1 DUPLICATE rows)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
