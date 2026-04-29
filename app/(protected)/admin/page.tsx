import { requireRole } from "@/lib/auth";

export default async function AdminPage() {
  await requireRole("lions_admin");
  return (
    <div>
      <p className="p-8 text-brand-blue font-bold">Admin Portal — coming soon</p>
    </div>
  );
}
