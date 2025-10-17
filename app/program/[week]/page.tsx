// app/program/[week]/page.tsx
import { redirect } from "next/navigation";

type Params = { week: string };

export default async function SessionRedirect({
  params,
}: {
  params: Promise<Params>;
}) {
  const { week } = await params; // Next 15: await params
  redirect(`/courses/basics/${encodeURIComponent(week)}`);
}
