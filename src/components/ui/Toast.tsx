import { AnimatePresence, motion } from "framer-motion";
import { createContext, ReactNode, useCallback, useContext, useState } from "react";

interface ToastItem {
  id: number;
  message: string;
  kind: "success" | "error" | "info";
}

const ToastCtx = createContext<{ show: (message: string, kind?: ToastItem["kind"]) => void }>({
  show: () => {},
});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, kind: ToastItem["kind"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.96 }}
              className={`pointer-events-auto max-w-sm rounded-2xl px-4 py-3 text-sm font-semibold shadow-float ${
                t.kind === "success"
                  ? "bg-brand-dark text-white"
                  : t.kind === "error"
                    ? "bg-red-500 text-white"
                    : "bg-white text-ink"
              }`}
            >
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
