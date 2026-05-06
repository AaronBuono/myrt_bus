import { getSystemSettings, getActiveBankWithHours } from "@/lib/queries/admin";
import { updateSystemSettingsAction, updateBankAction, updateOpeningHourAction } from "@/app/actions/admin";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function SettingsSection() {
  const [settings, bankData] = await Promise.all([
    getSystemSettings(),
    getActiveBankWithHours(),
  ]);

  const bank = bankData?.bank;
  const hours = bankData?.hours ?? [];

  return (
    <div className="space-y-6 max-w-2xl">
      {/* System Settings */}
      <div className="card">
        <h2 className="text-base font-bold text-brand-blue mb-4">Organisation Settings</h2>
        <form action={updateSystemSettingsAction} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Registered Name</label>
            <input
              name="registered_name"
              defaultValue={settings?.registered_name as string}
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">Registration Number</label>
            <input
              name="registration_number"
              defaultValue={settings?.registration_number as string}
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">ABN</label>
            <input
              name="abn"
              defaultValue={settings?.abn as string}
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">Treasurer Name</label>
            <input
              name="treasurer_name"
              defaultValue={settings?.treasurer_name as string}
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">Treasurer Mobile</label>
            <input
              name="treasurer_mobile"
              defaultValue={settings?.treasurer_mobile as string}
              className="form-input"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="form-label">Postal Address</label>
            <textarea
              name="postal_address"
              rows={2}
              defaultValue={settings?.postal_address as string}
              className="form-input resize-y"
            />
          </div>
          <div>
            <label className="form-label">Email From Address</label>
            <input
              type="email"
              name="email_from_address"
              defaultValue={settings?.email_from_address as string}
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">Email Reply-To</label>
            <input
              type="email"
              name="email_reply_to"
              defaultValue={settings?.email_reply_to as string}
              className="form-input"
            />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary">Save Settings</button>
          </div>
        </form>
      </div>

      {/* Bank Details */}
      {bank ? (
        <div className="card">
          <h2 className="text-base font-bold text-brand-blue mb-4">Bank Details</h2>
          <form action={updateBankAction} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input type="hidden" name="bankId" value={bank.id as string} />
            <div className="sm:col-span-2">
              <label className="form-label">Bank Name</label>
              <input
                name="bank_name"
                defaultValue={bank.bank_name as string}
                className="form-input"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="form-label">Street Address</label>
              <input
                name="street_address"
                defaultValue={bank.street_address as string}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Phone</label>
              <input
                name="phone"
                defaultValue={bank.phone as string}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">BSB</label>
              <input
                name="bsb"
                defaultValue={bank.bsb as string}
                className="form-input font-mono"
              />
            </div>
            <div>
              <label className="form-label">Account Number</label>
              <input
                name="account_number"
                defaultValue={bank.account_number as string}
                className="form-input font-mono"
              />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" className="btn-primary">Save Bank Details</button>
            </div>
          </form>
        </div>
      ) : (
        <div className="card">
          <p className="text-[#5E6470]">No active bank record found.</p>
        </div>
      )}

      {/* Opening Hours */}
      {bank && (
        <div className="card">
          <h2 className="text-base font-bold text-brand-blue mb-4">Bank Opening Hours</h2>
          <div className="divide-y divide-[#F0F1F4]">
            {hours.map((h) => (
              <form
                key={h.day_of_week as number}
                action={updateOpeningHourAction}
                className="flex items-center gap-3 py-3"
              >
                <input type="hidden" name="bankId" value={bank.id as string} />
                <input type="hidden" name="day_of_week" value={h.day_of_week as number} />
                <span className="w-24 text-sm font-medium">{DAYS[h.day_of_week as number]}</span>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="is_open"
                    value="true"
                    defaultChecked={h.is_open as boolean}
                    onChange={(e) => {
                      const row = e.currentTarget.closest("form");
                      const timeInputs = row?.querySelectorAll<HTMLInputElement>("input[type=time]");
                      timeInputs?.forEach((i) => (i.disabled = !e.currentTarget.checked));
                    }}
                    className="form-checkbox"
                  />
                  Open
                </label>
                <input
                  type="time"
                  name="opening_time"
                  defaultValue={h.opening_time as string}
                  disabled={!h.is_open}
                  className="form-input w-32 text-sm"
                />
                <span className="text-[#5E6470] text-sm">to</span>
                <input
                  type="time"
                  name="closing_time"
                  defaultValue={h.closing_time as string}
                  disabled={!h.is_open}
                  className="form-input w-32 text-sm"
                />
                <button type="submit" className="btn-secondary text-xs px-2.5 py-1.5">
                  Save
                </button>
              </form>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
