export const dynamic = "force-dynamic";

import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  switch (user.role) {
    case "admin":          redirect("/admin");
    case "waw_staff":      redirect("/coordinator?section=day");
    case "lions_staff":
    case "bus_coordinator": redirect("/coordinator");
    default:               redirect("/unauthorized");
  }
}
