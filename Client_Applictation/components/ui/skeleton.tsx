import * as React from "react";
import { clsx } from "clsx";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      className={clsx("animate-pulse rounded-md bg-slate-200/80", className)}
      {...props}
    />
  );
};
