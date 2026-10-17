import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Joins class names and lets later Tailwind classes override earlier ones (used by the shadcn components). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
