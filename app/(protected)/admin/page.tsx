import { requireRole } from "@/lib/auth";
import AdminNav, { type AdminSection } from "@/components/admin/AdminNav";
import DashboardSection from "./sections/DashboardSection";
import BookingsSection from "./sections/BookingsSection";
import PricingSection from "./sections/PricingSection";
import ConditionsSection from "./sections/ConditionsSection";
import OrgsSection from "./sections/OrgsSection";
import StaffSection from "./sections/StaffSection";
import SettingsSection from "./sections/SettingsSection";

type SearchParams = Promise<{
  section?: string;
  status?: string;
  category?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  editId?: string;
  create?: string;
}>;

export default async function AdminPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole("lions_admin");
  const params = await searchParams;
  const section = (params.section ?? "dashboard") as AdminSection;

  return (
    <>
      <AdminNav section={section} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {section === "dashboard" && <DashboardSection />}
        {section === "bookings" && (
          <BookingsSection
            status={params.status}
            category={params.category}
            search={params.search}
            dateFrom={params.dateFrom}
            dateTo={params.dateTo}
          />
        )}
        {section === "pricing" && <PricingSection />}
        {section === "conditions" && <ConditionsSection />}
        {section === "orgs" && (
          <OrgsSection
            editId={params.editId}
            create={params.create === "1"}
          />
        )}
        {section === "staff" && (
          <StaffSection
            editId={params.editId}
            create={params.create === "1"}
          />
        )}
        {section === "settings" && <SettingsSection />}
      </div>
    </>
  );
}
