"use client";

import React from "react";
import { motion } from "framer-motion";
import { useAegisStore } from "../lib/store";

export function DragControls() {
  const { setIsDragging } = useAegisStore();

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    type: "survivor" | "base",
  ) => {
    setIsDragging(true, type);
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("text/plain", type);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <div className="flex items-center gap-2">
      <motion.div
        draggable
        onDragStart={(e) =>
          handleDragStart(
            e as unknown as React.DragEvent<HTMLDivElement>,
            "survivor",
          )
        }
        onDragEnd={handleDragEnd}
        className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-400/20 rounded-lg px-3 py-2 cursor-move hover:from-red-500/20 hover:to-orange-500/20 transition-all"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="flex items-center gap-2">
          <motion.span
            className="text-lg"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            🆘
          </motion.span>
          <div className="text-xs text-red-300 font-semibold">Survivor</div>
        </div>
      </motion.div>

      <motion.div
        draggable
        onDragStart={(e) =>
          handleDragStart(
            e as unknown as React.DragEvent<HTMLDivElement>,
            "base",
          )
        }
        onDragEnd={handleDragEnd}
        className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-400/20 rounded-lg px-3 py-2 cursor-move hover:from-cyan-500/20 hover:to-blue-500/20 transition-all"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="flex items-center gap-2">
          <motion.span
            className="text-lg"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          >
            🏢
          </motion.span>
          <div className="text-xs text-cyan-300 font-semibold">Base</div>
        </div>
      </motion.div>
    </div>
  );
}
