// lib/saveUpload.ts
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

export type SavedUpload = { publicPath: string; absolutePath: string };

export async function saveImageToPublicDir(
  file: File,
  subdir: string // e.g. "courses/<courseId>"
): Promise<SavedUpload> {
  // Basic guard
  if (!file || file.size === 0) {
    throw new Error("No file received");
  }

  // Generate a safe filename
  const original = file.name || "upload";
  const ext = path.extname(original) || ".png";
  const name = crypto.randomBytes(8).toString("hex") + ext.toLowerCase();

  const dir = path.join(process.cwd(), "public", "uploads", subdir);
  await mkdir(dir, { recursive: true });

  const absolutePath = path.join(dir, name);
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(absolutePath, bytes);

  const publicPath = path.posix.join("/uploads", subdir.replaceAll("\\", "/"), name);
  return { publicPath, absolutePath };
}
