import { useEffect, useState } from "react";

export function useBreakpoint() {
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 0
  );

  useEffect(() => {
    let rAFId: number | null = null;
    const handleResize = () => {
      if (rAFId) {
        cancelAnimationFrame(rAFId);
      }
      rAFId = requestAnimationFrame(() => {
        setWindowWidth(window.innerWidth);
      });
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (rAFId) {
        cancelAnimationFrame(rAFId);
      }
    };
  }, []);

  const isMobile = windowWidth < 768;
  const isNarrow = windowWidth < 480;

  return { isMobile, isNarrow, windowWidth };
}
