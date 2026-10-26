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

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className="size-8 shrink-0" />
      <span className="text-lg font-semibold">Stepline</span>
    </span>
  );
}
