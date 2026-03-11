// frontend/app/components/GridSizeControl.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useAegisStore } from "../lib/store";

export function GridSizeControl() {
  const { gridState } = useAegisStore();
  const [size, setSize] = useState(gridState?.size || 20);
  const [loading, setLoading] = useState(false);

  const handleSizeChange = async (newSize: number) => {
    setSize(newSize);
    setLoading(true);

    try {
      const response = await fetch(
        `http://localhost:8000/api/grid/resize?size=${newSize}`,
        {
          method: "POST",
        },
      );

      if (response.ok) {
      }
    } catch (error) {
      console.error("Error resizing grid:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-400 font-semibold">Grid Size:</span>
      <select
        value={size}
        onChange={(e) => handleSizeChange(Number(e.target.value))}
        disabled={loading}
        className="px-3 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white text-sm font-semibold disabled:opacity-50"
      >
        <option value={15}>15x15</option>
        <option value={20}>20x20</option>
        <option value={25}>25x25</option>
        <option value={30}>30x30</option>
      </select>
    </div>
  );
}
