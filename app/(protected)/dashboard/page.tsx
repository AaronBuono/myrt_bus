export const dynamic = "force-dynamic";

import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  switch (user.role) {
    case "admin":          redirect("/admin");
    case "lions_staff":
    case "bus_coordinator":
    case "waw_staff":      redirect("/coordinator");
    default:               redirect("/unauthorized");
  }
}
