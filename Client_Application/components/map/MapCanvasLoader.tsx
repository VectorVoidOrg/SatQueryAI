"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { MapSkeleton } from "@/components/dashboard/MapSkeleton";

const DynamicMapCanvas = dynamic(() => import("@/components/map/MapCanvas"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

export const MapCanvasLoader: React.FC = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <MapSkeleton />;
  }

  // Passing a stable mount key forces React to cleanly unmount/remount 
  // the map DOM container if the route shell updates
  return <DynamicMapCanvas key="satquery-active-map-canvas" />;
};

export default MapCanvasLoader;