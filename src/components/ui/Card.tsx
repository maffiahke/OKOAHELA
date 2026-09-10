import { HTMLAttributes, ReactNode } from "react";

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padded?: boolean;
}

export default function Card({ children, padded = true, className = "", ...rest }: Props) {
  return (
    <div
      className={`rounded-3xl bg-white shadow-card ${padded ? "p-5" : ""} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
