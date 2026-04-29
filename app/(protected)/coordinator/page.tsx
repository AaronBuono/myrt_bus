import { requireRole } from "@/lib/auth";

export default async function CoordinatorPage() {
  await requireRole("bus_coordinator");
  return (
    <div>
      <p className="p-8 text-brand-blue font-bold">Bus Coordinator — coming soon</p>
    </div>
  );
}
