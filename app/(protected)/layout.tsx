export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import ProtectedHeader from "@/components/ProtectedHeader";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) redirect("/login");

  return (
    <>
      <ProtectedHeader user={user} />
      <main>{children}</main>
    </>
  );
}
