export const formatKES = (amount: number | string): string => {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(n)) return "KES 0";
  return `KES ${n.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
};

export const formatKES2 = (amount: number | string): string => {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(n)) return "KES 0.00";
  return `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatDate = (d: Date | string): string => {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" });
};

export const formatDateTime = (d: Date | string): string => {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${formatDate(date)} · ${date.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit", hour12: true })}`;
};

export const relativeTime = (d: Date | string): string => {
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
};

export const initials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

export const greeting = (): string => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};
