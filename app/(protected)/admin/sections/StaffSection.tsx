import { getStaffUsers } from "@/lib/queries/admin";
import { toggleUserActiveAction, updateStaffUserAction, createStaffUserAction } from "@/app/actions/admin";
import Link from "next/link";

const ROLE_LABELS: Record<string, string> = {
  lions_admin: "Lions Admin",
  bus_coordinator: "Bus Coordinator",
  waw_staff: "WAW Staff",
};

function fmtDate(d: unknown) {
  if (!d) return "Never";
  return new Date(d as string).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

type Props = {
  editId?: string;
  create?: boolean;
};

export default async function StaffSection({ editId, create }: Props) {
  const users = await getStaffUsers();
  const editing = editId ? users.find((u) => u.id === editId) : null;
  const showForm = create || !!editing;

  return (
    <div className="space-y-6">
      {/* Form */}
      {showForm && (
        <div className="card max-w-xl">
          <h2 className="text-base font-bold text-brand-blue mb-4">
            {editing ? `Edit: ${editing.display_name as string}` : "Add Staff Member"}
          </h2>
          <form action={editing ? updateStaffUserAction : createStaffUserAction} className="space-y-4">
            {editing && <input type="hidden" name="userId" value={editing.id as string} />}

            <div>
              <label className="form-label">Display Name *</label>
              <input
                name="display_name"
                required
                defaultValue={editing?.display_name as string}
                className="form-input"
                placeholder="e.g. Jane Smith"
              />
            </div>

            <div>
              <label className="form-label">Email *</label>
              <input
                type="email"
                name="email"
                required
                defaultValue={editing?.email as string}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">Role *</label>
              <select name="role" required defaultValue={editing?.role as string ?? "bus_coordinator"} className="form-input">
                <option value="lions_admin">Lions Admin</option>
                <option value="bus_coordinator">Bus Coordinator</option>
                <option value="waw_staff">WAW Staff</option>
              </select>
            </div>

            {!editing && (
              <div>
                <label className="form-label">Neon Auth User ID</label>
                <input
                  name="neon_auth_user_id"
                  className="form-input font-mono text-xs"
                  placeholder="Leave blank to fill in later after they sign up"
                />
                <p className="text-xs text-[#5E6470] mt-1">
                  This links the portal account to their OAuth login. You can set it after they&apos;ve signed up via the login page.
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary">
                {editing ? "Save Changes" : "Add Staff Member"}
              </button>
              <Link href="/admin?section=staff" className="btn-secondary">Cancel</Link>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#DDE1EA]">
          <h2 className="text-base font-bold text-brand-blue">
            Staff Members <span className="text-[#5E6470] font-normal text-sm">({users.length})</span>
          </h2>
          {!showForm && (
            <Link href="/admin?section=staff&create=1" className="btn-primary text-xs px-3 py-2">
              + Add Staff
            </Link>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F8F9FC] border-b border-[#DDE1EA]">
                <th className="text-left px-4 py-3 text-xs font-bold text-[#5E6470] uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-[#5E6470] uppercase tracking-wide">Role</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-[#5E6470] uppercase tracking-wide hidden md:table-cell">Last Login</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-[#5E6470] uppercase tracking-wide">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F1F4]">
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-[#5E6470]">
                    No staff members yet.
                  </td>
                </tr>
              )}
              {users.map((u) => (
                <tr key={u.id as string} className={`hover:bg-[#F8F9FC] transition-colors ${u.id === editId ? "bg-[#EEF2FF]" : ""}`}>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{u.display_name as string}</p>
                    <p className="text-xs text-[#5E6470]">{u.email as string}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={
                      u.role === "lions_admin" ? "badge-blue" :
                      u.role === "bus_coordinator" ? "badge-amber" : "badge-green"
                    }>
                      {ROLE_LABELS[u.role as string] ?? u.role as string}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#5E6470] hidden md:table-cell">
                    {fmtDate(u.last_login_at)}
                  </td>
                  <td className="px-4 py-3">
                    {u.is_active ? (
                      <span className="badge-green">Active</span>
                    ) : (
                      <span className="badge-red">Inactive</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <Link
                        href={`/admin?section=staff&editId=${u.id as string}`}
                        className="text-xs text-brand-blue hover:underline font-semibold"
                      >
                        Edit
                      </Link>
                      <form action={toggleUserActiveAction}>
                        <input type="hidden" name="userId" value={u.id as string} />
                        <input type="hidden" name="isActive" value={u.is_active ? "false" : "true"} />
                        <button
                          type="submit"
                          className={`text-xs font-semibold ${
                            u.is_active
                              ? "text-red-500 hover:text-red-700"
                              : "text-green-600 hover:text-green-800"
                          }`}
                        >
                          {u.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card bg-[#EEF2FF] border-brand-blue/20">
        <h3 className="text-sm font-bold text-brand-blue mb-2">How staff login works</h3>
        <p className="text-sm text-[#5E6470]">
          Staff sign in via the login page using OAuth (Google / email link). The first time they sign in, their Neon Auth User ID gets linked to their staff record here. Until that link exists, they can sign in but will see the &ldquo;Unauthorised&rdquo; page.
        </p>
      </div>
    </div>
  );
}
