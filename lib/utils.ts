import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getUserFacingErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : "";

  if (!message) {
    return fallback;
  }

  const convexErrorMatch = message.match(/Uncaught Error: ([\s\S]+)/);
  if (convexErrorMatch?.[1]) {
    return convexErrorMatch[1].trim();
  }

  const convexMessageMatch = message.match(/Uncaught ConvexError: ([^\n]+)/);
  if (convexMessageMatch?.[1]) {
    return convexMessageMatch[1].trim();
  }

  return message.trim();
}
