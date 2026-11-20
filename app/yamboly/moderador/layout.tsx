import "server-only";
import { requireAdmin } from "@/lib/admin-auth";
import type { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Moderador · Yámboly Quiz | ISACA UNT",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function YambolyModeratorLayout({ children }: { children: ReactNode }) {
  // Enforces official admin authentication (redirects to /login if not logged in)
  await requireAdmin();
  return <>{children}</>;
}
