/** An email's HTML shown as the recipient sees it, isolated in a sandboxed frame. Links open in a new tab. */
export function EmailFrame({ html, title }: { html: string; title: string }) {
  const doc = html.replace(/<head>|<html>/i, (m) => `${m}<base target="_blank">`);
  return (
    <iframe
      title={title}
      srcDoc={doc.includes("<base") ? doc : `<base target="_blank">${doc}`}
      // No scripts run (no allow-scripts); same-origin lets images from this site load (browsers block them from a null origin).
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      className="h-[70vh] min-h-[480px] w-full rounded-[14px] border border-divider bg-white"
    />
  );
}
