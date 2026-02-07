"use client";

import { useEffect, useState } from "react";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function DashboardGreeting() {
  const [greeting, setGreeting] = useState("Welcome back");

  useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  return (
    <div className="animate-fade-slide-in">
      <h1 className="text-heading-1">{greeting}</h1>
      <p className="text-muted-foreground mt-1">
        Your AI-powered social CRM at a glance.
      </p>
    </div>
  );
}
