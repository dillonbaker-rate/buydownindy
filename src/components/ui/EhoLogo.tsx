/**
 * Equal Housing Opportunity mark (house with equal sign), drawn to match HUD's official logo.
 * COMPLIANCE: confirm this artwork against HUD's official file before launch, or swap in that file.
 */
export function EhoLogo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Equal Housing Opportunity" className="block flex-none">
      <path d="M32 4 2 26h7v34h46V26h7L32 4Zm15 49H17V24.6L32 13.5l15 11.1V53Z" fill="currentColor" />
      <rect x="21" y="30" width="22" height="6" fill="currentColor" />
      <rect x="21" y="41" width="22" height="6" fill="currentColor" />
    </svg>
  );
}
