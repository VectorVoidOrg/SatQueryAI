"use client";

import React from "react";

export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full w-full flex-1 flex-col">{children}</div>;
}
