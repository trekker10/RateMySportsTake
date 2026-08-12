"use client";

import { useState } from "react";
import { proxyImage } from "@/lib/proxy-image";

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

export default function Avatar({
  name,
  avatarUrl,
  className = "",
  textClassName = "",
}: {
  name: string;
  avatarUrl?: string | null;
  className?: string;
  textClassName?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (avatarUrl && !failed) {
    return (
      <img
        src={proxyImage(avatarUrl)}
        alt={name}
        className={className}
        onError={() => setFailed(true)}
      />
    );
  }

  return <span className={textClassName}>{initials(name)}</span>;
}
