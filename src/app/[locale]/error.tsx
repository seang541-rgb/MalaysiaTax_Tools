"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h1 className="text-6xl font-bold text-red-400 mb-4">Oops!</h1>
      <p className="text-xl text-muted-foreground mb-2">
        Something went wrong / 出错了 / Sesuatu telah berlaku
      </p>
      <p className="text-sm text-muted-foreground mb-8 max-w-md">
        {error.message || "An unexpected error occurred."}
      </p>
      <button
        onClick={reset}
        className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}
