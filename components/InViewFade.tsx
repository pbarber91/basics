// components/InViewFade.tsx
"use client";

import * as React from "react";

export function InViewFade({
  children,
  index = 0,
  once = true,
  threshold = 0.12,
  offsetY = 8, // px translate-y
}: {
  children: React.ReactNode;
  index?: number;
  once?: boolean;
  threshold?: number;
  offsetY?: number;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            if (once) io.disconnect();
          } else if (!once) {
            setVisible(false);
          }
        });
      },
      { threshold }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [once, threshold]);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${index * 60}ms` }}
      className={[
        "transform-gpu transition duration-700",
        visible ? "opacity-100 translate-y-0" : `opacity-0 translate-y-[${offsetY}px]`,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
