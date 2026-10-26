import { cn } from "cn";

// Логотип Stepline (DESIGN.md, розділ 5): значок — три сходинки-кроки з позначкою «виконано» у верхній, поруч назва.
// Контур бере колір тексту, позначка — токен brand, тож лого однаково читається у світлій і темній темі.
const STEPS =
  "M12 432V342a30 30 0 0 1 30-30h76a44 44 0 0 0 44-44v-76a30 30 0 0 1 30-30h76a44 44 0 0 0 44-44V42a30 30 0 0 1 30-30h90" +
  "a30 30 0 0 1 30 30v90a30 30 0 0 1-30 30h-76a44 44 0 0 0-44 44v76a30 30 0 0 1-30 30h-76a44 44 0 0 0-44 44v76" +
  "a30 30 0 0 1-30 30H42a30 30 0 0 1-30-30Z";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="-5 -5 484 484" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d={STEPS} stroke="currentColor" strokeWidth={34} />
      <path d="M347 82l25 30 53-50" className="stroke-brand" strokeWidth={30} />
    </svg>
  );
}

// size="lg" — на картці входу, де логотип — головний елемент над формою.
export function Logo({ size = "default", className }: { size?: "default" | "lg"; className?: string }) {
  return (
    <span className={cn("inline-flex items-center", size === "lg" ? "gap-3" : "gap-2", className)}>
      <LogoMark className={cn("shrink-0", size === "lg" ? "size-11" : "size-8")} />
      <span className={cn("font-semibold", size === "lg" ? "text-2xl" : "text-lg")}>Stepline</span>
    </span>
  );
}
