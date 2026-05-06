import { getConditionsHistory } from "@/lib/queries/admin";
import { publishConditionsAction } from "@/app/actions/admin";

function fmtDateTime(d: unknown) {
  if (!d) return "-";
  return new Date(d as string).toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ConditionsSection() {
  const history = await getConditionsHistory();
  const current = history.find((c) => c.is_current);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Publish new version */}
      <div className="card">
        <h2 className="text-base font-bold text-brand-blue mb-1">Publish New Version</h2>
        <p className="text-sm text-[#5E6470] mb-4">
          Publishing replaces the current active version. Existing bookings keep the version they agreed to.
        </p>
        <form action={publishConditionsAction} className="space-y-4">
          <div>
            <label className="form-label">Conditions Content</label>
            <textarea
              name="content"
              rows={14}
              required
              placeholder="Paste the full conditions of use text here…"
              defaultValue={current?.content as string | undefined}
              className="form-input font-mono text-xs leading-relaxed resize-y"
            />
          </div>
          <button type="submit" className="btn-primary">
            Publish New Version
          </button>
        </form>
      </div>

      {/* Version history */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-[#DDE1EA]">
          <h2 className="text-base font-bold text-brand-blue">Version History</h2>
        </div>
        <div className="divide-y divide-[#F0F1F4]">
          {history.length === 0 && (
            <p className="px-5 py-8 text-center text-[#5E6470]">No conditions published yet.</p>
          )}
          {history.map((c) => (
            <details key={c.id as string} className="group">
              <summary className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[#F8F9FC] list-none">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-brand-blue">v{c.version as number}</span>
                  {!!c.is_current && (
                    <span className="badge-green">Current</span>
                  )}
                  <span className="text-sm text-[#5E6470]">{fmtDateTime(c.created_at)}</span>
                </div>
                <svg
                  className="w-4 h-4 text-[#5E6470] group-open:rotate-180 transition-transform"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-5 pb-5">
                <pre className="text-xs text-[#1A1A1A] whitespace-pre-wrap font-mono leading-relaxed bg-[#F8F9FC] rounded-xl p-4 border border-[#DDE1EA]">
                  {c.content as string}
                </pre>
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
