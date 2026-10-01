/* eslint-disable @next/next/no-img-element */
import { ArrowUpRight, Mail, Phone, Smartphone } from "lucide-react";
import Link from "next/link";
import { FREE_TO_USE } from "@/content/disclosures";
import { LENDER } from "@/content/lender";

const tel = (p: string) => "+1" + p.replace(/\D/g, "");

/** "Talk to a lender" contact card: photo, name, NMLS, Get pre-approved + Contact buttons. */
export function LenderCard({ contactHref }: { contactHref: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[20px] border border-divider bg-bg p-4 text-center">
      <div className="self-start text-xs text-neutral-700">Talk to a lender</div>
      <img
        src={LENDER.photo}
        alt={`${LENDER.name}, ${LENDER.title} at ${LENDER.company}`}
        width={96}
        height={96}
        className="h-24 w-24 rounded-full border-2 border-neutral-300 object-cover"
      />
      <div className="flex flex-col gap-0.5">
        <div className="text-[17px] font-bold">{LENDER.name}</div>
        <div className="text-[13px] font-semibold">
          {LENDER.title}, {LENDER.company}
        </div>
        <div className="text-xs text-neutral-700">
          NMLS #{LENDER.nmls} · {LENDER.company} NMLS #{LENDER.companyNmls}
        </div>
      </div>
      <div className="flex w-full flex-col gap-1.5 border-y border-divider py-3 text-left text-sm font-semibold">
        <a href={`mailto:${LENDER.email}`} className="flex min-h-9 items-center gap-2.5 text-ink no-underline hover:text-accent">
          <Mail size={18} className="flex-none" aria-hidden />
          <span className="truncate">{LENDER.email}</span>
        </a>
        <a href={`tel:${tel(LENDER.officePhone)}`} className="flex min-h-9 items-center gap-2.5 text-ink no-underline hover:text-accent">
          <Phone size={18} className="flex-none" aria-hidden />
          <span>{LENDER.officePhone}</span>
          <span className="text-xs font-normal text-neutral-700">Office</span>
        </a>
        <a href={`tel:${tel(LENDER.mobilePhone)}`} className="flex min-h-9 items-center gap-2.5 text-ink no-underline hover:text-accent">
          <Smartphone size={18} className="flex-none" aria-hidden />
          <span>{LENDER.mobilePhone}</span>
          <span className="text-xs font-normal text-neutral-700">Mobile</span>
        </a>
      </div>
      <div className="flex w-full flex-col gap-2">
        <a href={LENDER.preapprovalUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary w-full">
          Get pre-approved
          <ArrowUpRight size={16} />
        </a>
        <Link href={contactHref} className="btn btn-secondary w-full !border-accent text-accent">
          Contact {LENDER.firstName}
        </Link>
      </div>
      <div className="text-[11px] text-neutral-700">{FREE_TO_USE}</div>
    </div>
  );
}

/** Slim version pinned at the top of the lender form so "Get pre-approved" is always one tap away. */
export function LenderStrip() {
  return (
    <div className="flex items-center gap-3 rounded-[18px] border border-divider bg-bg p-2.5 pr-3">
      <img src={LENDER.photo} alt="" width={44} height={44} className="h-11 w-11 flex-none rounded-full object-cover" />
      <div className="min-w-0 flex-1 leading-tight">
        <div className="truncate text-sm font-bold">{LENDER.name}</div>
        <div className="truncate text-[11px] text-neutral-700">
          {LENDER.company} · NMLS #{LENDER.nmls}
        </div>
      </div>
      <a
        href={LENDER.preapprovalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-primary min-h-10 flex-none px-3 text-[13px]"
      >
        Get pre-approved
        <ArrowUpRight size={14} />
      </a>
    </div>
  );
}
