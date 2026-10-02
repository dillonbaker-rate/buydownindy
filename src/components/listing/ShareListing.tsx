"use client";
/* eslint-disable @next/next/no-img-element */
import { Check, Copy, Download, Mail, MessageSquare, MoreHorizontal, Share2, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { GRAPHIC_DESIGNS, GRAPHIC_SIZES, type GraphicSize } from "@/lib/share-graphics";

/** Brand-colored round share button, like Eventbrite's "Share with friends" row. */
function Round({ label, bg, href, onClick, children }: { label: string; bg: string; href?: string; onClick?: () => void; children: ReactNode }) {
  const circle = (
    <span className="grid h-12 w-12 place-items-center rounded-full text-white transition-transform group-hover:scale-105" style={{ background: bg }}>
      {children}
    </span>
  );
  const cls = "group flex w-16 flex-col items-center gap-1.5 text-[11px] text-ink no-underline hover:text-ink";
  return href ? (
    <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className={cls} aria-label={`Share on ${label}`}>
      {circle}
      {label}
    </a>
  ) : (
    <button type="button" onClick={onClick} className={`${cls} cursor-pointer`} aria-label={label}>
      {circle}
      {label}
    </button>
  );
}

const InstagramMark = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);

const Glyph = ({ t, size = 18 }: { t: string; size?: number }) => <span style={{ fontWeight: 800, fontSize: size, lineHeight: 1, fontFamily: "Arial, sans-serif" }}>{t}</span>;

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      window.prompt("Copy this:", text);
    }
  };
  return { copied, copy };
}

/** "Share this house": a share window with social buttons, the link, and a ready-to-copy social post. */
export function ShareListing({ id, title, text, post }: { id: string; title: string; text: string; post: string }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [canNative, setCanNative] = useState(false);
  const { copied, copy } = useCopy();
  const [size, setSize] = useState<GraphicSize>("post");
  const [design, setDesign] = useState(0);
  const [canShareFiles, setCanShareFiles] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const track = useRef<HTMLDivElement>(null);
  const graphicsRef = useRef<HTMLDivElement>(null);
  const blobs = useRef(new Map<string, Promise<Blob>>());

  useEffect(() => {
    setUrl(window.location.origin + window.location.pathname);
    setCanNative(typeof navigator.share === "function");
    try {
      const probe = new File([new Blob()], "x.png", { type: "image/png" });
      setCanShareFiles(typeof navigator.canShare === "function" && navigator.canShare({ files: [probe] }));
    } catch {}
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const graphicUrl = (d: number) => `/api/share/${encodeURIComponent(id)}?size=${size}&design=${d}`;
  const current = graphicUrl(design);
  const ratio = GRAPHIC_SIZES.find((g) => g.value === size)!;
  const fileName = `buydown-indy-${GRAPHIC_DESIGNS[design].toLowerCase()}-${size}.png`;

  // Fetch the selected graphic ahead of time: phones only allow the share sheet right after a tap,
  // so the image has to be ready before the tap, not downloaded after it.
  const blobFor = (src: string) => {
    let b = blobs.current.get(src);
    if (!b) {
      b = fetch(src).then((r) => {
        if (!r.ok) throw new Error("Couldn't make the graphic.");
        return r.blob();
      });
      b.catch(() => blobs.current.delete(src));
      blobs.current.set(src, b);
    }
    return b;
  };
  useEffect(() => {
    if (open && canShareFiles) blobFor(current).catch(() => {});
  }, [open, canShareFiles, current]);

  const goTo = (i: number) => {
    const el = track.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
    setDesign(i);
  };
  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== design) setDesign(i);
  };
  const flash = (msg: string) => {
    setNote(msg);
    setTimeout(() => setNote(null), 4000);
  };
  const download = () => {
    const a = document.createElement("a");
    a.href = `${current}&download=1`;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  /** Sends the picture itself (not a link) to the phone's share sheet, so it can go straight to Instagram. */
  const shareImage = async (caption: boolean) => {
    if (caption) navigator.clipboard?.writeText(socialPost).catch(() => {});
    if (!canShareFiles) {
      download();
      flash(caption ? "Graphic downloaded and caption copied. Upload it to Instagram from your phone or Meta Business Suite." : "Graphic downloaded.");
      return;
    }
    try {
      const blob = await blobFor(current);
      await navigator.share({ files: [new File([blob], fileName, { type: "image/png" })] });
      if (caption) flash("Caption copied. Paste it into Instagram.");
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        download();
        flash("Your phone wouldn't share it directly, so we downloaded it instead.");
      }
    }
  };

  const e = encodeURIComponent;
  const message = `${text} ${url}`;
  const socialPost = post.replace("{link}", url);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-secondary min-h-10 text-[13px]">
        <Share2 size={15} />
        Share this house
      </button>
      {open && (
        <div onClick={() => setOpen(false)} className="fixed inset-0 z-[2500] flex items-end justify-center bg-neutral-900/55 lg:items-center lg:p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Share this house"
            onClick={(ev) => ev.stopPropagation()}
            className="flex max-h-[92dvh] w-full flex-col gap-5 overflow-auto rounded-t-[24px] bg-bg p-5 shadow-lg lg:w-[min(520px,100%)] lg:rounded-[24px]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xl font-bold">Share this house</div>
                <div className="text-[13px] text-neutral-700">{title}</div>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="grid h-10 w-10 flex-none cursor-pointer place-items-center rounded-full hover:bg-surface">
                <X size={18} />
              </button>
            </div>

            <div className="flex flex-wrap justify-start gap-x-2 gap-y-3">
              <Round
                label="Instagram"
                bg="linear-gradient(45deg,#f9a825 0%,#e1306c 50%,#833ab4 100%)"
                onClick={() => {
                  graphicsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  shareImage(true);
                }}
              >
                <InstagramMark />
              </Round>
              <Round label="Facebook" bg="#1877F2" href={`https://www.facebook.com/sharer/sharer.php?u=${e(url)}`}>
                <Glyph t="f" size={24} />
              </Round>
              <Round label="Messenger" bg="#0084FF" href={`fb-messenger://share/?link=${e(url)}`}>
                <Glyph t="m" size={22} />
              </Round>
              <Round label="LinkedIn" bg="#0A66C2" href={`https://www.linkedin.com/sharing/share-offsite/?url=${e(url)}`}>
                <Glyph t="in" />
              </Round>
              <Round label="X" bg="#000000" href={`https://twitter.com/intent/tweet?text=${e(text)}&url=${e(url)}`}>
                <Glyph t="𝕏" size={20} />
              </Round>
              <Round label="WhatsApp" bg="#25D366" href={`https://wa.me/?text=${e(message)}`}>
                <MessageSquare size={20} />
              </Round>
              <Round label="Email" bg="#5a636e" href={`mailto:?subject=${e(title)}&body=${e(message)}`}>
                <Mail size={20} />
              </Round>
              <Round label="Text" bg="#1c5aa6" href={`sms:?&body=${e(message)}`}>
                <MessageSquare size={20} />
              </Round>
              {canNative && (
                <Round
                  label="More"
                  bg="#9aa3ae"
                  onClick={async () => {
                    try {
                      await navigator.share({ title, text, url });
                    } catch {}
                  }}
                >
                  <MoreHorizontal size={20} />
                </Round>
              )}
            </div>

            <div ref={graphicsRef} className="flex scroll-mt-4 flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[15px] font-bold">Share a graphic</div>
                <div role="tablist" aria-label="Graphic size" className="flex rounded-full bg-surface p-1">
                  {GRAPHIC_SIZES.map((g) => (
                    <button
                      key={g.value}
                      type="button"
                      role="tab"
                      aria-selected={size === g.value}
                      onClick={() => setSize(g.value)}
                      className="min-h-8 cursor-pointer rounded-full px-3 text-[12px] font-semibold"
                      style={size === g.value ? { background: "var(--color-bg)", boxShadow: "0 1px 3px rgba(0,0,0,.15)" } : { color: "var(--color-neutral-700)" }}
                    >
                      {g.label} {g.ratio}
                    </button>
                  ))}
                </div>
              </div>
              <div ref={track} onScroll={onScroll} className="flex snap-x snap-mandatory overflow-x-auto rounded-[16px] bg-surface [scrollbar-width:none]">
                {GRAPHIC_DESIGNS.map((name, i) => (
                  <div key={name} className="flex w-full flex-none snap-center justify-center p-3">
                    <img
                      key={`${size}-${i}`}
                      src={graphicUrl(i)}
                      alt={`${name} ${ratio.label.toLowerCase()} graphic for ${title}`}
                      loading={i === 0 ? "eager" : "lazy"}
                      className="max-h-[46dvh] w-auto max-w-full rounded-[10px] bg-neutral-200 shadow-md"
                      style={{ aspectRatio: `${ratio.w} / ${ratio.h}` }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-2">
                {GRAPHIC_DESIGNS.map((name, i) => (
                  <button
                    key={name}
                    type="button"
                    aria-label={`${name} design`}
                    aria-current={design === i}
                    onClick={() => goTo(i)}
                    className="h-2.5 cursor-pointer rounded-full transition-all"
                    style={{ width: design === i ? 22 : 10, background: design === i ? "var(--color-accent)" : "var(--color-neutral-300)" }}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {canShareFiles && (
                  <button type="button" className="btn btn-primary flex-1" onClick={() => shareImage(false)}>
                    <Share2 size={15} />
                    Share image
                  </button>
                )}
                <button type="button" className={`btn ${canShareFiles ? "btn-secondary" : "btn-primary"} flex-1`} onClick={download}>
                  <Download size={15} />
                  Download
                </button>
              </div>
              {note && <div className="rounded-[12px] bg-accent-100 px-3 py-2 text-[13px]">{note}</div>}
              <span className="text-[11px] text-neutral-700">
                Today&apos;s numbers, disclosures and contact info are built into every graphic. Swipe for more designs.
              </span>
            </div>

            <div className="field">
              <label htmlFor="share-url">Listing link</label>
              <div className="flex gap-2">
                <input id="share-url" readOnly value={url} className="input" onFocus={(ev) => ev.currentTarget.select()} />
                <button type="button" className="btn btn-primary flex-none" onClick={() => copy("link", url)}>
                  {copied === "link" ? <Check size={15} /> : <Copy size={15} />}
                  {copied === "link" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <div className="field">
              <label htmlFor="share-post">Social media post</label>
              <textarea id="share-post" readOnly rows={9} value={socialPost} className="input !text-[13px] leading-snug" onFocus={(ev) => ev.currentTarget.select()} />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-neutral-700">Use it as the caption with your graphic. Keep the last line: it&apos;s the required disclosure.</span>
                <button type="button" className="btn btn-secondary" onClick={() => copy("post", socialPost)}>
                  {copied === "post" ? <Check size={15} /> : <Copy size={15} />}
                  {copied === "post" ? "Post copied" : "Copy post"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
