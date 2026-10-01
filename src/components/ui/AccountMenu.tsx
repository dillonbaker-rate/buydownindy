"use client";
/* eslint-disable @next/next/no-img-element */
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export interface AccountSummary {
  name: string;
  email: string;
  photoUrl: string | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  /** Unworked leads, shown on the Leads menu item (super admin). */
  newLeads: number;
  /** Signed in but hasn't saved an agent profile yet. */
  needsProfile: boolean;
  canSignOut: boolean;
}

/** Signed-in agent's account button (top-left, next to the logo) with a menu. */
export function AccountMenu({ me }: { me: AccountSummary }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const first = me.name.split(" ")[0] || me.email.split("@")[0];

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const item = "flex min-h-11 items-center px-4 text-sm text-ink no-underline hover:bg-accent-100 hover:text-ink";
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Account: ${me.name || me.email}`}
        className="flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-divider bg-bg py-1 pr-2.5 pl-1 hover:bg-surface"
      >
        <span className="grid h-8 w-8 flex-none place-items-center overflow-hidden rounded-full bg-accent text-sm font-bold text-white">
          {me.photoUrl ? <img src={me.photoUrl} alt="" className="h-full w-full object-cover" /> : first.slice(0, 1).toUpperCase()}
        </span>
        <span className="hidden max-w-[140px] truncate text-sm font-semibold sm:inline">{first}</span>
        {me.newLeads > 0 && <span className="h-2 w-2 rounded-full bg-accent" aria-label={`${me.newLeads} new leads`} />}
        <ChevronDown size={14} className="text-neutral-600" />
      </button>
      {open && (
        <div role="menu" className="fixed inset-x-4 top-14 z-[3000] overflow-hidden rounded-[14px] border border-divider bg-bg py-1 shadow-lg sm:absolute sm:inset-x-auto sm:top-full sm:left-0 sm:mt-1.5 sm:w-60">
          <div className="border-b border-divider px-4 py-2.5">
            <div className="truncate text-sm font-bold">{me.name || "Agent"}</div>
            <div className="truncate text-xs text-neutral-700">{me.email}</div>
          </div>
          {me.needsProfile ? (
            <Link href="/agent" role="menuitem" className={item} onClick={() => setOpen(false)}>
              Finish your profile
            </Link>
          ) : (
            <>
              <Link href="/agent" role="menuitem" className={item} onClick={() => setOpen(false)}>
                My listings
              </Link>
              <Link href="/agent/post" role="menuitem" className={item} onClick={() => setOpen(false)}>
                Post a listing
              </Link>
              <Link href="/agent/profile" role="menuitem" className={item} onClick={() => setOpen(false)}>
                My profile
              </Link>
            </>
          )}
          {me.isAdmin && (
            <>
              <div className="border-t border-divider px-4 pt-2 pb-1 text-[11px] text-neutral-700">
                {me.isSuperAdmin ? "Super admin" : "Admin"}
              </div>
              {me.isSuperAdmin && (
                <Link href="/agent/leads" role="menuitem" className={item} onClick={() => setOpen(false)}>
                  <span className="flex-1">Leads</span>
                  {me.newLeads > 0 && <span className="tag bg-accent font-semibold text-white">{me.newLeads} new</span>}
                </Link>
              )}
              <Link href="/agent/rates" role="menuitem" className={item} onClick={() => setOpen(false)}>
                Today&apos;s rates
              </Link>
              <Link href="/agent/admin" role="menuitem" className={item} onClick={() => setOpen(false)}>
                Agents
              </Link>
            </>
          )}
          {me.canSignOut && (
            <form action="/auth/signout" method="post" className="border-t border-divider">
              <button role="menuitem" className={`${item} w-full cursor-pointer text-left text-neutral-800`}>
                Sign out
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
