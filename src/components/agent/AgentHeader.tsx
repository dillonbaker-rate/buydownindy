import Link from "next/link";

/** Page links on agent screens. Profile, admin pages and sign out live in the account menu (top-left). */
export function AgentHeader({ onDash }: { onDash?: boolean; admin?: boolean }) {
  return onDash ? (
    <Link href="/agent/post" className="btn btn-ghost text-[13px] font-semibold">
      Post a listing
    </Link>
  ) : (
    <Link href="/agent" className="btn btn-ghost text-[13px] font-semibold">
      My listings
    </Link>
  );
}

export function SetupNotice() {
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="mx-auto flex max-w-[560px] flex-col gap-2.5 p-4 lg:p-8">
        <h1 className="text-[26px]">Agent accounts aren&apos;t set up yet</h1>
        <p className="m-0 text-sm text-neutral-700">
          This deployment is showing sample listings only. Connect Supabase (see README) to turn on agent sign-in,
          posting, and photo uploads.
        </p>
        <Link href="/homes" className="btn btn-primary self-start">
          Back to the map
        </Link>
      </div>
    </div>
  );
}
