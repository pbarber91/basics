// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Upsert a demo course
  const course = await prisma.course.upsert({
    where: { slug: "basics" },
    update: {
      title: "Basics",
      summary: "An 8-week foundational course.",
      isPublished: true,
    },
    create: {
      slug: "basics",
      title: "Basics",
      summary: "An 8-week foundational course.",
      isPublished: true,
    },
    select: { id: true },
  });

  // Wipe any existing sessions for deterministic seeding
  await prisma.session.deleteMany({ where: { courseId: course.id } });

  // Create 8 sessions (only fields that exist in your Prisma model)
  const sessionsData = Array.from({ length: 8 }, (_, i) => {
    const idx = i + 1;
    return {
      courseId: course.id,
      index: idx,
      title: `Week ${idx}: Lesson`,
      summary: `Overview for week ${idx}`,
      videoUrl: `/videos/week${idx}.mp4`,
      captionsVttUrl: `/captions/week${idx}.vtt`,
      transcript: `Transcript placeholder for week ${idx}`,
      guideOnlineUrl: `/guides/week${idx}.html`,
      guidePdfUrl: `/guides/week${idx}.pdf`,
      thumbnail: `/thumbs/week${idx}.jpg`,
    };
  });

  await prisma.session.createMany({ data: sessionsData });

  // (Optional) ensure the unique (courseId,index) constraint is honored
  // Prisma will error if duplicates are attempted.

  console.log("✅ Seed complete");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
