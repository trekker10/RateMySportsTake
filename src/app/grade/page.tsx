"use client";

import { useState } from "react";
import PasswordGate from "@/app/import/PasswordGate";
import GradingDashboard from "./GradingDashboard";

export default function GradePage() {
  const [unlocked, setUnlocked] = useState(false);

  if (!unlocked) {
    return <PasswordGate onUnlock={() => setUnlocked(true)} />;
  }

  return <GradingDashboard />;
}
