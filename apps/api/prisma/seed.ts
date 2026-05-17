import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function qrHash(key: string) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

// ─── Fixed UUIDs (v4 format — required by @IsUUID() validation) ──────────────
const ID = {
  // Users
  user: {
    admin:     'a0000000-0000-4000-8000-000000000001',
    organizer: 'a0000000-0000-4000-8000-000000000002',
    staff:     'a0000000-0000-4000-8000-000000000003',
    staff2:    'a0000000-0000-4000-8000-000000000004',
    student1:  'a0000000-0000-4000-8000-000000000011',
    student2:  'a0000000-0000-4000-8000-000000000012',
    student3:  'a0000000-0000-4000-8000-000000000013',
    student4:  'a0000000-0000-4000-8000-000000000014',
  },
  // Students
  student: {
    s1: 'b0000000-0000-4000-8000-000000000001',
    s2: 'b0000000-0000-4000-8000-000000000002',
    s3: 'b0000000-0000-4000-8000-000000000003',
    s4: 'b0000000-0000-4000-8000-000000000004',
    s5: 'b0000000-0000-4000-8000-000000000005',
    s6: 'b0000000-0000-4000-8000-000000000006',
    s7: 'b0000000-0000-4000-8000-000000000007',
  },
  // Workshops
  workshop: {
    w1: 'c0000000-0000-4000-8000-000000000001',
    w2: 'c0000000-0000-4000-8000-000000000002',
    w3: 'c0000000-0000-4000-8000-000000000003',
    w4: 'c0000000-0000-4000-8000-000000000004',
    w5: 'c0000000-0000-4000-8000-000000000005',
    w6: 'c0000000-0000-4000-8000-000000000006',
    w7: 'c0000000-0000-4000-8000-000000000007',
  },
  // Registrations
  reg: {
    r1: 'd0000000-0000-4000-8000-000000000001',
    r2: 'd0000000-0000-4000-8000-000000000002',
    r3: 'd0000000-0000-4000-8000-000000000003',
    r4: 'd0000000-0000-4000-8000-000000000004',
    r5: 'd0000000-0000-4000-8000-000000000005',
    r6: 'd0000000-0000-4000-8000-000000000006',
    r7: 'd0000000-0000-4000-8000-000000000007',
    r8: 'd0000000-0000-4000-8000-000000000008',
    // idempotencyKey
    ikey: {
      r1: 'd0000000-0000-4000-8001-000000000001',
      r2: 'd0000000-0000-4000-8001-000000000002',
      r3: 'd0000000-0000-4000-8001-000000000003',
      r4: 'd0000000-0000-4000-8001-000000000004',
      r5: 'd0000000-0000-4000-8001-000000000005',
      r6: 'd0000000-0000-4000-8001-000000000006',
      r7: 'd0000000-0000-4000-8001-000000000007',
      r8: 'd0000000-0000-4000-8001-000000000008',
    },
  },
  // Payments
  pay: {
    p1: 'e0000000-0000-4000-8000-000000000001',
    p2: 'e0000000-0000-4000-8000-000000000002',
    p3: 'e0000000-0000-4000-8000-000000000003',
    p4: 'e0000000-0000-4000-8000-000000000004',
    // idempotencyKey
    ikey: {
      p1: 'e0000000-0000-4000-8001-000000000001',
      p2: 'e0000000-0000-4000-8001-000000000002',
      p3: 'e0000000-0000-4000-8001-000000000003',
      p4: 'e0000000-0000-4000-8001-000000000004',
    },
    // paymentIntentId
    intent: {
      p1: 'e0000000-0000-4000-8002-000000000001',
      p2: 'e0000000-0000-4000-8002-000000000002',
      p3: 'e0000000-0000-4000-8002-000000000003',
      p4: 'e0000000-0000-4000-8002-000000000004',
    },
  },
  // CheckinEvents
  checkin: {
    c1: 'f0000000-0000-4000-8000-000000000001',
    c2: 'f0000000-0000-4000-8000-000000000002',
    c3: 'f0000000-0000-4000-8000-000000000003',
    c4: 'f0000000-0000-4000-8000-000000000004',
    // eventId — UUID từ PWA
    eventId: {
      c1: 'f0000000-0000-4000-8001-000000000001',
      c2: 'f0000000-0000-4000-8001-000000000002',
      c3: 'f0000000-0000-4000-8001-000000000003',
      c4: 'f0000000-0000-4000-8001-000000000004',
    },
    // deviceId
    deviceId: {
      staff1: 'f0000000-0000-4000-8002-000000000001',
      staff2: 'f0000000-0000-4000-8002-000000000002',
    },
  },
  // StudentImportBatch
  batch: {
    b1: '10000000-0000-4000-8000-000000000001',
  },
  // StudentImportRows
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
  // NotificationEvents
  notif: {
    n1: '30000000-0000-4000-8000-000000000001',
    n2: '30000000-0000-4000-8000-000000000002',
    n3: '30000000-0000-4000-8000-000000000003',
    n4: '30000000-0000-4000-8000-000000000004',
    n5: '30000000-0000-4000-8000-000000000005',
  },
};

async function main() {
  console.log('🌱 Seeding database...');

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
  const studentRole   = await prisma.role.findUniqueOrThrow({ where: { code: 'STUDENT' } });
  const checkinRole   = await prisma.role.findUniqueOrThrow({ where: { code: 'CHECKIN_STAFF' } });
  console.log('✅ Roles seeded');

  // ─── Helper: upsert user + assign role ──────────────────────────────────────
  async function upsertUser(id: string, email: string, password: string, fullName: string, roleId: string) {
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

  // ─── Non-student users ───────────────────────────────────────────────────────
  await upsertUser(ID.user.admin,     'admin@unihub.edu.vn',     'Admin@123456',  'System Administrator',  adminRole.id);
  await upsertUser(ID.user.organizer, 'organizer@unihub.edu.vn', 'Organizer@123', 'Demo Organizer',        organizerRole.id);
  const staffUser  = await upsertUser(ID.user.staff,  'staff@unihub.edu.vn',  'Staff@123', 'Demo Check-in Staff',   checkinRole.id);
  const staffUser2 = await upsertUser(ID.user.staff2, 'staff2@unihub.edu.vn', 'Staff@123', 'Demo Check-in Staff 2', checkinRole.id);
  console.log('✅ Admin / Organizer / Staff users seeded');

  // ─── StudentImportBatch (seed trước để Student.sourceBatchId hợp lệ) ─────────
  const batchChecksum = crypto.createHash('sha256').update('seed-batch-demo-v1').digest('hex');
  const batch = await prisma.studentImportBatch.upsert({
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

  // ─── Students (đến từ batch, userId = null ban đầu) ──────────────────────────
  const studentData = [
    { id: ID.student.s1, studentCode: 'SE123456', email: 'student@unihub.edu.vn',       fullName: 'Nguyễn Văn A', faculty: 'Software Engineering'    },
    { id: ID.student.s2, studentCode: 'SE123457', email: 'student2@unihub.edu.vn',      fullName: 'Trần Thị B',   faculty: 'Software Engineering'    },
    { id: ID.student.s3, studentCode: 'SE123458', email: 'student3@unihub.edu.vn',      fullName: 'Lê Văn C',     faculty: 'Information Systems'     },
    { id: ID.student.s4, studentCode: 'SE123459', email: 'student4@unihub.edu.vn',      fullName: 'Phạm Thị D',   faculty: 'Computer Science'        },
    { id: ID.student.s5, studentCode: 'SE123460', email: 'student5@unihub.edu.vn',      fullName: 'Hoàng Văn E',  faculty: 'Software Engineering'    },
    { id: ID.student.s6, studentCode: 'IT000001', email: 'it000001@student.edu.vn',     fullName: 'Ngô Thị F',    faculty: 'Information Technology'  },
    { id: ID.student.s7, studentCode: 'IT000002', email: 'it000002@student.edu.vn',     fullName: 'Đinh Văn G',   faculty: 'Information Technology'  },
  ];
  for (const sd of studentData) {
    await prisma.student.upsert({
      where: { studentCode: sd.studentCode },
      update: {},
      create: { ...sd, status: 'ACTIVE', sourceBatchId: batch.id },
    });
  }
  console.log('✅ Students seeded from batch (7 students, userId = null)');

  // ─── Import rows ─────────────────────────────────────────────────────────────
  const existingRows = await prisma.studentImportRow.findMany({ where: { batchId: batch.id } });
  if (existingRows.length === 0) {
    await prisma.studentImportRow.createMany({
      data: [
        { id: ID.importRow.ir1, batchId: batch.id, studentId: ID.student.s1, rowNumber: 1, studentCode: 'SE123456', email: 'student@unihub.edu.vn',   fullName: 'Nguyễn Văn A', faculty: 'Software Engineering',   rowStatus: 'VALID' },
        { id: ID.importRow.ir2, batchId: batch.id, studentId: ID.student.s2, rowNumber: 2, studentCode: 'SE123457', email: 'student2@unihub.edu.vn',  fullName: 'Trần Thị B',   faculty: 'Software Engineering',   rowStatus: 'VALID' },
        { id: ID.importRow.ir3, batchId: batch.id, studentId: ID.student.s3, rowNumber: 3, studentCode: 'SE123458', email: 'student3@unihub.edu.vn',  fullName: 'Lê Văn C',     faculty: 'Information Systems',    rowStatus: 'VALID' },
        { id: ID.importRow.ir4, batchId: batch.id, studentId: ID.student.s4, rowNumber: 4, studentCode: 'SE123459', email: 'student4@unihub.edu.vn',  fullName: 'Phạm Thị D',   faculty: 'Computer Science',       rowStatus: 'VALID' },
        { id: ID.importRow.ir5, batchId: batch.id, studentId: ID.student.s5, rowNumber: 5, studentCode: 'SE123460', email: 'student5@unihub.edu.vn',  fullName: 'Hoàng Văn E',  faculty: 'Software Engineering',   rowStatus: 'VALID' },
        { id: ID.importRow.ir6, batchId: batch.id, studentId: ID.student.s6, rowNumber: 6, studentCode: 'IT000001', email: 'it000001@student.edu.vn', fullName: 'Ngô Thị F',    faculty: 'Information Technology', rowStatus: 'VALID' },
        { id: ID.importRow.ir7, batchId: batch.id, studentId: ID.student.s7, rowNumber: 7, studentCode: 'IT000002', email: 'it000002@student.edu.vn', fullName: 'Đinh Văn G',   faculty: 'Information Technology', rowStatus: 'VALID' },
        { id: ID.importRow.ir8, batchId: batch.id, studentId: null,          rowNumber: 8, studentCode: 'ERR001',   email: 'not-an-email',            fullName: 'Error Row',    faculty: 'Unknown',                rowStatus: 'ERROR',     errorMessage: 'Email không hợp lệ' },
        { id: ID.importRow.ir9, batchId: batch.id, studentId: null,          rowNumber: 9, studentCode: 'SE123456', email: 'student@unihub.edu.vn',   fullName: 'Nguyễn Văn A', faculty: 'Software Engineering',   rowStatus: 'DUPLICATE', errorMessage: 'studentCode đã tồn tại' },
      ],
    });
  }
  console.log('✅ StudentImportRows seeded (7 VALID, 1 ERROR, 1 DUPLICATE)');

  // ─── Student users (đăng ký web → auto-link với Student record) ─────────────
  // SE123456–SE123459 đã đăng ký tài khoản và được link.
  // SE123460, IT000001, IT000002 chưa đăng ký → userId = null (test STUDENT_NOT_VERIFIED).
  const linkedStudents = [
    { id: ID.user.student1, email: 'student@unihub.edu.vn',  password: 'Student@123', fullName: 'Nguyễn Văn A', code: 'SE123456' },
    { id: ID.user.student2, email: 'student2@unihub.edu.vn', password: 'Student@123', fullName: 'Trần Thị B',   code: 'SE123457' },
    { id: ID.user.student3, email: 'student3@unihub.edu.vn', password: 'Student@123', fullName: 'Lê Văn C',     code: 'SE123458' },
    { id: ID.user.student4, email: 'student4@unihub.edu.vn', password: 'Student@123', fullName: 'Phạm Thị D',   code: 'SE123459' },
  ];
  for (const su of linkedStudents) {
    await upsertUser(su.id, su.email, su.password, su.fullName, studentRole.id);
    // Mô phỏng auto-link của auth.service.ts
    await prisma.student.updateMany({
      where: { email: su.email, userId: null },
      data: { userId: su.id },
    });
  }
  console.log('✅ Student users seeded & linked (SE123456–SE123459)');
  console.log('   SE123460, IT000001, IT000002 → chưa có tài khoản web (userId = null)');

  // ─── Workshops ───────────────────────────────────────────────────────────────
  const now = new Date();
  const h = (n: number) => new Date(now.getTime() + n * 60 * 60 * 1000);

  await prisma.workshop.upsert({ where: { id: ID.workshop.w1 }, update: {}, create: { id: ID.workshop.w1, title: 'Kỹ năng phỏng vấn kỹ thuật',  speakerName: 'Nguyễn Thị Bích', roomName: 'E1.001', capacity: 50, confirmedCount: 2,  heldCount: 0, feeType: 'FREE',  price: null,   startsAt: h(2),   endsAt: h(4),   status: 'OPEN',      summaryStatus: 'PENDING' } });
  await prisma.workshop.upsert({ where: { id: ID.workshop.w2 }, update: {}, create: { id: ID.workshop.w2, title: 'Product Design cho Developer', speakerName: 'Trần Minh Khoa',  roomName: 'B3.205', capacity: 30, confirmedCount: 2,  heldCount: 0, feeType: 'PAID', price: 50000,  startsAt: h(24),  endsAt: h(26),  status: 'OPEN',      summaryStatus: 'PENDING' } });
  await prisma.workshop.upsert({ where: { id: ID.workshop.w3 }, update: {}, create: { id: ID.workshop.w3, title: 'Git & GitHub nâng cao',        speakerName: 'Lê Hoàng Nam',    roomName: 'A2.101', capacity: 80, confirmedCount: 0,  heldCount: 0, feeType: 'FREE',  price: null,   startsAt: h(48),  endsAt: h(50),  status: 'DRAFT',     summaryStatus: 'PENDING' } });
  await prisma.workshop.upsert({ where: { id: ID.workshop.w4 }, update: {}, create: { id: ID.workshop.w4, title: 'Clean Code & Refactoring',     speakerName: 'Bùi Quang Huy',   roomName: 'C1.302', capacity: 40, confirmedCount: 38, heldCount: 0, feeType: 'FREE',  price: null,   startsAt: h(-48), endsAt: h(-46), status: 'CLOSED',    summaryStatus: 'PENDING' } });
  await prisma.workshop.upsert({ where: { id: ID.workshop.w5 }, update: {}, create: { id: ID.workshop.w5, title: 'UX Research cơ bản',           speakerName: 'Vũ Thị Lan',      roomName: 'D2.201', capacity: 30, confirmedCount: 0,  heldCount: 0, feeType: 'FREE',  price: null,   startsAt: h(72),  endsAt: h(74),  status: 'CANCELLED', summaryStatus: 'PENDING' } });
  await prisma.workshop.upsert({ where: { id: ID.workshop.w6 }, update: {}, create: { id: ID.workshop.w6, title: 'DevOps cho Sinh Viên',         speakerName: 'Đặng Minh Tuấn',  roomName: 'E2.104', capacity: 5,  confirmedCount: 1,  heldCount: 0, feeType: 'PAID', price: 100000, startsAt: h(96),  endsAt: h(98),  status: 'OPEN',      summaryStatus: 'PENDING' } });
  await prisma.workshop.upsert({ where: { id: ID.workshop.w7 }, update: {}, create: { id: ID.workshop.w7, title: 'System Design Interview',      speakerName: 'Cao Thị Hương',   roomName: 'B1.101', capacity: 2,  confirmedCount: 2,  heldCount: 0, feeType: 'PAID', price: 80000,  startsAt: h(120), endsAt: h(122), status: 'OPEN',      summaryStatus: 'PENDING' } });
  console.log('✅ Workshops seeded (7 workshops)');

  // ─── Registrations ───────────────────────────────────────────────────────────
  // Lấy id thực của student từ DB (studentCode là unique, stable)
  const dbS1 = await prisma.student.findUniqueOrThrow({ where: { studentCode: 'SE123456' } });
  const dbS2 = await prisma.student.findUniqueOrThrow({ where: { studentCode: 'SE123457' } });
  const dbS3 = await prisma.student.findUniqueOrThrow({ where: { studentCode: 'SE123458' } });
  const dbS4 = await prisma.student.findUniqueOrThrow({ where: { studentCode: 'SE123459' } });

  // workshop-001 FREE: s1 CONFIRMED, s2 CONFIRMED, s3 EXPIRED
  const reg1 = await prisma.registration.upsert({ where: { idempotencyKey: ID.reg.ikey.r1 }, update: {}, create: { id: ID.reg.r1, workshopId: ID.workshop.w1, studentId: dbS1.id, status: 'CONFIRMED', idempotencyKey: ID.reg.ikey.r1, qrTokenHash: qrHash(ID.reg.ikey.r1), holdExpiresAt: null } });
  const reg2 = await prisma.registration.upsert({ where: { idempotencyKey: ID.reg.ikey.r2 }, update: {}, create: { id: ID.reg.r2, workshopId: ID.workshop.w1, studentId: dbS2.id, status: 'CONFIRMED', idempotencyKey: ID.reg.ikey.r2, qrTokenHash: qrHash(ID.reg.ikey.r2), holdExpiresAt: null } });
  const reg3 = await prisma.registration.upsert({ where: { idempotencyKey: ID.reg.ikey.r3 }, update: {}, create: { id: ID.reg.r3, workshopId: ID.workshop.w1, studentId: dbS3.id, status: 'EXPIRED',   idempotencyKey: ID.reg.ikey.r3, qrTokenHash: null,                   holdExpiresAt: new Date(now.getTime() - 30 * 60 * 1000) } });
  // workshop-002 PAID 50k: s4 CONFIRMED, s2 CANCELLED
  const reg4 = await prisma.registration.upsert({ where: { idempotencyKey: ID.reg.ikey.r4 }, update: {}, create: { id: ID.reg.r4, workshopId: ID.workshop.w2, studentId: dbS4.id, status: 'CONFIRMED', idempotencyKey: ID.reg.ikey.r4, qrTokenHash: qrHash(ID.reg.ikey.r4), holdExpiresAt: null } });
  await prisma.registration.upsert({              where: { idempotencyKey: ID.reg.ikey.r5 }, update: {}, create: { id: ID.reg.r5, workshopId: ID.workshop.w2, studentId: dbS2.id, status: 'CANCELLED', idempotencyKey: ID.reg.ikey.r5, qrTokenHash: null,                   holdExpiresAt: null } });
  // workshop-006 PAID 100k gần đầy: s1 CONFIRMED
  const reg6 = await prisma.registration.upsert({ where: { idempotencyKey: ID.reg.ikey.r6 }, update: {}, create: { id: ID.reg.r6, workshopId: ID.workshop.w6, studentId: dbS1.id, status: 'CONFIRMED', idempotencyKey: ID.reg.ikey.r6, qrTokenHash: qrHash(ID.reg.ikey.r6), holdExpiresAt: null } });
  // workshop-007 PAID 80k hết chỗ (capacity=2): s2 + s4 CONFIRMED
  const reg7 = await prisma.registration.upsert({ where: { idempotencyKey: ID.reg.ikey.r7 }, update: {}, create: { id: ID.reg.r7, workshopId: ID.workshop.w7, studentId: dbS2.id, status: 'CONFIRMED', idempotencyKey: ID.reg.ikey.r7, qrTokenHash: qrHash(ID.reg.ikey.r7), holdExpiresAt: null } });
  const reg8 = await prisma.registration.upsert({ where: { idempotencyKey: ID.reg.ikey.r8 }, update: {}, create: { id: ID.reg.r8, workshopId: ID.workshop.w7, studentId: dbS4.id, status: 'CONFIRMED', idempotencyKey: ID.reg.ikey.r8, qrTokenHash: qrHash(ID.reg.ikey.r8), holdExpiresAt: null } });
  console.log('✅ Registrations seeded (8: CONFIRMED×5, EXPIRED×1, CANCELLED×1)');

  // ─── Payments (chỉ paid workshops) ──────────────────────────────────────────
  await prisma.payment.upsert({ where: { idempotencyKey: ID.pay.ikey.p1 }, update: {}, create: { id: ID.pay.p1, registrationId: reg4.id, gateway: 'MOCK', paymentIntentId: ID.pay.intent.p1, idempotencyKey: ID.pay.ikey.p1, amount: 50000,  status: 'SUCCEEDED', gatewayPayload: { note: 'seed' } } });
  await prisma.payment.upsert({ where: { idempotencyKey: ID.pay.ikey.p2 }, update: {}, create: { id: ID.pay.p2, registrationId: reg6.id, gateway: 'MOCK', paymentIntentId: ID.pay.intent.p2, idempotencyKey: ID.pay.ikey.p2, amount: 100000, status: 'SUCCEEDED', gatewayPayload: { note: 'seed' } } });
  await prisma.payment.upsert({ where: { idempotencyKey: ID.pay.ikey.p3 }, update: {}, create: { id: ID.pay.p3, registrationId: reg7.id, gateway: 'MOCK', paymentIntentId: ID.pay.intent.p3, idempotencyKey: ID.pay.ikey.p3, amount: 80000,  status: 'SUCCEEDED', gatewayPayload: { note: 'seed' } } });
  await prisma.payment.upsert({ where: { idempotencyKey: ID.pay.ikey.p4 }, update: {}, create: { id: ID.pay.p4, registrationId: reg8.id, gateway: 'MOCK', paymentIntentId: ID.pay.intent.p4, idempotencyKey: ID.pay.ikey.p4, amount: 80000,  status: 'SUCCEEDED', gatewayPayload: { note: 'seed' } } });
  console.log('✅ Payments seeded (4 × SUCCEEDED)');

  // ─── CheckinEvents ───────────────────────────────────────────────────────────
  const scanBase = new Date(now.getTime() - 60 * 60 * 1000);
  await prisma.checkinEvent.upsert({ where: { eventId: ID.checkin.eventId.c1 }, update: {}, create: { id: ID.checkin.c1, eventId: ID.checkin.eventId.c1, registrationId: reg1.id, workshopId: ID.workshop.w1, staffUserId: staffUser.id,  deviceId: ID.checkin.deviceId.staff1, scannedAt: scanBase,                                         syncedAt: scanBase, status: 'ACCEPTED'  } });
  await prisma.checkinEvent.upsert({ where: { eventId: ID.checkin.eventId.c2 }, update: {}, create: { id: ID.checkin.c2, eventId: ID.checkin.eventId.c2, registrationId: reg2.id, workshopId: ID.workshop.w1, staffUserId: staffUser.id,  deviceId: ID.checkin.deviceId.staff1, scannedAt: new Date(scanBase.getTime() +  5 * 60 * 1000), syncedAt: scanBase, status: 'ACCEPTED'  } });
  await prisma.checkinEvent.upsert({ where: { eventId: ID.checkin.eventId.c3 }, update: {}, create: { id: ID.checkin.c3, eventId: ID.checkin.eventId.c3, registrationId: reg1.id, workshopId: ID.workshop.w1, staffUserId: staffUser2.id, deviceId: ID.checkin.deviceId.staff2, scannedAt: new Date(scanBase.getTime() + 10 * 60 * 1000), syncedAt: scanBase, status: 'DUPLICATE' } });
  await prisma.checkinEvent.upsert({ where: { eventId: ID.checkin.eventId.c4 }, update: {}, create: { id: ID.checkin.c4, eventId: ID.checkin.eventId.c4, registrationId: reg3.id, workshopId: ID.workshop.w1, staffUserId: staffUser.id,  deviceId: ID.checkin.deviceId.staff1, scannedAt: new Date(scanBase.getTime() + 15 * 60 * 1000), syncedAt: scanBase, status: 'INVALID'   } });
  console.log('✅ CheckinEvents seeded (ACCEPTED×2, DUPLICATE×1, INVALID×1)');

  // ─── NotificationEvents ──────────────────────────────────────────────────────
  // Lấy id thực từ DB (user có thể đã tồn tại với id khác trước khi seed này)
  const dbAdmin    = await prisma.user.findUniqueOrThrow({ where: { email: 'admin@unihub.edu.vn' } });
  const dbStudent1 = await prisma.user.findUniqueOrThrow({ where: { email: 'student@unihub.edu.vn' } });
  const dbStudent2 = await prisma.user.findUniqueOrThrow({ where: { email: 'student2@unihub.edu.vn' } });
  const dbStudent4 = await prisma.user.findUniqueOrThrow({ where: { email: 'student4@unihub.edu.vn' } });

  const notifData = [
    { id: ID.notif.n1, eventType: 'RegistrationConfirmed', recipientUserId: dbStudent1.id, status: 'PROCESSED', isRead: true,  readAt: new Date(now.getTime() - 60 * 60 * 1000), payload: { workshopTitle: 'Kỹ năng phỏng vấn kỹ thuật',  registrationId: reg1.id } },
    { id: ID.notif.n2, eventType: 'RegistrationConfirmed', recipientUserId: dbStudent2.id, status: 'PROCESSED', isRead: false, readAt: null, payload: { workshopTitle: 'Kỹ năng phỏng vấn kỹ thuật',  registrationId: reg2.id } },
    { id: ID.notif.n3, eventType: 'PaymentSucceeded',      recipientUserId: dbStudent4.id, status: 'PROCESSED', isRead: false, readAt: null, payload: { workshopTitle: 'Product Design cho Developer', amount: 50000 } },
    { id: ID.notif.n4, eventType: 'WorkshopCancelled',     recipientUserId: dbAdmin.id,    status: 'PROCESSED', isRead: false, readAt: null, payload: { workshopTitle: 'UX Research cơ bản' } },
    { id: ID.notif.n5, eventType: 'RegistrationConfirmed', recipientUserId: dbStudent4.id, status: 'PENDING',   isRead: false, readAt: null, payload: { workshopTitle: 'DevOps cho Sinh Viên',        registrationId: reg6.id } },
  ];
  for (const n of notifData) {
    await prisma.notificationEvent.upsert({ where: { id: n.id }, update: {}, create: n });
  }
  console.log('✅ NotificationEvents seeded (5 events)');

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📋 Demo accounts:');
  console.log('  admin@unihub.edu.vn      / Admin@123456  (ADMIN)');
  console.log('  organizer@unihub.edu.vn  / Organizer@123 (ORGANIZER)');
  console.log('  staff@unihub.edu.vn      / Staff@123     (CHECKIN_STAFF)');
  console.log('  staff2@unihub.edu.vn     / Staff@123     (CHECKIN_STAFF)');
  console.log('  student@unihub.edu.vn    / Student@123   (STUDENT — SE123456, linked ✓)');
  console.log('  student2@unihub.edu.vn   / Student@123   (STUDENT — SE123457, linked ✓)');
  console.log('  student3@unihub.edu.vn   / Student@123   (STUDENT — SE123458, linked ✓)');
  console.log('  student4@unihub.edu.vn   / Student@123   (STUDENT — SE123459, linked ✓)');
  console.log('  [no account]                             (SE123460, IT000001, IT000002)');
  console.log('\n📊 Seeded data summary:');
  console.log('  7 workshops  (OPEN×4, DRAFT×1, CLOSED×1, CANCELLED×1)');
  console.log('  8 registrations (CONFIRMED×5, EXPIRED×1, CANCELLED×1)');
  console.log('  4 payments   (SUCCEEDED — chỉ paid workshops)');
  console.log('  4 checkin events (ACCEPTED×2, DUPLICATE×1, INVALID×1)');
  console.log('  1 import batch (7 VALID + 1 ERROR + 1 DUPLICATE rows)');
  console.log('  5 notifications (read×1, unread×4)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
