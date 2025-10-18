// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // --- Admin user (upsert) ---
  const adminEmail = "admin@example.com";
  const adminPassword = "admin123"; // change later
  const adminHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      // keep role as ADMIN if user already exists
      role: "ADMIN",
    },
    create: {
      email: adminEmail,
      name: "Admin",
      password: adminHash,
      role: "ADMIN",
    },
  });

  // --- One sample course (upsert by slug) ---
  const course = await prisma.course.upsert({
    where: { slug: "basics-101" },
    update: {},
    create: {
      title: "Basics 101",
      slug: "basics-101",
      summary:
        "An 8-week introduction course. Replace this summary with your real copy.",
      thumbnail: null,
      isPublished: true,
    },
  });

  // --- Create/replace 8 sessions for that course ---
  // Remove existing sessions to keep the demo deterministic
  await prisma.courseSession.deleteMany({ where: { courseId: course.id } });

  // If your model name differs (e.g., Session), rename below accordingly.
  // Fields used here must exist in your schema:
  // id (auto), courseId (relation), index (number), title (string),
  // videoUrl (string | null), captionsVttUrl (string | null), transcript (string | null)
  const sessionsData = Array.from({ length: 8 }, (_, i) => {
    const idx = i + 1;
    return {
      courseId: course.id,
      index: idx,
      title: `Week ${idx} — Getting Started`,
      videoUrl: `/videos/week${idx}.mp4`,
      captionsVttUrl: `/captions/week${idx}.vtt`,
      transcript: `Transcript placeholder for Week ${idx}.`,
    };
  });

  // createMany for speed; if you need unique constraints on (courseId,index), ensure they exist in schema
  await prisma.courseSession.createMany({ data: sessionsData });

  // Done
  console.log("Seed complete:");
  console.log(`- Admin: ${adminEmail} / ${adminPassword}`);
  console.log(`- Course: ${course.title} with ${sessionsData.length} sessions`);
}

main()
  .catch((err) => {
    console.error("Seed error:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
