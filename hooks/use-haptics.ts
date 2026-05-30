const patterns = {
  light: [10],
  medium: [20],
  heavy: [30, 10, 30],
  error: [50, 20, 50],
} as const;

export type HapticPattern = keyof typeof patterns;

function vibrate(pattern: HapticPattern) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(patterns[pattern]);
  }
}

export const haptics = {
  light: () => vibrate("light"),
  medium: () => vibrate("medium"),
  heavy: () => vibrate("heavy"),
  error: () => vibrate("error"),
};
