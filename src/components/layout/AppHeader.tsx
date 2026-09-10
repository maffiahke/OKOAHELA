import { Bell, ChevronLeft } from "lucide-react";
import { useRouter } from "next/router";
import { ReactNode } from "react";

interface Props {
  title?: string;
  back?: boolean;
  right?: ReactNode;
}

export default function AppHeader({ title, back = false, right }: Props) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-gray-100 bg-white/90 px-5 py-4 backdrop-blur">
      <div className="flex items-center gap-2">
        {back && (
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-ink transition hover:bg-gray-200"
            aria-label="Go back"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        <h1 className="text-lg font-extrabold tracking-tight text-ink">{title}</h1>
      </div>
      {right ?? (
        <button
          onClick={() => router.push("/notifications")}
          className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-ink transition hover:bg-gray-200"
          aria-label="Notifications"
        >
          <Bell size={19} />
        </button>
      )}
    </header>
  );
}
