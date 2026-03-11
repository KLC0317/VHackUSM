"use client";

import { motion } from "framer-motion";
import { useAegisStore } from "../lib/store";

interface StatsModalProps {
  onClose: () => void;
}

export function StatsModal({ onClose }: StatsModalProps) {
  const { gridState } = useAegisStore();

  if (!gridState) return null;

  const stats = [
    {
      label: "Active Drones",
      value: gridState.drones.filter((d) => d.battery > 0).length,
      icon: "🚁",
      gradient: "from-cyan-400 to-cyan-600",
    },
    {
      label: "Survivors Found",
      value: `${gridState.discovered_count}/${gridState.thermal_signatures.length}`,
      icon: "✓",
      gradient: "from-green-400 to-green-600",
    },
    {
      label: "Mission Time",
      value: `${Math.floor(gridState.tick / 60)}:${String(gridState.tick % 60).padStart(2, "0")}`,
      icon: "⏱️",
      gradient: "from-purple-400 to-purple-600",
    },
    {
      label: "Coverage",
      value: `${Math.round((gridState.discovered_count / gridState.thermal_signatures.length) * 100)}%`,
      icon: "📊",
      gradient: "from-pink-400 to-pink-600",
    },
  ];

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-slate-900/90 backdrop-blur-xl rounded-3xl border border-slate-700/50 p-8 max-w-2xl w-full mx-4 shadow-2xl"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-3xl font-bold text-white">Mission Statistics</h3>
          <motion.button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-800/50 hover:bg-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            ✕
          </motion.button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat, idx) => (
            <motion.div
              key={stat.label}
              className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/30 p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="text-slate-400 text-sm font-medium">
                  {stat.label}
                </div>
                <div className="text-4xl">{stat.icon}</div>
              </div>
              <div
                className={`text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${stat.gradient}`}
              >
                {stat.value}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="mt-6 bg-slate-800/30 rounded-xl p-4 border border-slate-700/20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-slate-400 text-xs mb-1">Total Drones</div>
              <div className="text-2xl font-bold text-white">
                {gridState.drones.length}
              </div>
            </div>
            <div>
              <div className="text-slate-400 text-xs mb-1">Grid Size</div>
              <div className="text-2xl font-bold text-white">
                {gridState.size}x{gridState.size}
              </div>
            </div>
            <div>
              <div className="text-slate-400 text-xs mb-1">Tick Rate</div>
              <div className="text-2xl font-bold text-white">
                {gridState.tick}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
