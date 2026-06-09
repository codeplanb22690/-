import { useEffect, useRef, useState } from "react";

type PageLockSnapshot = {
  body: Partial<Record<"overflow" | "touchAction", string>>;
  html: Partial<Record<"overflow" | "overscrollBehavior", string>>;
};

const KEYBOARD_OPEN_THRESHOLD = 24;

function preventRootTouchMove(event: TouchEvent) {
  const target = event.target;
  if (target instanceof HTMLElement && target.closest(".xingli-chat-messages")) return;
  event.preventDefault();
}

export function useKeyboardInset() {
  const [keyboardInset, setKeyboardInset] = useState(0);
  const pageLockRef = useRef<PageLockSnapshot | null>(null);
  const baselineHeightRef = useRef(0);

  useEffect(() => {
    const viewport = window.visualViewport;
    baselineHeightRef.current = Math.max(
      window.innerHeight,
      document.documentElement.clientHeight,
      viewport?.height ?? 0,
    );

    function lockPage() {
      if (pageLockRef.current) return;
      const body = document.body;
      const html = document.documentElement;

      pageLockRef.current = {
        body: {
          overflow: body.style.overflow,
          touchAction: body.style.touchAction,
        },
        html: {
          overflow: html.style.overflow,
          overscrollBehavior: html.style.overscrollBehavior,
        },
      };

      html.style.overflow = "hidden";
      html.style.overscrollBehavior = "none";
      body.style.overflow = "hidden";
      body.style.touchAction = "none";
      document.addEventListener("touchmove", preventRootTouchMove, { passive: false });
    }

    function unlockPage() {
      const snapshot = pageLockRef.current;
      if (!snapshot) return;
      pageLockRef.current = null;
      const body = document.body;
      const html = document.documentElement;

      body.style.overflow = snapshot.body.overflow ?? "";
      body.style.touchAction = snapshot.body.touchAction ?? "";
      html.style.overflow = snapshot.html.overflow ?? "";
      html.style.overscrollBehavior = snapshot.html.overscrollBehavior ?? "";
      document.removeEventListener("touchmove", preventRootTouchMove);
    }

    function updateInset() {
      if (!viewport) {
        setKeyboardInset(0);
        unlockPage();
        return;
      }

      const baselineHeight = Math.max(baselineHeightRef.current, document.documentElement.clientHeight);
      const rawInset = baselineHeight - viewport.height - Math.max(0, viewport.offsetTop);
      const cappedInset = Math.min(Math.max(0, rawInset), baselineHeight * 0.58);
      const nextInset = Math.round(cappedInset);
      if (nextInset > KEYBOARD_OPEN_THRESHOLD) {
        lockPage();
        window.requestAnimationFrame(() => {
          window.scrollTo(0, 0);
          document.documentElement.scrollTop = 0;
          document.body.scrollTop = 0;
        });
      } else {
        unlockPage();
        baselineHeightRef.current = Math.max(
          window.innerHeight,
          document.documentElement.clientHeight,
          viewport.height,
        );
      }
      setKeyboardInset(nextInset);
    }

    updateInset();
    viewport?.addEventListener("resize", updateInset);
    viewport?.addEventListener("scroll", updateInset);
    window.addEventListener("orientationchange", updateInset);

    return () => {
      viewport?.removeEventListener("resize", updateInset);
      viewport?.removeEventListener("scroll", updateInset);
      window.removeEventListener("orientationchange", updateInset);
      unlockPage();
    };
  }, []);

  return keyboardInset;
}
