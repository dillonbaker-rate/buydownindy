import { Star } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { getCurrentAgent } from "@/lib/data";
import { countNewLeads, isSuperAdmin } from "@/lib/leads";
import { isAdmin } from "@/lib/rates";
import { agentsEnabled, supabaseConfigured } from "@/lib/supabase/env";
import { AccountMenu } from "./AccountMenu";
import { Footer } from "./Footer";
import { SideNav } from "./SideNav";

export function Wordmark() {
  return (
    <Link href="/homes" aria-label="BuyDown Indy, back to the map" className="flex min-h-9 items-center no-underline">
      <span className="flex items-stretch text-[18px] leading-none font-bold tracking-[-0.03em]">
        <span className="py-1.5 pr-0.5 text-ink">BuyDown</span>
        <span className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-[5px] text-white">
          Indy
          <Star size={14} fill="currentColor" strokeWidth={0} />
        </span>
      </span>
    </Link>
  );
}

/**
 * Logo and (when signed in) the agent's account menu on the left; page links on the right,
 * plus a prominent "Agent sign in" when signed out.
 */
export async function Header({ children, hideSignIn }: { children?: ReactNode; hideSignIn?: boolean }) {
  const me = agentsEnabled ? await getCurrentAgent().catch(() => null) : null;
  const superAdmin = !!me && isSuperAdmin(me.email);
  const newLeads = superAdmin ? await countNewLeads().catch(() => 0) : 0;
  return (
    <header className="flex flex-none items-center gap-2 border-b border-divider bg-bg px-4 py-2.5 lg:px-8">
      <div className="mr-auto flex min-w-0 items-center gap-2 sm:gap-3">
        <Wordmark />
        {me && (
          <AccountMenu
            me={{
              name: me.agent?.name ?? "",
              email: me.email,
              photoUrl: me.agent?.photoUrl ?? null,
              isAdmin: isAdmin(me.email) || superAdmin,
              isSuperAdmin: superAdmin,
              newLeads,
              needsProfile: !me.agent,
              canSignOut: supabaseConfigured,
            }}
          />
        )}
      </div>
      {children}
      {!me && agentsEnabled && !hideSignIn && (
        <Link href="/agent/login" className="btn btn-primary min-h-10 px-3.5 text-[13px]">
          Agent sign in
        </Link>
      )}
    </header>
  );
}

/** Full-height app frame: header, a flexible content area, and the compliance footer pinned at the bottom. */
export function AppShell({
  header,
  hideSignIn,
  mobileNav = true,
  children,
}: {
  header?: ReactNode;
  hideSignIn?: boolean;
  /** Bottom tab bar on phones. Off for pages with their own sticky bottom actions. */
  mobileNav?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header hideSignIn={hideSignIn}>{header}</Header>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <SideNav mobile={mobileNav} />
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      </div>
      <Footer />
    </div>
  );
}
