import { Skeleton } from "@/components/ui/skeleton";
import React from "react";

interface AnimatedSkeletonProps {
  rows?: number;
  height?: string;
  className?: string;
}

export default function AnimatedSkeleton({ 
  rows = 3, 
  height = "h-16", 
  className = "" 
}: AnimatedSkeletonProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {[...Array(rows)].map((_, index) => (
        <div 
          key={index}
          className={`${height} loading-skeleton animate-shimmer animate-stagger`}
          style={{ 
            animationDelay: `${index * 100}ms`
          } as React.CSSProperties}
        >
          <Skeleton className="w-full h-full" />
        </div>
      ))}
    </div>
  );
}

export function TransactionSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, index) => (
        <div 
          key={index}
          className="p-4 border rounded-lg animate-fade-in animate-stagger"
          style={{ 
            animationDelay: `${index * 150}ms`
          } as React.CSSProperties}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Skeleton className="w-12 h-12 rounded-full loading-skeleton animate-shimmer" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32 loading-skeleton animate-shimmer" />
                <Skeleton className="h-3 w-48 loading-skeleton animate-shimmer" />
              </div>
            </div>
            <Skeleton className="h-6 w-20 loading-skeleton animate-shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[...Array(3)].map((_, index) => (
        <div 
          key={index}
          className="p-6 border rounded-lg card-hover animate-bounce-in animate-stagger"
          style={{ 
            '--stagger-delay': `${400 + (index * 100)}ms`,
            animationDelay: `${400 + (index * 100)}ms`
          } as React.CSSProperties}
        >
          <div className="flex items-center justify-between mb-2">
            <Skeleton className="h-4 w-24 loading-skeleton animate-shimmer" />
            <Skeleton className="h-4 w-4 rounded-full loading-skeleton animate-shimmer" />
          </div>
          <Skeleton className="h-8 w-32 loading-skeleton animate-shimmer" />
          <Skeleton className="h-3 w-16 mt-1 loading-skeleton animate-shimmer" />
        </div>
      ))}
    </div>
  );
}