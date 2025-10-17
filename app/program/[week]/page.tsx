// app/program/[week]/page.tsx
import { redirect } from "next/navigation";
export default function SessionRedirect({ params }: { params: { week: string } }) {
  redirect(`/courses/basics/${params.week}`);
}
