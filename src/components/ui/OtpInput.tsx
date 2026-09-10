import { useEffect, useRef, useState } from "react";

interface Props {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}

export default function OtpInput({ length = 6, value, onChange, autoFocus = true }: Props) {
  const [digits, setDigits] = useState<string[]>(new Array(length).fill(""));
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const next = value.split("").slice(0, length);
    const arr = new Array(length).fill("");
    next.forEach((d, i) => (arr[i] = d));
    setDigits(arr);
  }, [value, length]);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const commit = (arr: string[]) => {
    setDigits(arr);
    onChange(arr.join(""));
  };

  const handleChange = (i: number, raw: string) => {
    const ch = raw.replace(/\D/g, "").slice(-1);
    const arr = [...digits];
    arr[i] = ch;
    commit(arr);
    if (ch && i < length - 1) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      const arr = [...digits];
      arr[i - 1] = "";
      commit(arr);
      refs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!text) return;
    const arr = new Array(length).fill("");
    text.split("").forEach((d, i) => (arr[i] = d));
    commit(arr);
    refs.current[Math.min(text.length, length - 1)]?.focus();
  };

  return (
    <div className="flex justify-center gap-2" onPaste={handlePaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={d}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="h-14 w-12 rounded-2xl border-2 border-gray-200 bg-white text-center text-xl font-bold text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"
        />
      ))}
    </div>
  );
}
