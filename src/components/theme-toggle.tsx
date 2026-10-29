"use client";

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { createContext, useContext, useId, useState } from "react";
import { cn } from "cn";
import { THEME_LABELS, THEMES, themeCookie, type ThemeChoice } from "@/lib/theme";

// Нова тема одразу діє на сторінці (<html data-theme>) і лишається на пристрої в cookie — і після закриття браузера.
function applyTheme(next: ThemeChoice) {
  document.cookie = themeCookie(next);
  document.documentElement.dataset.theme = next;
}

// Вибір теми: сервер прочитав його з cookie (src/app/layout.tsx), а провайдер тримає поточний — спільний для обох
// місць перемикача в AppShell. Без провайдера — «System» (AC-DSYS-05).
const ThemeContext = createContext<{ theme: ThemeChoice; choose: (next: ThemeChoice) => void }>({
  theme: "system",
  choose: applyTheme,
});

export function ThemeProvider({ theme: initial, children }: { theme: ThemeChoice; children?: React.ReactNode }) {
  const [theme, setTheme] = useState(initial);
  const choose = (next: ThemeChoice) => {
    setTheme(next);
    applyTheme(next);
  };
  return <ThemeContext value={{ theme, choose }}>{children}</ThemeContext>;
}

// Іконка положення й те, як вона «оживає», коли її вибрано: сонце обертає промені, місяць хитається.
const ICONS = {
  system: { icon: MonitorIcon, motion: "" },
  light: { icon: SunIcon, motion: "peer-checked:rotate-90" },
  dark: { icon: MoonIcon, motion: "peer-checked:-rotate-[25deg]" },
} as const;

// Бігунок — під вибраним положенням; класи — літерали, щоб Tailwind їх зібрав.
const THUMB: Record<ThemeChoice, string> = {
  system: "translate-x-0",
  light: "translate-x-full",
  dark: "translate-x-[200%]",
};

// Легка пружина: бігунок і іконка трохи «перелітають» і повертаються.
const SPRING = "ease-[cubic-bezier(0.34,1.36,0.64,1)] motion-reduce:transition-none";

// Перемикач «Theme» (ADR 0004; AC-DSYS-05, AC-DSYS-06): три положення — System, Light, Dark — і бігунок, що з'їжджає
// до вибраного. Це радіокнопки: Tab заходить у вибране положення, стрілки перемикають; назва положення — для
// читача екрана й у підказці.
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, choose } = useContext(ThemeContext);
  const name = useId();

  return (
    <fieldset className={cn("relative flex shrink-0 rounded-full border bg-background p-1 shadow-xs", className)}>
      <legend className="sr-only">Theme</legend>
      <span
        aria-hidden
        className={cn(
          "absolute top-1 left-1 size-9 rounded-full bg-accent shadow-sm transition-transform duration-300",
          SPRING,
          THUMB[theme],
        )}
      />
      {THEMES.map((value) => {
        const { icon: Icon, motion } = ICONS[value];
        return (
          <label
            key={value}
            title={THEME_LABELS[value]}
            className="relative flex size-9 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground has-checked:cursor-default has-checked:text-accent-foreground has-focus-visible:ring-2 has-focus-visible:ring-ring"
          >
            <input
              type="radio"
              name={name}
              value={value}
              checked={theme === value}
              onChange={() => choose(value)}
              className="peer sr-only"
            />
            <Icon
              aria-hidden
              className={cn("size-[1.125rem] scale-85 transition-transform duration-500 peer-checked:scale-100", SPRING, motion)}
            />
            <span className="sr-only">{THEME_LABELS[value]}</span>
          </label>
        );
      })}
    </fieldset>
  );
}
