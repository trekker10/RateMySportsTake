"use client";

import { useState } from "react";
import PasswordGate from "./PasswordGate";
import ImportSearch from "./ImportSearch";

export default function ImportPage() {
  const [unlocked, setUnlocked] = useState(false);

  if (!unlocked) {
    return <PasswordGate onUnlock={() => setUnlocked(true)} />;
  }

  return <ImportSearch />;
}
