import { AnimatePresence, motion } from "framer-motion";
import { ReactNode } from "react";

interface Props {
  open: boolean;
  onClose?: () => void;
  title?: string;
  children: ReactNode;
  persistent?: boolean; // don't close on backdrop tap (processing flows)
}

export default function Sheet({ open, onClose, title, children, persistent = false }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={() => !persistent && onClose?.()}
          />
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="relative z-10 w-full max-w-md rounded-t-[28px] bg-white p-6 shadow-float sm:rounded-[28px]"
          >
            {!persistent && (
              <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-gray-200 sm:hidden" />
            )}
            {title && <h3 className="mb-4 text-center text-lg font-bold text-ink">{title}</h3>}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
