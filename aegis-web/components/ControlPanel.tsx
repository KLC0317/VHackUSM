"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAegisStore } from "../lib/store";
import { DroneSettings } from "./DroneSettings";

export function ControlPanel() {
  const { missionActive, setMissionActive, resetSystem } = useAegisStore();
  const [loading, setLoading] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleStartMission = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8000/api/mission/start", {
        method: "POST",
      });
      if (response.ok) {
        setMissionActive(true);
      }
    } catch (error) {
      console.error("Failed to start mission:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStopMission = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8000/api/mission/stop", {
        method: "POST",
      });
      if (response.ok) {
        setMissionActive(false);
      }
    } catch (error) {
      console.error("Failed to stop mission:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      await resetSystem();
      setShowResetConfirm(false);
    } catch (error) {
      console.error("Failed to reset system:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1.5">
        {/* Drone Settings */}
        <DroneSettings />

        {/* Start/Stop Button */}
        {!missionActive ? (
          <motion.button
            onClick={handleStartMission}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg font-bold text-white text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            style={{
              background:
                "linear-gradient(to right, rgba(34, 197, 94, 0.6), rgba(22, 163, 74, 0.6))",
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {loading ? (
              <>
                <motion.div
                  className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <span>Starting...</span>
              </>
            ) : (
              <>
                <span className="text-sm">🚀</span>
                <span>START</span>
              </>
            )}
          </motion.button>
        ) : (
          <motion.button
            onClick={handleStopMission}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg font-bold text-white text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            style={{
              background:
                "linear-gradient(to right, rgba(239, 68, 68, 0.6), rgba(220, 38, 38, 0.6))",
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {loading ? (
              <>
                <motion.div
                  className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <span>Stopping...</span>
              </>
            ) : (
              <>
                <span className="text-sm">⏹️</span>
                <span>STOP</span>
              </>
            )}
          </motion.button>
        )}

        {/* Reset Button */}
        <motion.button
          onClick={() => setShowResetConfirm(true)}
          disabled={loading || missionActive}
          className="px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-400/50 rounded-lg text-orange-300 text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          whileHover={{ scale: missionActive ? 1 : 1.05 }}
          whileTap={{ scale: missionActive ? 1 : 0.95 }}
        >
          <span className="text-sm">🔄</span>
          <span>RESET</span>
        </motion.button>

        {/* Status Indicator - Compact */}
        <div
          className="px-2.5 py-1.5 rounded-lg backdrop-blur-xl border"
          style={{
            backgroundColor: missionActive
              ? "rgba(34, 197, 94, 0.1)"
              : "rgba(100, 116, 139, 0.1)",
            borderColor: missionActive
              ? "rgba(34, 197, 94, 0.3)"
              : "rgba(100, 116, 139, 0.2)",
          }}
        >
          <div className="flex items-center gap-1.5">
            <motion.div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: missionActive
                  ? "rgb(74, 222, 128)"
                  : "rgb(148, 163, 184)",
              }}
              animate={
                missionActive
                  ? {
                      scale: [1, 1.3, 1],
                      opacity: [1, 0.6, 1],
                    }
                  : {}
              }
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-[10px] font-bold text-white uppercase tracking-wider">
              {missionActive ? "Active" : "Standby"}
            </span>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal - unchanged */}
      <AnimatePresence>
        {showResetConfirm && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowResetConfirm(false)}
            />

            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-orange-400/30 shadow-2xl max-w-md w-full p-6">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-orange-500/20 border-2 border-orange-400/50 flex items-center justify-center">
                    <span className="text-4xl">⚠️</span>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-white text-center mb-2">
                  Reset System?
                </h3>

                <p className="text-slate-400 text-center text-sm mb-6">
                  This will reset all drones, survivors, and mission progress to
                  the initial state. This action cannot be undone.
                </p>

                <div className="bg-orange-500/10 border border-orange-400/30 rounded-lg p-3 mb-6">
                  <div className="text-xs text-orange-300 space-y-1">
                    <div className="flex items-center gap-2">
                      <span>•</span>
                      <span>All drones will return to base</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>•</span>
                      <span>Survivors will be randomly repositioned</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>•</span>
                      <span>Mission progress will be cleared</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>•</span>
                      <span>AI reasoning logs will be reset</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <motion.button
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-slate-300 font-bold transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    onClick={handleReset}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-400/50 rounded-lg text-orange-300 font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {loading ? (
                      <>
                        <motion.div
                          className="w-4 h-4 border-2 border-orange-300 border-t-transparent rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                        />
                        <span>Resetting...</span>
                      </>
                    ) : (
                      <>
                        <span>🔄</span>
                        <span>Reset</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
