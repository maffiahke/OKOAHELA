import useSWR from "swr";
import AdminLayout from "@/components/layout/AdminLayout";
import Card from "@/components/ui/Card";
import BackButton from "@/components/ui/BackButton";
import { relativeTime } from "@/utils/format";

interface AuditLog {
  id: string;
  actorId: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string | null;
  createdAt: string;
}

function prettyAction(action: string): string {
  return action
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function AdminAuditBody() {
  const { data } = useSWR<AuditLog[]>("/api/admin/audit");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <BackButton fallback="/admin" />
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Audit Logs</h1>
      </div>
      <p className="-mt-2 text-sm text-gray-400">Immutable trail of administrative actions</p>

      {!data ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-gray-200/60" />)}
        </div>
      ) : data.length === 0 ? (
        <Card><p className="py-10 text-center text-sm text-gray-400">No audit events recorded yet</p></Card>
      ) : (
        <Card padded={false}>
          <ul className="divide-y divide-gray-50">
            {data.map((log) => (
              <li key={log.id} className="flex items-start gap-3 px-5 py-4">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <p className="text-sm font-extrabold text-ink">{prettyAction(log.action)}</p>
                    <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold text-gray-500">{log.entityType}</span>
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-500">{log.actorRole}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-gray-400">
                    {log.entityId}
                    {log.details && log.details !== "null" ? ` · ${log.details}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-gray-400">{relativeTime(log.createdAt)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}


export default function AdminAudit() {
  return (
    <AdminLayout>
      <AdminAuditBody />
    </AdminLayout>
  );
}
