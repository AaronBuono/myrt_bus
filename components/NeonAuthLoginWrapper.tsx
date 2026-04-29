"use client";

import dynamic from "next/dynamic";

const NeonAuthLogin = dynamic(
  () => import("./NeonAuthLogin").then((m) => m.NeonAuthLogin),
  { ssr: false, loading: () => <div className="h-32 animate-pulse bg-[#F0F1F4] rounded-xl" /> }
);

export default function NeonAuthLoginWrapper() {
  return <NeonAuthLogin />;
}
