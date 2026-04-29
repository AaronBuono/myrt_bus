import { requireRole } from "@/lib/auth";

export default async function WAWPage() {
  await requireRole("waw_staff");
  return (
    <div>
      <p className="p-8 text-brand-blue font-bold">WAW Check-In — coming soon</p>
    </div>
  );
}
