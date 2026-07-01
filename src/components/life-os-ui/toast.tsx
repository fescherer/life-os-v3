import { Toaster } from "sonner";

export default function LifeOsToast() {
  return (
    <Toaster
      richColors
      style={{
        "--normal-bg": "var(--color-card)",
        "--normal-text": "var(--color-card-foreground)",
        "--success-bg": "var(--color-card)",
        "--success-text": "var(--color-primary)",
        "--error-bg": "var(--color-card)",
        "--error-text": "var(--color-destructive)",
      } as React.CSSProperties}
      toastOptions={{
        style: {
          borderLeft: "4px solid currentColor",
          borderRadius: "0.5rem",
          borderRight: "1px solid currentColor",
          borderTop: "1px solid currentColor",
          borderBottom: "1px solid currentColor",
          boxShadow: "0 10px 30px rgb(79 71 73 / 12%)",
          fontFamily: "var(--font-mono)",
        },
      }}
    />
  );
}
