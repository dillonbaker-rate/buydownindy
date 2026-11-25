/* eslint-disable @next/next/no-img-element */
import type React from "react";
import { ImageResponse } from "next/og";
import QRCode from "qrcode";
import sharp from "sharp";
import { ehlDataUrl } from "@/content/eho";
import { getListing } from "@/lib/data";
import { GRAPHIC_DESIGNS, GRAPHIC_SIZES, type GraphicSize } from "@/lib/share-graphics";
import { listingMarketing, type ListingMarketing } from "@/lib/marketing";
import { getRateInfo } from "@/lib/rates";

// Share-window graphics for a live listing. Branding and disclosures are built in and can't be edited.
// Satori rules: any element with more than one child needs display:flex, so every text node is one string.

const SIZES = Object.fromEntries(GRAPHIC_SIZES.map((g) => [g.value, g])) as Record<GraphicSize, (typeof GRAPHIC_SIZES)[number]>;
type Size = GraphicSize;

const NAVY = "#0e2f5a";
const ACCENT = "#1c5aa6";
const TINT = "#eef3fb";
const INK = "#1c2530";
const MUTED = "#5a636e";
const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

// ── Fonts (Figtree, cached per server instance) ──────────────────────────
let fonts: Promise<{ name: string; data: ArrayBuffer; weight: 400 | 700 | 800; style: "normal" }[]> | null = null;
function loadFonts() {
  fonts ??= Promise.all(
    ([400, 700, 800] as const).map(async (weight) => {
      const css = await (
        await fetch(`https://fonts.googleapis.com/css2?family=Figtree:wght@${weight}&display=swap`, {
          headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1" },
        })
      ).text();
      const url = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1];
      if (!url) throw new Error("font url");
      return { name: "Figtree", data: await (await fetch(url)).arrayBuffer(), weight, style: "normal" as const };
    }),
  ).catch((e) => {
    fonts = null;
    throw e;
  });
  return fonts;
}

/** Satori draws JPEG/PNG only: convert any photo (WebP, HEIC…) to a 1600px JPEG data URL. */
async function photoData(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const jpg = await sharp(Buffer.from(await r.arrayBuffer()))
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
    return `data:image/jpeg;base64,${jpg.toString("base64")}`;
  } catch {
    return null;
  }
}

interface P {
  m: ListingMarketing;
  w: number;
  h: number;
  photo: string | null;
  qr: string | null;
  size: Size;
  heads: Heads;
}
type Heads = { lender: string | null; agent: string | null; brand: Brand };

/** Square-cropped headshot as a small JPEG data URL. */
async function headshotData(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const jpg = await sharp(Buffer.from(await r.arrayBuffer()))
      .rotate()
      .resize(240, 240, { fit: "cover", position: "attention" })
      .jpeg({ quality: 85 })
      .toBuffer();
    return `data:image/jpeg;base64,${jpg.toString("base64")}`;
  } catch {
    return null;
  }
}

const Photo = ({ src, w, h, radius = 0, label }: { src: string | null; w: number; h: number; radius?: number; label: string }) =>
  src ? (
    <img src={src} alt="" width={w} height={h} style={{ width: w, height: h, objectFit: "cover", borderRadius: radius }} />
  ) : (
    <div style={{ width: w, height: h, borderRadius: radius, background: "#c3cad3", display: "flex", alignItems: "center", justifyContent: "center", color: "#3f4750", fontSize: 40, fontWeight: 700 }}>
      {label}
    </div>
  );

const Wordmark = ({ s = 1, light = false }: { s?: number; light?: boolean }) => (
  <div style={{ display: "flex", alignItems: "center", fontSize: 30 * s, fontWeight: 800, letterSpacing: -1 }}>
    <span style={{ color: light ? "#fff" : INK }}>BuyDown</span>
    <span style={{ marginLeft: 6 * s, background: light ? "#fff" : ACCENT, color: light ? NAVY : "#fff", borderRadius: 999, padding: `${2 * s}px ${14 * s}px` }}>Indy</span>
  </div>
);

/** Price cut vs. best buydown, the heart of every design. */
function Compare({ m, s, dark = false }: { m: ListingMarketing; s: number; dark?: boolean }) {
  const best = m.payments.best;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 * s }}>
    <div style={{ display: "flex", gap: 18 * s }}>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, borderRadius: 24 * s, padding: `${20 * s}px ${22 * s}px`, background: dark ? "rgba(255,255,255,0.12)" : TINT, color: dark ? "#fff" : INK }}>
        <div style={{ fontSize: 24 * s, fontWeight: 700 }}>{`${m.concessionShort} price cut`}</div>
        <div style={{ fontSize: 54 * s, fontWeight: 800, letterSpacing: -1.5 }}>{`${money(m.payments.priceCut)}/mo`}</div>
        <div style={{ fontSize: 22 * s, opacity: 0.8 }}>{`saves ${money(m.payments.priceCutSavings)}/mo`}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1.15, borderRadius: 24 * s, padding: `${20 * s}px ${22 * s}px`, background: "#fff", color: INK, boxShadow: "0 6px 20px rgba(0,0,0,0.12)" }}>
        <div style={{ fontSize: 24 * s, fontWeight: 700 }}>{best ? `${best.option}, year 1` : "Closing cost credit"}</div>
        <div style={{ fontSize: 54 * s, fontWeight: 800, letterSpacing: -1.5, color: ACCENT }}>{best ? `${money(best.year1)}/mo` : money(m.concession)}</div>
        <div style={{ fontSize: 22 * s, fontWeight: 700, color: "#123f78" }}>{best ? `saves ${money(best.savings)}/mo in year 1` : "toward closing costs"}</div>
        {best && <div style={{ fontSize: 21 * s, lineHeight: 1.3, marginTop: 6 * s, color: INK }}>{best.stepUp}</div>}
      </div>
    </div>
    <Terms m={m} s={s} light={dark} />
    </div>
  );
}

/** Example loan terms and APR, sized to read with the payments. */
function Terms({ m, s, light = false }: { m: ListingMarketing; s: number; light?: boolean }) {
  return <div style={{ fontSize: 21 * s, lineHeight: 1.3, color: light ? "rgba(255,255,255,0.9)" : "#3f4750" }}>{`${m.example} Principal & interest only.`}</div>;
}

function Person({ s, photo, role, name, lines, light, scale = 1, grow = true }: { s: number; photo: string | null; role?: string; name: string; lines: string[]; light: boolean; scale?: number; grow?: boolean }) {
  const k = s * scale;
  const d = 92 * k;
  const initials = name
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18 * k, minWidth: 0, ...(grow ? { flex: 1 } : {}) }}>
      {photo ? (
        <img src={photo} alt="" width={d} height={d} style={{ width: d, height: d, borderRadius: 999, objectFit: "cover", border: `${3 * s}px solid #fff` }} />
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: d, height: d, borderRadius: 999, background: light ? "rgba(255,255,255,0.18)" : "#dce7f7", color: light ? "#fff" : ACCENT, fontSize: 34 * k, fontWeight: 800 }}>
          {initials}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0, ...(grow ? { flex: 1 } : {}), color: light ? "#fff" : INK }}>
        {role && <div style={{ fontSize: 15 * Math.max(k, s), fontWeight: 800, letterSpacing: 1.5, color: light ? "#bfd2ef" : ACCENT }}>{role}</div>}
        <div style={{ fontSize: 25 * k, fontWeight: 800, lineHeight: 1.15 }}>{name}</div>
        {lines.map((t, i) => (
          <div key={i} style={{ fontSize: 18 * k, lineHeight: 1.3, opacity: 0.85 }}>
            {t}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Who the flyer features: the listing agent (default), or the agent and lender co-branded. */
type Brand = "agent" | "co";

/** Contact block + disclosures. Fills the space left under the numbers; the people sit left, centered top to bottom. */
function Footer({ m, s, qr, heads, light = false, agentScale = 1.6 }: { m: ListingMarketing; s: number; qr: string | null; heads: Heads; light?: boolean; agentScale?: number }) {
  const a = m.listingAgent;
  const agentLines = [a.brokerage, a.phone ?? "", a.email ?? ""].filter(Boolean);
  const qrImg = qr ? <img key="qr" src={qr} alt="" width={130 * s} height={130 * s} style={{ borderRadius: 8, flexShrink: 0 }} /> : null;
  const divider = `${2 * s}px solid ${light ? "rgba(255,255,255,0.25)" : "#dde2e8"}`;

  // Satori lays out plain element lists reliably (not fragments), so each row is a keyed list.
  const people: React.ReactNode[] =
    heads.brand === "co"
      ? [
          <div key="a" style={{ display: "flex", flex: 1, minWidth: 0 }}>
            <Person s={s} scale={1.1} light={light} role="LISTING AGENT" photo={heads.agent} name={a.name} lines={agentLines} />
          </div>,
          <div key="l" style={{ display: "flex", flex: 1, minWidth: 0, paddingLeft: 20 * s, borderLeft: divider }}>
            <Person s={s} scale={1.1} light={light} role="LENDER" photo={heads.lender} name={m.lender.name} lines={[`${m.lender.title}, ${m.lender.company}`, m.lender.phone, `NMLS #${m.lender.nmls}`]} />
          </div>,
        ]
      : [<Person key="a" s={s} scale={agentScale} light={light} role="LISTING AGENT" photo={heads.agent} name={a.name} lines={agentLines} />];
  if (qrImg) people.push(qrImg);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 14 * s }}>
      <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 22 * s, padding: `${14 * s}px 0` }}>{people}</div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 * s }}>
        <img src={ehlDataUrl(light ? "#ffffff" : "#242020")} alt="" width={50 * s} height={54 * s} style={{ width: 50 * s, height: 54 * s, flexShrink: 0 }} />
        <div style={{ fontSize: 15 * s, lineHeight: 1.28, color: light ? "rgba(255,255,255,0.85)" : "#4a525c" }}>{`${m.disclaimer} ${m.lender.email}`}</div>
      </div>
    </div>
  );
}

const facts = (m: ListingMarketing) => `${m.beds} bd · ${m.baths} ba · ${m.sqft.toLocaleString("en-US")} sq ft`;

function Classic({ m, w, h, photo, qr, size, heads }: P) {
  const s = w / 1080;
  const ph = Math.round(h * (size === "post" ? 0.33 : size === "story" ? 0.5 : 0.36));
  return (
    <div style={{ width: w, height: h, display: "flex", flexDirection: "column", background: "#fff", fontFamily: "Figtree" }}>
      <div style={{ display: "flex", position: "relative" }}>
        <Photo src={photo} w={w} h={ph} label={m.address} />
        <div style={{ position: "absolute", top: 40 * s, left: 40 * s, display: "flex", flexDirection: "column", background: ACCENT, color: "#fff", borderRadius: 26 * s, padding: `${16 * s}px ${26 * s}px` }}>
          <div style={{ fontSize: 70 * s, fontWeight: 800, lineHeight: 1, letterSpacing: -2 }}>{m.concessionShort}</div>
          <div style={{ fontSize: 24 * s, fontWeight: 700 }}>from the seller</div>
        </div>
        <div style={{ position: "absolute", top: 40 * s, right: 40 * s, display: "flex", background: "#fff", borderRadius: 999, padding: `${8 * s}px ${18 * s}px` }}>
          <Wordmark s={s * 0.85} />
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: `${34 * s}px ${48 * s}px ${30 * s}px`, gap: 20 * s }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontSize: 68 * s, fontWeight: 800, letterSpacing: -2, color: INK }}>{money(m.price)}</div>
            <div style={{ fontSize: 26 * s, color: MUTED }}>{facts(m)}</div>
          </div>
          <div style={{ fontSize: 30 * s, color: "#3f4750" }}>{`${m.address}, ${m.city}, IN`}</div>
        </div>
        <div style={{ fontSize: 30 * s, fontWeight: 700, color: INK }}>{`Same ${m.concessionShort} from the seller. Very different payment.`}</div>
        <Compare m={m} s={s} />
        <Footer m={m} s={s} qr={qr} heads={heads} />
      </div>
    </div>
  );
}

function Bold({ m, w, h, photo, qr, size, heads }: P) {
  const s = w / 1080;
  const ph = Math.round(h * (size === "story" ? 0.3 : size === "post" ? 0.09 : 0.19));
  const best = m.payments.best;
  return (
    <div style={{ width: w, height: h, display: "flex", flexDirection: "column", background: NAVY, color: "#fff", fontFamily: "Figtree", padding: `${48 * s}px ${48 * s}px ${34 * s}px`, gap: 24 * s }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Wordmark s={s} light />
        <div style={{ fontSize: 24 * s, fontWeight: 700, opacity: 0.85 }}>{`${m.city}, IN`}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 34 * s, fontWeight: 700, color: "#bfd2ef" }}>THE SELLER IS PAYING</div>
        <div style={{ fontSize: 150 * s, fontWeight: 800, lineHeight: 0.95, letterSpacing: -5 }}>{money(m.concession)}</div>
        <div style={{ fontSize: 40 * s, fontWeight: 800 }}>{best ? `toward your rate: ${money(best.year1)}/mo in year 1` : "toward your closing costs"}</div>
        {best && <div style={{ fontSize: 26 * s, color: "#dbe6f5" }}>{best.stepUp}</div>}
      </div>
      <div style={{ display: "flex", borderRadius: 28 * s, overflow: "hidden" }}>
        <Photo src={photo} w={w - 96 * s} h={ph} label={m.address} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontSize: 56 * s, fontWeight: 800 }}>{money(m.price)}</div>
        <div style={{ fontSize: 26 * s, opacity: 0.85 }}>{`${m.address} · ${facts(m)}`}</div>
      </div>
      <Compare m={m} s={s} dark />
      <Footer m={m} s={s} qr={qr} heads={heads} light agentScale={1.35} />
    </div>
  );
}

function Numbers({ m, w, h, photo, qr, size, heads }: P) {
  const s = w / 1080;
  const best = m.payments.best;
  const save = best ? best.savings : m.payments.priceCutSavings;
  const maxSave = Math.max(save, m.payments.priceCutSavings, 1);
  const bar = (v: number, color: string, label: string, amount: string) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 * s }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28 * s, fontWeight: 700, color: INK }}>
        <span>{label}</span>
        <span>{amount}</span>
      </div>
      <div style={{ display: "flex", height: 30 * s, borderRadius: 999, background: "#dce7f7" }}>
        <div style={{ width: `${Math.max(4, (v / maxSave) * 100)}%`, height: 30 * s, borderRadius: 999, background: color }} />
      </div>
    </div>
  );
  return (
    <div style={{ width: w, height: h, display: "flex", flexDirection: "column", background: TINT, fontFamily: "Figtree", padding: `${48 * s}px ${48 * s}px ${34 * s}px`, gap: 26 * s }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Wordmark s={s} />
        <div style={{ display: "flex", background: ACCENT, color: "#fff", borderRadius: 999, padding: `${8 * s}px ${20 * s}px`, fontSize: 26 * s, fontWeight: 800 }}>{`${m.concessionShort} from the seller`}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", color: INK }}>
        <div style={{ fontSize: 128 * s, fontWeight: 800, letterSpacing: -4, color: ACCENT, lineHeight: 1 }}>{`${money(save)}/mo`}</div>
        <div style={{ fontSize: 44 * s, fontWeight: 800, letterSpacing: -1 }}>{best ? `less in year 1 with a ${best.option}` : "less with a price cut"}</div>
        <div style={{ fontSize: 30 * s, color: MUTED, marginTop: 6 * s }}>{`vs. ${money(m.payments.priceCutSavings)}/mo with a ${m.concessionShort} price cut`}</div>
        {best && <div style={{ fontSize: 26 * s, color: INK, marginTop: 4 * s }}>{best.stepUp}</div>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 * s, background: "#fff", borderRadius: 28 * s, padding: `${26 * s}px ${28 * s}px` }}>
        {bar(m.payments.priceCutSavings, "#76808c", `${m.concessionShort} price cut`, `−${money(m.payments.priceCutSavings)}/mo`)}
        {best && bar(best.savings, ACCENT, `${best.option}, year 1`, `−${money(best.savings)}/mo`)}
        <Terms m={m} s={s} />
      </div>
      <div style={{ display: "flex", flexDirection: size === "story" ? "column" : "row", gap: 24 * s, alignItems: size === "story" ? "flex-start" : "center" }}>
        <Photo
          src={photo}
          w={Math.round((size === "story" ? 984 : 470) * s)}
          h={Math.round((size === "post" ? 200 : size === "story" ? 500 : 380) * s)}
          radius={22 * s}
          label=""
        />
        <div style={{ display: "flex", flexDirection: "column", color: INK }}>
          <div style={{ fontSize: 52 * s, fontWeight: 800 }}>{money(m.price)}</div>
          <div style={{ fontSize: 28 * s }}>{`${m.address}, ${m.city}`}</div>
          <div style={{ fontSize: 24 * s, color: MUTED }}>{facts(m)}</div>
        </div>
      </div>
      <Footer m={m} s={s} qr={qr} heads={heads} />
    </div>
  );
}

/** Wide link-preview card (iMessage, Facebook, email): photo, payments, terms and the full disclosures. */
function LinkPreview({ m, photo }: { m: ListingMarketing; photo: string | null }) {
  const best = m.payments.best;
  return (
    <div style={{ width: 1200, height: 630, display: "flex", flexDirection: "column", background: "#fff", fontFamily: "Figtree", color: INK }}>
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <div style={{ display: "flex", position: "relative" }}>
          <Photo src={photo} w={500} h={518} label="" />
          <div style={{ position: "absolute", top: 22, left: 22, display: "flex", flexDirection: "column", background: ACCENT, color: "#fff", borderRadius: 20, padding: "10px 18px" }}>
            <div style={{ fontSize: 46, fontWeight: 800, lineHeight: 1, letterSpacing: -1.5 }}>{m.concessionShort}</div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>from the seller</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "22px 30px 0", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Wordmark s={0.8} />
            <div style={{ fontSize: 18, color: MUTED }}>{facts(m)}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1.5 }}>{money(m.price)}</div>
            <div style={{ fontSize: 20, color: "#3f4750" }}>{`${m.address}, ${m.city}, IN`}</div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", flex: 1, borderRadius: 16, padding: "10px 14px", background: TINT }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{`${m.concessionShort} price cut`}</div>
              <div style={{ fontSize: 32, fontWeight: 800 }}>{`${money(m.payments.priceCut)}/mo`}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", flex: 1.2, borderRadius: 16, padding: "10px 14px", background: "#fff", border: `2px solid ${ACCENT}` }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{best ? `${best.option}, year 1` : "Closing cost credit"}</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: ACCENT }}>{best ? `${money(best.year1)}/mo` : money(m.concession)}</div>
              {best && <div style={{ fontSize: 14, lineHeight: 1.25 }}>{best.stepUp}</div>}
            </div>
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.3, color: "#3f4750" }}>{`${m.example} Principal & interest only.`}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 22px 12px", borderTop: "1px solid #dde2e8", background: "#fafbfc" }}>
        <img src={ehlDataUrl("#242020")} alt="" width={40} height={43} style={{ width: 40, height: 43, flexShrink: 0 }} />
        <div style={{ fontSize: 11.5, lineHeight: 1.28, color: "#4a525c" }}>{m.disclaimer}</div>
      </div>
    </div>
  );
}

const RENDER = [Classic, Bold, Numbers];

// GET /api/share/:id?size=post|story|flyer&design=0..2[&download=1]
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const url = new URL(req.url);
  const size = (url.searchParams.get("size") ?? "post") as Size | "link";
  const design = Math.min(Math.max(Number(url.searchParams.get("design") ?? 0) || 0, 0), RENDER.length - 1);
  if (!(size in SIZES) && size !== "link") return new Response("size must be post, story, flyer or link", { status: 400 });
  const [found, info] = await Promise.all([getListing((await params).id), getRateInfo()]);
  // Anyone with a listing's link can open it, and its link preview and flyers, hidden or not.
  if (!found) return new Response("Listing not found", { status: 404 });
  const hidden = found.status === "draft";
  // A hidden listing is owned by the admin account: credit the listing agent it's for, not the admin.
  // Its contact details are the admin's, so only the agent details saved on the listing are used.
  const l = hidden
    ? { ...found, agentName: found.handoffName || "Listing agent", brokerage: found.handoffBrokerage ?? "", agentPhone: found.handoffPhone ?? null, agentPhotoUrl: found.handoffPhotoUrl ?? null, agentEmail: found.handoffEmail ?? null }
    : found;
  const brand: Brand = url.searchParams.get("brand") === "co" ? "co" : "agent";

  const m = listingMarketing(l, info, url.origin);
  if (size === "link") {
    const [photo, fontData] = await Promise.all([photoData(m.photo), loadFonts().catch(() => undefined)]);
    const img = new ImageResponse(<LinkPreview m={m} photo={photo} />, { width: 1200, height: 630, fonts: fontData });
    img.headers.set("cache-control", found.status !== "live" ? "private, no-store" : "public, max-age=300, s-maxage=600");
    return img;
  }
  const { w, h } = SIZES[size];
  const [photo, fontData, qr, lenderHead, agentHead] = await Promise.all([
    photoData(m.photo),
    loadFonts().catch(() => undefined),
    size === "post" ? Promise.resolve(null) : QRCode.toDataURL(m.links.listing, { margin: 1, width: 240 }),
    brand === "co" ? headshotData(m.lender.photo) : Promise.resolve(null),
    headshotData(m.listingAgent.photo),
  ]);
  const heads: Heads = { lender: lenderHead, agent: agentHead, brand };
  const Design = RENDER[design];
  const img = new ImageResponse(<Design m={m} w={w} h={h} photo={photo} qr={qr} size={size} heads={heads} />, { width: w, height: h, fonts: fontData });
  if (url.searchParams.get("download"))
    img.headers.set("content-disposition", `attachment; filename="${l.address.replace(/[^A-Za-z0-9]+/g, "-")}-${size}-${GRAPHIC_DESIGNS[design].toLowerCase()}${brand === "co" ? "-with-lender" : ""}.png"`);
  // Hidden listings aren't public: don't let the CDN keep a copy.
  img.headers.set("cache-control", found.status !== "live" ? "private, no-store" : "public, max-age=300, s-maxage=600");
  return img;
}
