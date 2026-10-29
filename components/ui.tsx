import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`pointer-events-auto rounded-2xl border border-amber-200/15 bg-stone-950/96 p-6 text-stone-100 shadow-2xl shadow-black/60 ring-1 ring-black/40 sm:p-7 ${className}`}
    >
      {children}
    </div>
  );
}

export function PanelHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300/80">{eyebrow}</p>
      <h2 className="mt-1 font-display text-2xl font-bold text-amber-50 sm:text-3xl">{title}</h2>
      {children && <p className="mt-2 text-sm leading-relaxed text-stone-300">{children}</p>}
    </header>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-amber-100/90">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-stone-400">{hint}</p>}
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg border border-stone-700 bg-stone-900/90 px-3.5 py-2.5 text-[15px] text-stone-100 placeholder:text-stone-500 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30";

const BUTTON_VARIANTS = {
  primary:
    "bg-amber-500 text-stone-950 hover:bg-amber-400 shadow-lg shadow-amber-900/40 disabled:bg-stone-700 disabled:text-stone-400 disabled:shadow-none",
  ghost:
    "border border-stone-600 text-stone-200 hover:border-amber-300/60 hover:text-amber-100 disabled:opacity-40 disabled:hover:border-stone-600 disabled:hover:text-stone-200",
} as const;

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof BUTTON_VARIANTS }) {
  return (
    <button
      type="button"
      className={`rounded-lg px-5 py-2.5 text-sm font-semibold tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:cursor-not-allowed ${BUTTON_VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
