import { redirect } from "next/navigation";

// Moved: the calculator is public now.
export default async function OldOfferCalculator({ searchParams }: { searchParams: Promise<{ listing?: string }> }) {
  const { listing } = await searchParams;
  redirect(`/calculator${listing ? `?listing=${encodeURIComponent(listing)}` : ""}`);
}
