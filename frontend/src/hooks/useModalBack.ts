import { useEffect, useRef } from "react";

interface ModalEntry {
  close: () => void;
  closedByBack: boolean;
  closing: boolean;
}

/**
 * Modals can stack (for example, the Pokémon sheet on top of an official
 * tournament sheet). Only the topmost modal must react to Escape or the
 * Android back button; otherwise closing the child also closes its parent.
 */
const modalStack: ModalEntry[] = [];
let ignorePopstate = 0;
let listening = false;

function handlePopState() {
  if (ignorePopstate > 0) {
    ignorePopstate -= 1;
    return;
  }
  const top = modalStack[modalStack.length - 1];
  if (!top || top.closing) return;
  top.closedByBack = true;
  top.closing = true;
  top.close();
}

function handleKeyDown(event: KeyboardEvent) {
  if (event.key !== "Escape") return;
  const top = modalStack[modalStack.length - 1];
  if (!top || top.closing) return;
  // Capture phase: stop the per-modal Escape listeners below so a child
  // closes alone.
  event.preventDefault();
  event.stopImmediatePropagation();
  top.closing = true;
  top.close();
}

function ensureListeners() {
  if (listening || typeof window === "undefined") return;
  window.addEventListener("popstate", handlePopState);
  window.addEventListener("keydown", handleKeyDown, true);
  listening = true;
}

/**
 * On Android the hardware back button fires a `popstate` event instead of
 * navigating away or closing the app. Without a handler, pressing back while a
 * modal is open either dismisses the underlying page or exits the app.
 *
 * When the modal opens we push a dummy history entry. Back button pops it and
 * our `popstate` listener closes the topmost modal. When the modal is closed by
 * other means (X button, overlay click) we pop the dummy entry ourselves so the
 * history stack stays clean. Closing a nested modal does not affect its parent.
 */
export function useModalBack(isOpen: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const entry: ModalEntry = {
      close: () => onCloseRef.current(),
      closedByBack: false,
      closing: false,
    };
    modalStack.push(entry);
    ensureListeners();
    window.history.pushState({ modal: true }, "");

    return () => {
      const index = modalStack.indexOf(entry);
      if (index >= 0) modalStack.splice(index, 1);
      if (!entry.closedByBack && window.history.state?.modal) {
        // The browser will fire popstate for this programmatic back. Ignore it
        // so the parent modal (if any) stays open.
        ignorePopstate += 1;
        window.setTimeout(() => {
          if (ignorePopstate > 0) ignorePopstate -= 1;
        }, 400);
        window.history.back();
      }
    };
  }, [isOpen]);
}
