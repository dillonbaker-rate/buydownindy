"use client";
import { Check, Copy, Mail, MessageSquare, MoreHorizontal, Share2, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

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
export function ShareListing({ title, text, post }: { title: string; text: string; post: string }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [canNative, setCanNative] = useState(false);
  const { copied, copy } = useCopy();

  useEffect(() => {
    setUrl(window.location.origin + window.location.pathname);
    setCanNative(typeof navigator.share === "function");
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
                <span className="text-[11px] text-neutral-700">Paste into Facebook, Instagram, or LinkedIn. Keep the last line: it&apos;s the required disclosure.</span>
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
