import { InputHTMLAttributes, forwardRef } from "react";
import { LucideIcon } from "lucide-react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
  hint?: string;
  icon?: LucideIcon;
  suffix?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, error, hint, icon: Icon, suffix, className = "", id, ...rest },
  ref,
) {
  const inputId = id ?? rest.name;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-semibold text-ink/80">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          />
        )}
        <input
          ref={ref}
          id={inputId}
          className={`h-12 w-full rounded-2xl border bg-white text-[15px] text-ink outline-none transition placeholder:text-gray-400 focus:border-brand focus:ring-4 focus:ring-brand/10 ${
            Icon ? "pl-11" : "px-4"
          } ${suffix ? "pr-11" : ""} ${
            error ? "border-red-400" : "border-gray-200"
          } ${className}`}
          {...rest}
        />
        {suffix && <div className="absolute right-3 top-1/2 -translate-y-1/2">{suffix}</div>}
      </div>
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-red-500">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-gray-400">{hint}</p>
      ) : null}
    </div>
  );
});

export default Input;
