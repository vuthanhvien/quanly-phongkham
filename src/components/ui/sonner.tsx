"use client";
import { Toaster as SonnerToaster } from "sonner";
export { toast } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      richColors
      position="top-right"
      toastOptions={{
        style: {
          fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
          fontSize: "14px",
          borderRadius: "4px",
        },
      }}
    />
  );
}
