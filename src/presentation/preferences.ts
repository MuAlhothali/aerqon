"use client";
import { useSyncExternalStore } from "react";
export type Theme = "light" | "dark" | "system";
const event = "aerqon-preference";
let fallback = "en:system";
const subscribe = (listener: () => void) => {
  window.addEventListener(event, listener); window.addEventListener("storage", listener);
  return () => { window.removeEventListener(event, listener); window.removeEventListener("storage", listener); };
};
function snapshot() {
  try { return localStorage.getItem("aerqon-preferences") ?? fallback; } catch { return fallback; }
}
export function usePreferences() {
  const value = useSyncExternalStore(subscribe, snapshot, () => "en:system");
  const [locale, appearance] = value.split(":");
  const language = locale === "ar" ? "ar" : "en";
  const theme: Theme = appearance === "dark" || appearance === "light" ? appearance : "system";
  return { language: language as "en" | "ar", theme, update: (nextLanguage: string, nextTheme: string) => {
    fallback = nextLanguage + ":" + nextTheme;
    try { localStorage.setItem("aerqon-preferences", nextLanguage + ":" + nextTheme); } catch { /* Storage may be disabled; the app remains readable. */ }
    window.dispatchEvent(new Event(event));
  } };
}
