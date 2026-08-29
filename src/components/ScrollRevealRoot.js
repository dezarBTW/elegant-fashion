"use client";

import { useScrollReveal } from "@/hooks/useScrollReveal";

export default function ScrollRevealRoot({ children, className, as: Tag = "div", ...props }) {
  const ref = useScrollReveal();

  return (
    <Tag ref={ref} className={className} {...props}>
      {children}
    </Tag>
  );
}
