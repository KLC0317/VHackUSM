"use client";

import { useState, useEffect } from "react";
import { useWebSocket } from "../lib/useWebSocket";
import { useAegisStore } from "../lib/store";
import { Grid } from "../components/Grid";
import { Terminal } from "../components/Terminal";
import { FleetStatus } from "../components/FleetStatus";
import { ControlPanel } from "../components/ControlPanel";
import { DragControls } from "../components/DragControls";
import { BaseManagement } from "../components/BaseManagement";
import { StatsModal } from "../components/StatsModal";
import { DemoMode } from "../components/DemoMode";
import { SetupGuide } from "../components/SetupGuide";
import { motion, AnimatePresence } from "framer-motion";
import { DroneSettings } from "../components/DroneSettings";
import { GridSizeControl } from "../components/GridSizeControl";

type FleetTab = "bases" | "drones";

export default function Home() {
  const [showDemo, setShowDemo] = useState(true);
  const [demoCompleted, setDemoCompleted] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showFleetPanel, setShowFleetPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<FleetTab>("bases");

  useWebSocket("ws://localhost:8000/ws");
  const { connected, gridState } = useAegisStore();

  useEffect(() => {
    const hasSeenDemo = localStorage.getItem("aegis_demo_seen");
    if (hasSeenDemo) {
      setShowDemo(false);
      setDemoCompleted(true);
    }
  }, []);

  const handleDemoComplete = () => {
    localStorage.setItem("aegis_demo_seen", "true");
    setShowDemo(false);
    setDemoCompleted(true);
  };

  const handleReplayDemo = () => {
    setShowDemo(true);
    setDemoCompleted(false);
  };

  return (
    <>
      {showDemo && !demoCompleted && (
        <DemoMode onComplete={handleDemoComplete} />
      )}

      <AnimatePresence>
        {showStats && <StatsModal onClose={() => setShowStats(false)} />}
      </AnimatePresence>

      <div className="min-h-screen w-full bg-slate-950 text-white relative overflow-hidden">
        {/* Animated background */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/10 via-slate-950 to-slate-950"></div>
          <motion.div
            className="absolute top-1/3 right-1/3 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-3xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 8, repeat: Infinity }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 h-screen flex flex-col">
          {/* Header */}
          <motion.header
            className="flex-shrink-0 px-8 py-4 border-b border-slate-800/30"
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-4 mb-1">
                  <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400">
                    PROJECT AEGIS
                  </h1>
                  <motion.div
                    className="px-3 py-1 bg-cyan-500/20 backdrop-blur-xl border border-cyan-400/50 rounded-full text-cyan-300 text-xs font-semibold"
                    animate={{
                      boxShadow: [
                        "0 0 20px rgba(34,211,238,0.3)",
                        "0 0 40px rgba(34,211,238,0.5)",
                        "0 0 20px rgba(34,211,238,0.3)",
                      ],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    ● LIVE
                  </motion.div>
                </div>
                <p className="text-slate-400 text-xs">
                  Autonomous Edge Grid Intelligence Swarm
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Grid Size Control */}
                <GridSizeControl />
                <motion.button
                  onClick={() => setShowFleetPanel(!showFleetPanel)}
                  className="px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 rounded-lg border border-slate-700/50 transition-all text-sm"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  🚁 Fleet Manager
                </motion.button>

                {connected && gridState && (
                  <motion.button
                    onClick={() => setShowStats(true)}
                    className="px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 rounded-lg border border-slate-700/50 transition-all text-sm"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    📊 Stats
                  </motion.button>
                )}

                <motion.div
                  className="bg-slate-800/50 backdrop-blur-xl px-4 py-2 rounded-lg border border-slate-700/50"
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="flex items-center gap-2">
                    <motion.div
                      className={`w-2 h-2 rounded-full ${
                        connected ? "bg-green-400" : "bg-red-400"
                      }`}
                      animate={
                        connected
                          ? {
                              boxShadow: [
                                "0 0 0 0 rgba(74, 222, 128, 0.7)",
                                "0 0 0 8px rgba(74, 222, 128, 0)",
                              ],
                            }
                          : {}
                      }
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    <span className="text-sm font-semibold text-white">
                      {connected ? "Online" : "Offline"}
                    </span>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.header>

          {!connected && (
            <div className="flex-shrink-0 px-8 pt-4">
              <SetupGuide />
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 px-8 py-4 min-h-0 overflow-hidden">
            <div className="h-full flex gap-4">
              {/* Left Side: Map + Controls - 65% */}
              <div
                className="flex flex-col min-h-0 min-w-0"
                style={{ width: "65%" }}
              >
                {/* Map Controls Bar */}
                <div className="flex-shrink-0 flex items-center justify-between mb-3">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="text-2xl">🗺️</span>
                    Live Map
                  </h2>

                  {/* Right side controls */}
                  <div className="flex items-center gap-2">
                    {/* Add Items */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800/30 rounded-lg border border-slate-700/30">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                        Add
                      </span>
                      <DragControls />
                    </div>

                    {/* Divider */}
                    <div className="w-px h-6 bg-slate-700/50" />

                    {/* Mission Controls */}
                    <ControlPanel />
                  </div>
                </div>

                {/* Map */}
                <div className="flex-1 min-h-0">
                  <Grid />
                </div>
              </div>

              {/* Right Side: AI Reasoning - 35% */}
              <div className="flex flex-col min-h-0" style={{ width: "35%" }}>
                <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <span className="text-2xl">🤖</span>
                  AI Reasoning
                </h2>
                <div className="flex-1 min-h-0">
                  <Terminal />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sliding Fleet Management Panel */}
        <AnimatePresence>
          {showFleetPanel && (
            <>
              {/* Backdrop */}
              <motion.div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowFleetPanel(false)}
              />

              {/* Sliding Panel */}
              <motion.div
                className="fixed right-0 top-0 bottom-0 w-[500px] bg-slate-900/95 backdrop-blur-xl border-l border-slate-700/50 shadow-2xl z-50 flex flex-col"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
              >
                {/* Panel Header */}
                <div className="flex-shrink-0 p-6 border-b border-slate-700/50">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                      <span className="text-3xl">🚁</span>
                      Fleet Manager
                    </h2>
                    <motion.button
                      onClick={() => setShowFleetPanel(false)}
                      className="w-10 h-10 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      ✕
                    </motion.button>
                  </div>

                  {/* Tab Headers */}
                  <div className="flex items-center gap-2">
                    <motion.button
                      onClick={() => setActiveTab("bases")}
                      className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                        activeTab === "bases"
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/50"
                          : "bg-slate-800/30 text-slate-400 border border-slate-700/30 hover:bg-slate-800/50"
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-lg">🏢</span>
                        <span>Bases</span>
                        {gridState && (
                          <span className="text-xs opacity-70">
                            ({gridState.bases?.length || 0})
                          </span>
                        )}
                      </div>
                    </motion.button>

                    <motion.button
                      onClick={() => setActiveTab("drones")}
                      className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                        activeTab === "drones"
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/50"
                          : "bg-slate-800/30 text-slate-400 border border-slate-700/30 hover:bg-slate-800/50"
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-lg">🚁</span>
                        <span>Drones</span>
                        {gridState && (
                          <span className="text-xs opacity-70">
                            ({gridState.drones?.length || 0})
                          </span>
                        )}
                      </div>
                    </motion.button>
                  </div>
                </div>

                {/* Panel Content */}
                <div className="flex-1 min-h-0 overflow-hidden p-6">
                  <AnimatePresence mode="wait">
                    {activeTab === "bases" ? (
                      <motion.div
                        key="bases"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2 }}
                        className="h-full overflow-y-auto pr-2"
                        style={{
                          scrollbarWidth: "thin",
                          scrollbarColor: "rgba(139, 92, 246, 0.3) transparent",
                        }}
                      >
                        <BaseManagement />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="drones"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="h-full overflow-y-auto pr-2"
                        style={{
                          scrollbarWidth: "thin",
                          scrollbarColor: "rgba(139, 92, 246, 0.3) transparent",
                        }}
                      >
                        <FleetStatus />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
