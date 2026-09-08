"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { MapSkeleton } from "@/components/dashboard/MapSkeleton";

const loadMapCanvas = () => import("@/components/map/MapCanvas");

const DynamicMapCanvas = dynamic(loadMapCanvas, {
  ssr: false,
  loading: () => <MapSkeleton />,
});

export const MapCanvasLoader: React.FC = () => {
  const [isClientReady, setIsClientReady] = useState(false);
  const [isModuleReady, setIsModuleReady] = useState(false);

  useEffect(() => {
    let active = true;
    const clientFrame = window.requestAnimationFrame(() => {
      if (active) setIsClientReady(true);
    });

    loadMapCanvas().then(() => {
      if (active) setIsModuleReady(true);
    });

    return () => {
      active = false;
      window.cancelAnimationFrame(clientFrame);
    };
  }, []);

  if (!isClientReady || !isModuleReady) {
    return <MapSkeleton />;
  }

  return <DynamicMapCanvas />;
};

export default MapCanvasLoader;