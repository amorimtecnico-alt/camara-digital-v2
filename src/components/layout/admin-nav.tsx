"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AdminNavProps = {
  items: Array<{
    href: string;
    label: string;
  }>;
};

export function AdminNav({ items }: AdminNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-2">
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-2xl px-4 py-3 text-sm font-medium transition duration-200 hover:scale-[1.02] ${
              isActive ? "bg-sidebar-active text-white shadow-sm" : "text-white/82 hover:bg-white/10 hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
