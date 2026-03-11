"use client";

import { motion } from "framer-motion";
import { useAegisStore } from "../lib/store";
import { useState } from "react";

export function BaseManagement() {
  const { gridState } = useAegisStore();
  const [expandedBase, setExpandedBase] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  if (!gridState) return null;

  const { bases = [], drones = [] } = gridState;

  const getDronesAtBase = (baseId: string) => {
    return drones.filter((drone) => drone.base_id === baseId);
  };

  const handleAddDrone = async (baseId: string) => {
    setLoading(`add-${baseId}`);
    try {
      const base = bases.find((b) => b.id === baseId);
      if (!base) {
        console.error("Base not found");
        setLoading(null);
        return;
      }

      const droneId = `Drone-${String.fromCharCode(65 + drones.length)}`;

      const response = await fetch(
        `http://localhost:8000/api/grid/add_drone?drone_id=${encodeURIComponent(droneId)}&base_id=${encodeURIComponent(baseId)}&x=${base.x}&y=${base.y}`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        const error = await response.json();
        console.error("Failed to add drone:", error);
      } else {
        const result = await response.json();
      }
    } catch (error) {
      console.error("Error adding drone:", error);
    } finally {
      setLoading(null);
    }
  };

  const handleRemoveDrone = async (droneId: string) => {
    setLoading(`remove-${droneId}`);
    try {
      const response = await fetch(
        `http://localhost:8000/api/grid/remove_drone?drone_id=${encodeURIComponent(droneId)}`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        const error = await response.json();
        console.error("Failed to remove drone:", error);
      } else {
        const result = await response.json();
      }
    } catch (error) {
      console.error("Error removing drone:", error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <motion.div
      className="bg-slate-800/30 backdrop-blur-xl rounded-xl border border-slate-700/30 p-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3 className="text-xs font-bold text-purple-400 mb-3 uppercase tracking-wider">
        Base Management
      </h3>

      <div className="space-y-2">
        {bases.map((base) => {
          const dronesAtBase = getDronesAtBase(base.id);
          const isExpanded = expandedBase === base.id;

          return (
            <motion.div
              key={base.id}
              className="bg-slate-900/30 rounded-lg border border-slate-700/20 overflow-hidden"
              whileHover={{ borderColor: "rgba(34, 211, 238, 0.3)" }}
            >
              <button
                onClick={() => setExpandedBase(isExpanded ? null : base.id)}
                className="w-full p-3 flex items-center justify-between hover:bg-slate-800/20 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <motion.div
                    className="text-lg"
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    🏠
                  </motion.div>
                  <div className="text-left">
                    <div className="text-white font-bold text-xs">
                      {base.name}
                    </div>
                    <div className="text-slate-400 text-xs">
                      ({base.x}, {base.y})
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="bg-cyan-500/20 px-2 py-0.5 rounded-full border border-cyan-400/30">
                    <span className="text-cyan-300 text-xs font-bold">
                      {dronesAtBase.length}
                    </span>
                  </div>
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-slate-400 text-xs"
                  >
                    ▼
                  </motion.div>
                </div>
              </button>

              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-slate-700/20"
                >
                  <div className="p-3 space-y-2">
                    {dronesAtBase.length > 0 && (
                      <div className="space-y-1.5">
                        {dronesAtBase.map((drone) => (
                          <div
                            key={drone.id}
                            className="flex items-center justify-between bg-slate-800/30 rounded-lg p-2"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
                                style={{
                                  background:
                                    drone.battery > 50
                                      ? "linear-gradient(to bottom right, rgba(34, 211, 238, 0.8), rgba(8, 145, 178, 0.8))"
                                      : drone.battery > 20
                                        ? "linear-gradient(to bottom right, rgba(251, 191, 36, 0.8), rgba(217, 119, 6, 0.8))"
                                        : "linear-gradient(to bottom right, rgba(248, 113, 113, 0.8), rgba(220, 38, 38, 0.8))",
                                }}
                              >
                                {drone.id.split("-")[1]}
                              </div>
                              <div>
                                <div className="text-white text-xs font-medium">
                                  {drone.id}
                                </div>
                                <div className="text-slate-400 text-xs">
                                  {Math.round(drone.battery)}% • {drone.status}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveDrone(drone.id)}
                              disabled={loading === `remove-${drone.id}`}
                              className="w-6 h-6 rounded flex items-center justify-center text-red-400 transition-colors disabled:opacity-50 text-xs"
                              style={{
                                backgroundColor: "rgba(239, 68, 68, 0.2)",
                              }}
                              onMouseEnter={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  "rgba(239, 68, 68, 0.3)")
                              }
                              onMouseLeave={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                  "rgba(239, 68, 68, 0.2)")
                              }
                            >
                              {loading === `remove-${drone.id}` ? (
                                <motion.div
                                  className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full"
                                  animate={{ rotate: 360 }}
                                  transition={{
                                    duration: 1,
                                    repeat: Infinity,
                                    ease: "linear",
                                  }}
                                />
                              ) : (
                                "✕"
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <motion.button
                      onClick={() => handleAddDrone(base.id)}
                      disabled={loading === `add-${base.id}`}
                      className="w-full py-2 rounded-lg text-cyan-300 font-semibold text-xs transition-all disabled:opacity-50 border border-cyan-400/30"
                      style={{
                        background:
                          "linear-gradient(to right, rgba(6, 182, 212, 0.2), rgba(8, 145, 178, 0.2))",
                      }}
                      whileHover={{
                        scale: 1.02,
                        background:
                          "linear-gradient(to right, rgba(6, 182, 212, 0.3), rgba(8, 145, 178, 0.3))",
                      }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {loading === `add-${base.id}` ? (
                        <div className="flex items-center justify-center gap-2">
                          <motion.div
                            className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                          />
                          Adding...
                        </div>
                      ) : (
                        `+ Add to ${base.name}`
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}

        {bases.length === 0 && (
          <div className="text-center py-4 text-slate-400">
            <motion.div
              className="text-2xl mb-1"
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              🏠
            </motion.div>
            <div className="text-xs">No bases available</div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
