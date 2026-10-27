import { useEffect } from "react";

/**
 * Subtle 3D "tilt toward the pointer" for any element inside `ref` that has a
 * `data-tilt` attribute. Pure CSS variables - no library.
 *
 * - Only runs for a mouse / trackpad (hover + fine pointer), so touch screens
 *   keep normal scrolling and taps.
 * - Skipped entirely when the visitor asked for reduced motion.
 * - The CSS that consumes --fx-rx / --fx-ry lives in styles/staff-pages.css.
 */
export default function useTilt(ref, { max = 5 } = {}) {
  useEffect(() => {
    const root = ref.current;
    if (!root || typeof window === "undefined") return undefined;

    const allowed =
      window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!allowed) return undefined;

    let frame = 0;

    const reset = (el) => {
      ["--fx-rx", "--fx-ry", "--fx-mx", "--fx-my"].forEach((name) =>
        el.style.removeProperty(name)
      );
    };

    const onMove = (event) => {
      const el = event.target.closest?.("[data-tilt]");
      if (!el || !root.contains(el)) return;

      const { clientX, clientY } = event;
      cancelAnimationFrame(frame);

      frame = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        if (!rect.width || !rect.height) return;

        const px = (clientX - rect.left) / rect.width - 0.5;
        const py = (clientY - rect.top) / rect.height - 0.5;

        el.style.setProperty("--fx-ry", `${(px * max * 2).toFixed(2)}deg`);
        el.style.setProperty("--fx-rx", `${(-py * max * 2).toFixed(2)}deg`);
        el.style.setProperty("--fx-mx", `${((px + 0.5) * 100).toFixed(1)}%`);
        el.style.setProperty("--fx-my", `${((py + 0.5) * 100).toFixed(1)}%`);
      });
    };

    const onOut = (event) => {
      const el = event.target.closest?.("[data-tilt]");
      if (!el || el.contains(event.relatedTarget)) return;
      reset(el);
    };

    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerout", onOut);

    return () => {
      cancelAnimationFrame(frame);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerout", onOut);
    };
  }, [ref, max]);
}
