"use client";
import { FileUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { detectColumns, parseCsv, toRecord, type StateLicense } from "@/lib/state-licenses-shared";

const CHUNK = 1000;

/** Admin: pick the state's licensee CSV, check what was read, then import it in chunks. */
export function StateLicenseImport() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<{ name: string; records: StateLicense[]; skipped: number; active: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [done, setDone] = useState<{ rows: number; agentsVerified: number } | null>(null);

  const read = async (f: File | undefined) => {
    setErr(null);
    setDone(null);
    setFile(null);
    if (!f) return;
    if (/\.xlsx?$/i.test(f.name)) return setErr("That's an Excel file. Open it in Excel and use File → Save As → CSV, then pick the .csv here.");
    const rows = parseCsv(await f.text());
    if (rows.length < 2) return setErr("That file looks empty.");
    const cols = detectColumns(rows[0]);
    if ("error" in cols) return setErr(cols.error);
    const records = rows.slice(1).map((r) => toRecord(r, cols));
    const ok = records.filter((r): r is StateLicense => !!r);
    const active = ok.filter((r) => /active/i.test(r.status ?? "") && !/inactive/i.test(r.status ?? "")).length;
    setFile({ name: f.name, records: ok, skipped: records.length - ok.length, active });
  };

  const post = async (body: unknown) => {
    const r = await fetch("/api/admin/state-licenses", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error ?? "Import failed.");
    return j;
  };

  const run = async () => {
    if (!file) return;
    setErr(null);
    setProgress(0);
    try {
      const { id } = await post({ action: "start", fileName: file.name });
      for (let i = 0; i < file.records.length; i += CHUNK) {
        await post({ action: "rows", batch: id, rows: file.records.slice(i, i + CHUNK) });
        setProgress(Math.min(i + CHUNK, file.records.length));
      }
      setDone(await post({ action: "finish", batch: id }));
      setFile(null);
      router.refresh();
    } catch (e) {
      setErr(`${e instanceof Error ? e.message : String(e)} Nothing was removed; you can run the import again.`);
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => read(e.target.files?.[0])} />
      <button type="button" className="btn btn-primary self-start" onClick={() => fileRef.current?.click()} disabled={progress !== null}>
        <FileUp size={16} />
        Choose the CSV file
      </button>

      {file && (
        <div className="flex flex-col gap-2 rounded-[14px] bg-surface p-4 text-sm">
          <div>
            <strong>{file.name}</strong>: {file.records.length.toLocaleString("en-US")} licenses ({file.active.toLocaleString("en-US")} active)
            {file.skipped ? `, ${file.skipped} rows without a license number skipped` : ""}.
          </div>
          {file.records[0] && (
            <div className="text-xs text-neutral-700">
              First row read as: {file.records[0].license_number} ·{" "}
              {file.records[0].full_name ?? `${file.records[0].first_name ?? ""} ${file.records[0].last_name ?? ""}`.trim()} · {file.records[0].status ?? "no status"}
              {file.records[0].expires_on ? ` · expires ${file.records[0].expires_on}` : ""}
            </div>
          )}
          <button type="button" className="btn btn-primary self-start" onClick={run} disabled={progress !== null}>
            {progress !== null ? `Importing… ${progress.toLocaleString("en-US")} of ${file.records.length.toLocaleString("en-US")}` : `Import ${file.records.length.toLocaleString("en-US")} licenses`}
          </button>
        </div>
      )}

      {done && (
        <div className="rounded-[14px] bg-accent-100 p-4 text-sm">
          <strong>Imported {done.rows.toLocaleString("en-US")} licenses.</strong>{" "}
          {done.agentsVerified ? `${done.agentsVerified} waiting agent${done.agentsVerified === 1 ? " was" : "s were"} verified from the new list.` : "No waiting agents matched."}
        </div>
      )}
      {err && <div className="text-sm text-warn-text">{err}</div>}
    </div>
  );
}
