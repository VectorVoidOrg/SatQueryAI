"use client";

import React from "react";
import dynamic from "next/dynamic";
import { MapSkeleton } from "@/components/dashboard/MapSkeleton";

const DynamicMapCanvas = dynamic(() => import("@/components/map/MapCanvas"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

export const MapCanvasLoader: React.FC = () => {
  return <DynamicMapCanvas />;
};

export default MapCanvasLoader;