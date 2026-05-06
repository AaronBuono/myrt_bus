const STATUS_MAP: Record<string, { cls: string; label: string }> = {
  confirmed:          { cls: "badge-blue",   label: "Confirmed" },
  in_use:             { cls: "badge-green",  label: "In Use" },
  pending_inspection: { cls: "badge-amber",  label: "Pending Inspection" },
  complete:           { cls: "badge-green",  label: "Complete" },
  cancelled:          { cls: "badge-red",    label: "Cancelled" },
};

export default function StatusBadge({ status }: { status: string }) {
  const { cls, label } = STATUS_MAP[status] ?? { cls: "badge-blue", label: status };
  return <span className={cls}>{label}</span>;
}
