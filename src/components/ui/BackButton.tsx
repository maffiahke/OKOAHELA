import { useRouter } from "next/router";
import { ChevronLeft } from "lucide-react";

interface Props {
  /** Route to open when there is no history to go back to (deep link / fresh tab). */
  fallback?: string;
  /** White-on-gradient variant for screens with a colored hero. */
  light?: boolean;
  className?: string;
}

export default function BackButton({ fallback = "/dashboard", light = false, className = "" }: Props) {
  const router = useRouter();
  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push(fallback);
  };
  return (
    <button
      onClick={goBack}
      aria-label="Go back"
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition ${
        light
          ? "bg-white/15 text-white shadow-none backdrop-blur hover:bg-white/25"
          : "bg-white text-ink shadow-card hover:bg-gray-50"
      } ${className}`}
    >
      <ChevronLeft size={20} />
    </button>
  );
}
