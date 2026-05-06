import { getOrganisations } from "@/lib/queries/admin";
import { upsertOrgAction, deleteOrgAction } from "@/app/actions/admin";
import Link from "next/link";

function fmtDate(d: unknown) {
  if (!d) return "-";
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

export default async function OrgsSection({ editId, create }: Props) {
  const orgs = await getOrganisations();
  const editing = editId ? orgs.find((o) => o.id === editId) : null;
  const showForm = create || !!editing;

  return (
    <div className="space-y-6">
      {/* Form (create or edit) */}
      {showForm && (
        <div className="card">
          <h2 className="text-base font-bold text-brand-blue mb-4">
            {editing ? `Edit: ${editing.name as string}` : "Add Organisation"}
          </h2>
          <form action={upsertOrgAction} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {editing && <input type="hidden" name="id" value={editing.id as string} />}

            <div className="sm:col-span-2">
              <label className="form-label">Organisation Name *</label>
              <input name="name" required defaultValue={editing?.name as string} className="form-input" />
            </div>

            <div>
              <label className="form-label">Category *</label>
              <select name="category" required defaultValue={editing?.category as string ?? "a"} className="form-input">
                <option value="a">Cat A — Standard</option>
                <option value="c">Cat C — No Charge</option>
              </select>
            </div>

            <div>
              <label className="form-label">Invoicing Frequency</label>
              <select name="invoicing_frequency" defaultValue={(editing?.invoicing_frequency as string) ?? ""} className="form-input">
                <option value="">None (pay on day)</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </div>

            <div>
              <label className="form-label">Authorised Contact *</label>
              <input name="authorised_contact" required defaultValue={editing?.authorised_contact as string} className="form-input" />
            </div>

            <div>
              <label className="form-label">Contact Phone *</label>
              <input name="contact_phone" required defaultValue={editing?.contact_phone as string} className="form-input" />
            </div>

            <div className="sm:col-span-2">
              <label className="form-label">Contact Email *</label>
              <input type="email" name="contact_email" required defaultValue={editing?.contact_email as string} className="form-input" />
            </div>

            <div className="sm:col-span-2 border-t border-[#DDE1EA] pt-4">
              <p className="text-xs font-bold text-[#5E6470] uppercase tracking-wide mb-3">Public Liability Insurance</p>
              <div className="flex items-center gap-4 mb-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="has_public_liability"
                    value="true"
                    defaultChecked={(editing?.has_public_liability as boolean) === true || !editing}
                    className="form-checkbox"
                  />
                  Has insurance
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="has_public_liability"
                    value="false"
                    defaultChecked={(editing?.has_public_liability as boolean) === false}
                    className="form-checkbox"
                  />
                  No insurance
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="form-label">Insurer Name</label>
                  <input name="insurer_name" defaultValue={editing?.insurer_name as string} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Policy Number</label>
                  <input name="policy_number" defaultValue={editing?.policy_number as string} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Policy Expiry</label>
                  <input
                    type="date"
                    name="policy_expiry_date"
                    defaultValue={editing?.policy_expiry_date as string}
                    className="form-input"
                  />
                </div>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="form-label">Notes</label>
              <textarea
                name="notes"
                rows={3}
                defaultValue={editing?.notes as string}
                className="form-input resize-y"
              />
            </div>

            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" className="btn-primary">
                {editing ? "Save Changes" : "Add Organisation"}
              </button>
              <Link href="/admin?section=orgs" className="btn-secondary">Cancel</Link>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#DDE1EA]">
          <h2 className="text-base font-bold text-brand-blue">
            Address Book <span className="text-[#5E6470] font-normal text-sm">({orgs.length})</span>
          </h2>
          {!showForm && (
            <Link href="/admin?section=orgs&create=1" className="btn-primary text-xs px-3 py-2">
              + Add Organisation
            </Link>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F8F9FC] border-b border-[#DDE1EA]">
                <th className="text-left px-4 py-3 text-xs font-bold text-[#5E6470] uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-[#5E6470] uppercase tracking-wide">Cat</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-[#5E6470] uppercase tracking-wide hidden md:table-cell">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-[#5E6470] uppercase tracking-wide hidden lg:table-cell">Insurance</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-[#5E6470] uppercase tracking-wide hidden lg:table-cell">Expiry</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F1F4]">
              {orgs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[#5E6470]">
                    No organisations yet.
                  </td>
                </tr>
              )}
              {orgs.map((org) => (
                <tr key={org.id as string} className={`hover:bg-[#F8F9FC] transition-colors ${org.id === editId ? "bg-[#EEF2FF]" : ""}`}>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{org.name as string}</p>
                    {!!org.notes && (
                      <p className="text-xs text-[#5E6470] mt-0.5">{(org.notes as string).slice(0, 60)}{(org.notes as string).length > 60 ? "…" : ""}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={(org.category as string) === "c" ? "badge-green" : "badge-blue"}>
                      Cat {(org.category as string).toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="text-xs font-medium">{org.authorised_contact as string}</p>
                    <p className="text-xs text-[#5E6470]">{org.contact_phone as string}</p>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {org.has_public_liability ? (
                      <span className="badge-green">Yes</span>
                    ) : (
                      <span className="badge-red">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-[#5E6470] text-xs">
                    {fmtDate(org.policy_expiry_date)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <Link
                        href={`/admin?section=orgs&editId=${org.id as string}`}
                        className="text-xs text-brand-blue hover:underline font-semibold"
                      >
                        Edit
                      </Link>
                      <form action={deleteOrgAction}>
                        <input type="hidden" name="id" value={org.id as string} />
                        <button
                          type="submit"
                          className="text-xs text-red-500 hover:text-red-700 font-semibold"
                          onClick={(e) => {
                            if (!confirm(`Delete "${org.name as string}"? This cannot be undone.`)) {
                              e.preventDefault();
                            }
                          }}
                        >
                          Delete
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
    </div>
  );
}
