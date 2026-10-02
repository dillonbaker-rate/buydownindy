import { AppShell } from "@/components/ui/Header";
import { LEGAL_DRAFT, LEGAL_UPDATED, type LegalSection } from "@/content/legal";

export function LegalPage({ title, sections }: { title: string; sections: LegalSection[] }) {
  return (
    <AppShell>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto flex max-w-[680px] flex-col gap-4 p-4 text-sm leading-relaxed lg:p-8">
          <div>
            <h1 className="text-[26px] lg:text-[32px]">{title}</h1>
            <p className="m-0 mt-1 text-xs text-neutral-700">
              Updated {LEGAL_UPDATED}
              {LEGAL_DRAFT ? " · Draft pending legal review" : ""}
            </p>
          </div>
          {sections.map((s) => (
            <section key={s.heading}>
              <h2 className="text-[16px]">{s.heading}</h2>
              <p className="m-0 mt-0.5 text-neutral-800">{s.body}</p>
            </section>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
