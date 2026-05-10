"use client";

import { usePathname, useRouter } from "next/navigation";

type Props = {
  href: string;
  children: React.ReactNode;
  className?: string;
};

export default function ClickableRow({ href, children, className = "" }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  function handleClick(e: React.MouseEvent<HTMLTableRowElement>) {
    if ((e.target as HTMLElement).closest("button, a, form")) return;
    const fullHref = href.startsWith("?") ? `${pathname}${href}` : href;
    router.push(fullHref);
  }

  return (
    <tr className={`cursor-pointer ${className}`} onClick={handleClick}>
      {children}
    </tr>
  );
}
