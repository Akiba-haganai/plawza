import { useEffect } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function topDialog(): HTMLElement | null {
  const all = document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]');
  return all.length > 0 ? (all[all.length - 1] ?? null) : null;
}

function focusables(dialog: HTMLElement): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
}

/** Finds the control that closes a dialog without needing per-dialog wiring. */
function findCloseButton(dialog: HTMLElement): HTMLButtonElement | null {
  const explicit = dialog.querySelector<HTMLButtonElement>("[data-dialog-close]");
  if (explicit) return explicit;
  const buttons = Array.from(dialog.querySelectorAll<HTMLButtonElement>("button"));
  const byText = buttons.find((b) => /^(cancel|close)$/i.test((b.textContent ?? "").trim()));
  if (byText) return byText;
  // Icon-only button (the "X" in the dialog header).
  return buttons.find((b) => (b.textContent ?? "").trim() === "" && b.querySelector("svg")) ?? null;
}

let labelCounter = 0;

/**
 * App-wide dialog accessibility, mounted once:
 *  - names each `role="dialog"` from its first heading (aria-labelledby)
 *  - moves focus into a dialog when it opens and restores it when it closes
 *  - traps Tab inside the topmost dialog
 *  - closes the topmost dialog on Escape by activating its Cancel/Close/X button
 */
export function DialogA11y(): null {
  useEffect(() => {
    let openDialog: HTMLElement | null = null;
    let returnFocusTo: HTMLElement | null = null;

    const sync = () => {
      const current = topDialog();
      if (current === openDialog) return;

      if (!current && openDialog) {
        returnFocusTo?.focus?.();
        returnFocusTo = null;
      }

      if (current) {
        if (!openDialog) returnFocusTo = document.activeElement as HTMLElement | null;
        if (!current.hasAttribute("aria-labelledby") && !current.hasAttribute("aria-label")) {
          const heading = current.querySelector<HTMLElement>("h1, h2, h3");
          if (heading) {
            if (!heading.id) heading.id = `dialog-title-${++labelCounter}`;
            current.setAttribute("aria-labelledby", heading.id);
          }
        }
        const items = focusables(current);
        const first = items.find((el) => el.tagName !== "A") ?? items[0];
        first?.focus();
      }
      openDialog = current;
    };

    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });

    const onKeyDown = (event: KeyboardEvent) => {
      const dialog = topDialog();
      if (!dialog) return;

      if (event.key === "Escape") {
        const close = findCloseButton(dialog);
        if (close) {
          event.preventDefault();
          close.click();
        }
        return;
      }

      if (event.key === "Tab") {
        const items = focusables(dialog);
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement;
        if (!first || !last) return;
        if (!dialog.contains(active)) {
          event.preventDefault();
          first.focus();
        } else if (event.shiftKey && active === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    sync();

    return () => {
      observer.disconnect();
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return null;
}
