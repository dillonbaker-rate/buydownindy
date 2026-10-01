"use client";
import Link from "next/link";

// Shown if something on an agent page crashes, with the message so it can be reported.
export default function AgentError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-[560px] flex-col items-start gap-3 p-4 lg:p-8">
      <h1 className="text-[26px]">Something went wrong</h1>
      <p className="m-0 text-sm text-neutral-700">
        Your work on earlier steps may need to be re-entered. Try again, and if it keeps happening, send this to Dillon:
      </p>
      <pre className="w-full overflow-auto rounded-[14px] bg-surface p-3 text-xs whitespace-pre-wrap">
        {error.message}
        {error.digest ? `\n(ref ${error.digest})` : ""}
      </pre>
      <div className="flex gap-2">
        <button className="btn btn-primary" onClick={reset}>
          Try again
        </button>
        <Link href="/agent" className="btn btn-secondary">
          My listings
        </Link>
      </div>
    </div>
  );
}
