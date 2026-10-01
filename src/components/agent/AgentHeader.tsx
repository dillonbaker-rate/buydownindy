import Link from "next/link";

export function AgentHeader({ onDash }: { onDash?: boolean }) {
  return (
    <>
      <Link href="/agent" className="btn btn-ghost text-[13px] font-semibold">
        My listings
      </Link>
      {onDash && (
        <Link href="/agent/post" className="btn btn-ghost text-[13px] font-semibold">
          Post a listing
        </Link>
      )}
    </>
  );
}

export function SetupNotice() {
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="mx-auto flex max-w-[560px] flex-col gap-2.5 p-4 lg:p-8">
        <h1 className="text-[26px]">Agent accounts aren&apos;t set up yet</h1>
        <p className="m-0 text-sm text-neutral-700">
          This deployment is running in demo mode with sample listings. Connect Supabase (see README) to turn on agent sign-in,
          posting, and photo uploads.
        </p>
        <Link href="/" className="btn btn-primary self-start">
          Back to the map
        </Link>
      </div>
    </div>
  );
}
