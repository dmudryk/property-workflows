"use client";

import { Loader2Icon } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

// Кнопка надсилання форми зі станом обробки (DESIGN.md, розділ 6): поки серверна дія виконується, кнопка вимкнена
// й показує індикатор і текст процесу («Signing in…»), тож її не натиснуть удруге.
export function SubmitButton({
  pendingLabel,
  children,
  disabled,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "type"> & { pendingLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending || disabled} aria-busy={pending} {...props}>
      {pending ? (
        <>
          <Loader2Icon className="motion-safe:animate-spin" aria-hidden />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
