// Site-wide branding and URLs. Safe to import from client and server code.

export const SITE_NAME = "Alpine Community Bus";
export const SITE_DOMAIN = "alpinecommunitybus.com.au";

/** Canonical origin, no trailing slash. Set NEXT_PUBLIC_APP_URL per environment (staging, preview). */
export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? `https://${SITE_DOMAIN}`).replace(/\/$/, "");

export const SITE_DESCRIPTION =
  "Book the Alpine Community Bus, a 12-seater available to community groups and residents across the Alpine Shire.";

export const OPERATOR_NAME = "Lions Club of Myrtleford";
