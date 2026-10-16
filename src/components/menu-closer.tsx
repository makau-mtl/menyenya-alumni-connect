"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// The header stays on screen when moving between pages, so open menus would stay open.
// After each page change this closes the mobile menu and hides the desktop dropdowns
// until the pointer leaves the header or the keyboard is used.
export function MenuCloser() {
  const pathname = usePathname();

  useEffect(() => {
    const header = document.getElementById("site-header");
    if (!header) return;

    header.querySelectorAll("details[open]").forEach((d) => d.removeAttribute("open"));
    if (document.activeElement instanceof HTMLElement && header.contains(document.activeElement)) {
      document.activeElement.blur();
    }

    // Only needed when the pointer is still over the header (the link was clicked in a dropdown).
    if (!header.matches(":hover")) return;
    header.setAttribute("data-menus-closed", "");
    const reopen = () => header.removeAttribute("data-menus-closed");
    header.addEventListener("pointerleave", reopen, { once: true });
    window.addEventListener("keydown", reopen, { once: true });
    return () => {
      header.removeEventListener("pointerleave", reopen);
      window.removeEventListener("keydown", reopen);
    };
  }, [pathname]);

  return null;
}
