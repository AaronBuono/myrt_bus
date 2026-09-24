const STATUS_MAP: Record<string, { cls: string; label: string }> = {
  confirmed: { cls: "badge-blue",  label: "Confirmed" },
  picked_up: { cls: "badge-amber", label: "Picked up" },
  returned:  { cls: "badge-green", label: "Returned" },
  cancelled: { cls: "badge-red",   label: "Cancelled" },
};

export default function StatusBadge({ status }: { status: string }) {
  const { cls, label } = STATUS_MAP[status] ?? { cls: "badge-blue", label: status };
  return <span className={cls}>{label}</span>;
}
