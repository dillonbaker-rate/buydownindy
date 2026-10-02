"use client";
/* eslint-disable @next/next/no-img-element */
import { ArrowRight, BadgeCheck, Camera, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/supabase/env";
import { COUNTIES, type Agent } from "@/lib/types";
import { AgreeToTerms } from "./AgentTerms";

type F = {
  name: string;
  teamName: string;
  brokerage: string;
  bio: string;
  phone: string;
  officePhone: string;
  officeAddress: string;
  website: string;
  instagram: string;
  facebook: string;
  linkedin: string;
  licenseNumber: string;
  mlsId: string;
  licensedSince: string;
  counties: string[];
  photoUrl: string;
};

const fromAgent = (a: Agent | null): F => ({
  name: a?.name ?? "",
  teamName: a?.teamName ?? "",
  brokerage: a?.brokerage ?? "",
  bio: a?.bio ?? "",
  phone: a?.phone ?? "",
  officePhone: a?.officePhone ?? "",
  officeAddress: a?.officeAddress ?? "",
  website: a?.website ?? "",
  instagram: a?.instagram ?? "",
  facebook: a?.facebook ?? "",
  linkedin: a?.linkedin ?? "",
  licenseNumber: a?.licenseNumber ?? "",
  mlsId: a?.mlsId ?? "",
  licensedSince: a?.licensedSince ? String(a.licensedSince) : "",
  counties: a?.counties ?? [],
  photoUrl: a?.photoUrl ?? "",
});

/** Square-crop and shrink to 600px JPEG before upload. */
async function squareJpeg(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const side = Math.min(bmp.width, bmp.height);
    const c = document.createElement("canvas");
    c.width = c.height = Math.min(600, side);
    c.getContext("2d")!.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, c.width, c.height);
    return await new Promise((res) => c.toBlob((b) => res(b ?? file), "image/jpeg", 0.86));
  } catch {
    return file;
  }
}

export function VerificationBadge({ status }: { status?: Agent["verificationStatus"] }) {
  if (status === "verified")
    return (
      <span className="tag tag-accent font-semibold">
        <BadgeCheck size={13} />
        License verified
      </span>
    );
  if (status === "rejected")
    return <span className="tag font-semibold" style={{ background: "var(--color-warn-tag)", color: "var(--color-warn-text)" }}>Couldn&apos;t verify license</span>;
  return (
    <span className="tag tag-neutral font-semibold">
      <Clock size={13} />
      Verification pending
    </span>
  );
}

export function AgentProfileForm({
  agent,
  email,
  userId,
  onboarding,
  isAdmin = false,
  termsAccepted = false,
}: {
  agent: Agent | null;
  email: string;
  userId: string;
  onboarding?: boolean;
  isAdmin?: boolean;
  /** Already agreed to the current Agent Terms when creating the account. */
  termsAccepted?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [f, setF] = useState<F>(() => fromAgent(agent));
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [agreed, setAgreed] = useState(termsAccepted);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (k: keyof F) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((s) => ({ ...s, [k]: e.target.value }));

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setErr(null);
    try {
      const blob = await squareJpeg(file);
      if (supabaseConfigured) {
        const sb = createClient();
        const path = `${userId}/avatar-${crypto.randomUUID()}.jpg`;
        const { error } = await sb.storage.from("agent-photos").upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
        if (error) throw new Error(error.message);
        setF((s) => ({ ...s, photoUrl: sb.storage.from("agent-photos").getPublicUrl(path).data.publicUrl }));
      } else {
        const fd = new FormData();
        fd.append("file", blob, "avatar.jpg");
        const r = await fetch("/api/demo/photos", { method: "POST", body: fd });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error);
        setF((s) => ({ ...s, photoUrl: j.url }));
      }
    } catch (e) {
      setErr(`Couldn't upload the photo: ${(e as Error).message}`);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (onboarding && !agreed) {
      setErr("Please agree to the Agent Terms.");
      return;
    }
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/agent", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...f, licensedSince: f.licensedSince ? Number(f.licensedSince) : null, ...(onboarding ? { acceptTerms: agreed } : {}) }),
    });
    setBusy(false);
    if (!res.ok) {
      setErr((await res.json().catch(() => ({}))).error ?? "Couldn't save. Try again.");
      return;
    }
    toast(onboarding ? "Profile saved. Welcome!" : "Profile updated.");
    router.push("/agent");
    router.refresh();
  };

  const text = (k: keyof F, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="field">
      <label htmlFor={`ap-${k}`}>{label}</label>
      <input id={`ap-${k}`} className="input" value={f[k] as string} onChange={set(k)} {...props} />
    </div>
  );

  return (
    <form onSubmit={save} className="flex flex-col gap-6" noValidate>
      <div className="flex flex-col gap-1">
        <h1 className="text-[26px] lg:text-[32px]">{onboarding ? "Set up your agent profile" : "My profile"}</h1>
        <p className="m-0 text-sm text-neutral-700">
          Buyers see your photo, name and brokerage on your listings. Your Indiana license is verified before you get the
          verified badge. Signed in as {email}.
        </p>
        {!onboarding && (
          <div className="mt-1">
            <VerificationBadge status={agent?.verificationStatus} />
          </div>
        )}
      </div>

      <section className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative grid h-24 w-24 flex-none cursor-pointer place-items-center overflow-hidden rounded-full border-2 border-neutral-300 bg-neutral-200 text-neutral-600"
          aria-label="Upload a profile photo"
        >
          {f.photoUrl ? <img src={f.photoUrl} alt="" className="h-full w-full object-cover" /> : <Camera size={26} strokeWidth={1.5} />}
        </button>
        <div className="flex flex-col items-start gap-1">
          <button type="button" className="btn btn-secondary min-h-10 text-[13px]" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? "Uploading…" : f.photoUrl ? "Change photo" : "Add a headshot"}
          </button>
          <span className="text-xs text-neutral-700">A clear, professional headshot. JPG or PNG.</span>
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => upload(e.target.files?.[0])} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[17px]">About you</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {text("name", "Full name *", { autoComplete: "name" })}
          {text("brokerage", "Brokerage *", { autoComplete: "organization" })}
          {text("teamName", "Team name (optional)")}
          {text("licensedSince", "Licensed since (year)", { inputMode: "numeric", placeholder: "2018" })}
        </div>
        <div className="field">
          <label htmlFor="ap-bio">Short bio (optional)</label>
          <textarea id="ap-bio" className="input" maxLength={600} value={f.bio} onChange={set("bio")} placeholder="A sentence or two buyers will see." />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[17px]">License</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {text("licenseNumber", isAdmin ? "Indiana real estate license # (optional for admins)" : "Indiana real estate license # *", { placeholder: "RB14012345", autoCapitalize: "characters" })}
          {text("mlsId", "MLS ID (MIBOR / BLC)")}
        </div>
        <p className="m-0 text-xs text-neutral-700">
          We check your license against the Indiana Professional Licensing Agency&apos;s public lookup. Changing your license
          number later sends your profile back for verification.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[17px]">Contact</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {text("phone", "Mobile phone *", { type: "tel", autoComplete: "tel" })}
          {text("officePhone", "Office phone", { type: "tel" })}
        </div>
        {text("officeAddress", "Office address", { autoComplete: "street-address" })}
        <div className="grid gap-3 sm:grid-cols-2">
          {text("website", "Website", { inputMode: "url", placeholder: "https://" })}
          {text("instagram", "Instagram", { placeholder: "@yourhandle" })}
          {text("facebook", "Facebook", { inputMode: "url", placeholder: "https://facebook.com/…" })}
          {text("linkedin", "LinkedIn", { inputMode: "url", placeholder: "https://linkedin.com/in/…" })}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-[17px]">Counties you serve</h2>
        <div className="flex flex-wrap gap-2">
          {COUNTIES.map((c) => {
            const on = f.counties.includes(c);
            return (
              <label
                key={c}
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-semibold"
                style={{ border: `1px solid ${on ? "var(--color-accent)" : "var(--color-divider)"}`, background: on ? "var(--color-accent-100)" : "transparent" }}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => setF((s) => ({ ...s, counties: on ? s.counties.filter((x) => x !== c) : [...s.counties, c] }))}
                  className="m-0 h-[18px] w-[18px] accent-accent"
                />
                {c}
              </label>
            );
          })}
        </div>
      </section>

      {onboarding && !termsAccepted && <AgreeToTerms checked={agreed} onChange={setAgreed} />}
      {err && <div className="text-sm text-warn-text">{err}</div>}
      <button className="btn btn-primary btn-flush min-h-12 px-4 text-[15px]" disabled={busy || uploading || (onboarding && !agreed)}>
        {busy ? "Saving…" : onboarding ? "Save and continue" : "Save profile"}
        <ArrowRight size={16} className="ml-auto" />
      </button>
    </form>
  );
}
