"use client";
import { Component, type ReactNode } from "react";

/** Keeps a map failure from taking down the page: shows a quiet fallback instead. */
export class MapErrorBoundary extends Component<{ children: ReactNode; className?: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error("Map error", error);
  }
  render() {
    if (this.state.failed)
      return (
        <div className={`grid place-items-center bg-neutral-200 text-[13px] text-neutral-700 ${this.props.className ?? ""}`}>
          Map unavailable. You can keep going.
        </div>
      );
    return this.props.children;
  }
}
