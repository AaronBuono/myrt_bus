"use client";

// Small, deliberate motion for the home page. Everything here is progressive:
// the page is a server component, and links work before this JS loads.
// Reduced-motion users get no movement (see MotionProvider).

import { motion, type Variants } from "motion/react";

const EASE = [0.22, 1, 0.36, 1] as const;

/** Hero copy: fade in and rise ~20px over 0.4s. */
export function HeroReveal({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

const list: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
};

/** Steps list: children fade up one after another the first time they scroll into view. */
export function StaggerList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.ol
      className={className}
      variants={list}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.3 }}
    >
      {children}
    </motion.ol>
  );
}

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.li className={className} variants={item}>
      {children}
    </motion.li>
  );
}

/** Wraps a CTA with a small hover/tap scale. The link inside is usable immediately. */
export function PressScale({ children }: { children: React.ReactNode }) {
  return (
    <motion.span style={{ display: "inline-block" }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
      {children}
    </motion.span>
  );
}
