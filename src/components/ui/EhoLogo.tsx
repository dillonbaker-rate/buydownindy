/** Official Equal Housing Lender mark (public-domain FDIC artwork). Path data lives in content/eho.ts. */
import { EHL_PATH } from "@/content/eho";

export function EhoLogo({ size = 30 }: { size?: number }) {
  return (
    <svg width={(size * 150.47) / 163.16} height={size} viewBox="0 0 150.47 163.16" role="img" aria-label="Equal Housing Lender" className="block flex-none">
      <path d={EHL_PATH} fill="currentColor" />
    </svg>
  );
}
