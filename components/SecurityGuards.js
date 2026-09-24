"use client";

import { useEffect } from "react";

export default function SecurityGuards() {
  useEffect(() => {
    const isEditable = (el) => {
      if (!el) return false;
      const tag = (el.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return true;
      if (el.isContentEditable) return true;
      return false;
    };

    const onCopy = (e) => {
      e.preventDefault();
    };
    const onCut = (e) => {
      e.preventDefault();
    };
    const onPaste = (e) => {
      e.preventDefault();
    };
    const onContextMenu = (e) => {
      e.preventDefault();
    };

    const onKeyDown = async (e) => {
      const key = (e.key || "").toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;

      // Block copy/cut/paste/select-all even inside inputs (as requested)
      if (ctrl && (key === "c" || key === "x" || key === "v" || key === "a")) {
        e.preventDefault();
        return;
      }

      // Block save/print
      if (ctrl && (key === "s" || key === "p")) {
        e.preventDefault();
        return;
      }

      // Block devtools shortcuts (best-effort)
      if (key === "f12") {
        e.preventDefault();
        return;
      }
      if (ctrl && e.shiftKey && (key === "i" || key === "j" || key === "c")) {
        e.preventDefault();
        return;
      }

      // Best-effort PrintScreen handling
      if (key === "printscreen") {
        e.preventDefault();
        try {
          // Some browsers allow clearing clipboard; many will ignore.
          await navigator.clipboard?.writeText?.("");
        } catch {
          // ignore
        }
      }

      if (ctrl && e.shiftKey && key === "s") {
        e.preventDefault();
      }
    };

    
    document.addEventListener("copy", onCopy, true);
    document.addEventListener("cut", onCut, true);
    document.addEventListener("paste", onPaste, true);
    document.addEventListener("contextmenu", onContextMenu, true);
    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      document.removeEventListener("copy", onCopy, true);
      document.removeEventListener("cut", onCut, true);
      document.removeEventListener("paste", onPaste, true);
      document.removeEventListener("contextmenu", onContextMenu, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, []);

  return null;
}
