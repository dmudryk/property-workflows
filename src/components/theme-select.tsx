"use client";

import { createContext, useContext, useState } from "react";
import { FormSelect } from "@/components/form-select";
import { Label } from "@/components/ui/label";
import { isThemeChoice, THEME_LABELS, THEMES, themeCookie, type ThemeChoice } from "@/lib/theme";

// Вибір теми, який сервер прочитав із cookie (src/app/layout.tsx). Без провайдера — «System» (AC-DSYS-05).
const ThemeContext = createContext<ThemeChoice>("system");

export function ThemeProvider({ theme, children }: { theme: ThemeChoice; children?: React.ReactNode }) {
  return <ThemeContext value={theme}>{children}</ThemeContext>;
}

const ITEMS = THEMES.map((value) => ({ value, label: THEME_LABELS[value] }));

// Вибір «Theme» (ADR 0003; AC-DSYS-05, AC-DSYS-06): нова тема одразу діє на сторінці (<html data-theme>) і лишається
// на пристрої в cookie — і після закриття браузера.
export function ThemeSelect({ id = "theme" }: { id?: string }) {
  const [theme, setTheme] = useState(useContext(ThemeContext));

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>Theme</Label>
      <FormSelect
        id={id}
        items={ITEMS}
        value={theme}
        onValueChange={(next) => {
          if (!isThemeChoice(next)) return;
          setTheme(next);
          document.cookie = themeCookie(next);
          document.documentElement.dataset.theme = next;
        }}
      />
    </div>
  );
}
