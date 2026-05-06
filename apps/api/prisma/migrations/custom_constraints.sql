-- Custom partial indexes not expressible in Prisma schema

-- One active registration per student per workshop
-- (excludes CANCELLED and EXPIRED from uniqueness constraint)
CREATE UNIQUE INDEX IF NOT EXISTS uq_registrations_active
  ON registrations (workshop_id, student_id)
  WHERE status NOT IN ('CANCELLED', 'EXPIRED');

-- Prevent duplicate notifications per channel
-- (already handled by @@unique in Prisma schema, this is a safety check)

-- Capacity constraint (enforced at application level via SELECT FOR UPDATE,
-- this is an extra safety net)
ALTER TABLE workshops
  ADD CONSTRAINT chk_capacity
  CHECK (confirmed_count + held_count <= capacity);
