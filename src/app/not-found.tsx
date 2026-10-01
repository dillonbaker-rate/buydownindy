import Link from "next/link";
import { AppShell } from "@/components/ui/Header";

export default function NotFound() {
  return (
    <AppShell>
      <div className="mx-auto flex max-w-[1080px] flex-col items-start gap-2.5 p-4 lg:p-8">
        <h1 className="text-[26px] lg:text-[32px]">This listing isn&apos;t available</h1>
        <p className="m-0 text-sm text-neutral-700">It may have sold, expired, or been taken down by the agent.</p>
        <Link href="/homes" className="btn btn-primary">
          Back to the map
        </Link>
      </div>
    </AppShell>
  );
}
