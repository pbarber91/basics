// lib/acl.ts
import { prisma } from "@/lib/db";

export type Role = "USER" | "LEADER" | "ADMIN";

export async function canAccessCourse(opts: {
  userId: string;
  role: Role;
  courseId: string;
}) {
  const { userId, role, courseId } = opts;

  // Leaders/Admins can access all courses
  if (role === "ADMIN" || role === "LEADER") return true;

  // Regular users must be enrolled
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: { id: true, status: true },
  });

  return Boolean(enrollment && enrollment.status === "ACTIVE");
}
