// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // demo users
  const admin = await prisma.user.upsert({
    where: { email: "admin@missioncc.org" },
    update: {},
    create: {
      email: "admin@missioncc.org",
      name: "Admin",
      password: await bcrypt.hash("admin123", 10),
      role: "ADMIN",
    },
  });

  const leader = await prisma.user.upsert({
    where: { email: "leader@missioncc.org" },
    update: {},
    create: {
      email: "leader@missioncc.org",
      name: "Leader",
      password: await bcrypt.hash("leader123", 10),
      role: "LEADER",
    },
  });

  // course
  const course = await prisma.course.upsert({
    where: { slug: "basics" },
    update: {},
    create: {
      slug: "basics",
      title: "Basics",
      summary: "An 8-week journey in Christian spiritual foundations.",
      thumbnail: "/images/courses/basics.jpg",
      isPublished: true,
    },
  });

  // sessions (use CourseSession, not Session)
  for (let i = 1; i <= 8; i++) {
    await prisma.courseSession.upsert({
      where: { courseId_index: { courseId: course.id, index: i } },
      update: {},
      create: {
        courseId: course.id,
        index: i,
        title: `Week ${i} title`,
        summary: `Week ${i} summary`,
        videoUrl: `/videos/week${i}.mp4`,
        captionsVttUrl: `/captions/week${i}.vtt`,
        transcript: `[Transcript placeholder for Week ${i}]`,
        guideOnlineUrl: `/guides/week${i}.html`,
        guidePdfUrl: `/guides/week${i}-fillable.pdf`,
        thumbnail: `/images/weeks/week-${i}.webp`,
      },
    });
  }

  // enroll demo users in the course
  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: admin.id, courseId: course.id } },
    update: {},
    create: { userId: admin.id, courseId: course.id, status: "ACTIVE" },
  });

  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: leader.id, courseId: course.id } },
    update: {},
    create: { userId: leader.id, courseId: course.id, status: "ACTIVE" },
  });

  console.log("Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
