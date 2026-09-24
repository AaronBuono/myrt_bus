"use client";

import { MotionConfig } from "motion/react";

/** Users with "reduce motion" set in their OS get no movement anywhere in the app. */
export default function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
