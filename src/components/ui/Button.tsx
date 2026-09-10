import { motion } from "framer-motion";
import { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "dark";
type Size = "sm" | "md" | "lg";

interface Props
  extends Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "onAnimationStart" | "onAnimationEnd" | "onAnimationIteration" | "onDrag" | "onDragStart" | "onDragEnd" | "onDragOver" | "onDragEnter" | "onDragLeave" | "onDrop"
  > {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
}

const variants: Record<Variant, string> = {
  primary: "bg-brand-gradient text-white shadow-brand hover:brightness-110 active:brightness-95",
  secondary: "bg-white text-ink border border-gray-200 hover:border-brand/40 hover:text-brand",
  ghost: "bg-transparent text-brand hover:bg-brand-soft",
  danger: "bg-red-500 text-white hover:bg-red-600",
  dark: "bg-brand-dark text-white hover:bg-brand-deep",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm rounded-xl",
  md: "h-12 px-6 text-[15px] rounded-2xl",
  lg: "h-14 px-8 text-base rounded-2xl",
};

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  disabled,
  className = "",
  children,
  ...rest
}: Props) {
  return (
    <motion.button
      whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
        variants[variant]
      } ${sizes[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />
      )}
      {children}
    </motion.button>
  );
}
