import { useEffect, useRef } from "react";

/**
 * On Android the hardware back button fires a `popstate` event instead of
 * navigating away or closing the app. Without a handler, pressing back while a
 * modal is open either dismisses the underlying page or exits the app.
 *
 * When the modal opens we push a dummy history entry. Back button pops it and
 * our `popstate` listener closes the modal. When the modal is closed by other
 * means (X button, overlay click) we pop the dummy entry ourselves so the
 * history stack stays clean.
 */
export function useModalBack(isOpen: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    window.history.pushState({ modal: true }, "");

    let closedByBack = false;
    const handler = () => {
      closedByBack = true;
      onCloseRef.current();
    };
    window.addEventListener("popstate", handler);
    return () => {
      window.removeEventListener("popstate", handler);
      if (!closedByBack && window.history.state?.modal) {
        window.history.back();
      }
    };
  }, [isOpen]);
}
