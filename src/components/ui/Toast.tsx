"use client";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

const Ctx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const tm = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = useCallback((m: string) => {
    clearTimeout(tm.current);
    setMsg(m);
    tm.current = setTimeout(() => setMsg(null), 2800);
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-16 z-[3000] flex justify-center">
        {msg && (
          <div className="max-w-[480px] rounded-full bg-ink px-[18px] py-3 text-sm text-white shadow-lg">{msg}</div>
        )}
      </div>
    </Ctx.Provider>
  );
}
