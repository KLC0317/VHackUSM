"use client";

import { motion } from "framer-motion";
import { useAegisStore } from "../lib/store";

type View = "dashboard" | "map" | "fleet" | "terminal";

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  connected: boolean;
  onReplayDemo: () => void;
}

export function Sidebar({
  currentView,
  onViewChange,
  connected,
  onReplayDemo,
}: SidebarProps) {
  const { missionActive } = useAegisStore();

  const navItems = [
    { id: "dashboard" as View, icon: "📊", label: "Dashboard" },
    { id: "map" as View, icon: "🗺️", label: "Live Map" },
    { id: "fleet" as View, icon: "🚁", label: "Fleet Status" },
    { id: "terminal" as View, icon: "🤖", label: "AI Reasoning" },
  ];

  return (
    <motion.aside
      className="w-80 bg-slate-900/50 backdrop-blur-xl border-r border-slate-800/50 flex flex-col relative z-10"
      initial={{ x: -320 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.5, type: "spring" }}
    >
      {/* Logo */}
      <div className="p-8 border-b border-slate-800/50">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-2">
            PROJECT AEGIS
          </h1>
          <p className="text-slate-400 text-sm">Autonomous Disaster Response</p>
        </motion.div>
      </div>

      {/* Status */}
      <div className="p-6 border-b border-slate-800/50">
        <motion.div
          className={`p-4 rounded-xl backdrop-blur-xl border ${
            connected
              ? "bg-green-500/10 border-green-500/30"
              : "bg-red-500/10 border-red-500/30"
          }`}
          animate={
            connected
              ? {
                  borderColor: [
                    "rgba(34, 197, 94, 0.3)",
                    "rgba(34, 197, 94, 0.6)",
                    "rgba(34, 197, 94, 0.3)",
                  ],
                }
              : {}
          }
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="flex items-center gap-3">
            <motion.div
              className={`w-3 h-3 rounded-full ${
                connected ? "bg-green-400" : "bg-red-400"
              }`}
              animate={
                connected
                  ? {
                      boxShadow: [
                        "0 0 0 0 rgba(74, 222, 128, 0.7)",
                        "0 0 0 10px rgba(74, 222, 128, 0)",
                      ],
                    }
                  : {}
              }
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <div>
              <div className="text-sm font-semibold text-white">
                {connected ? "System Online" : "Offline"}
              </div>
              <div className="text-xs text-slate-400">
                {connected ? "All systems operational" : "Connecting..."}
              </div>
            </div>
          </div>
        </motion.div>

        {connected && (
          <motion.div
            className={`mt-4 p-4 rounded-xl backdrop-blur-xl border ${
              missionActive
                ? "bg-cyan-500/10 border-cyan-500/30"
                : "bg-slate-500/10 border-slate-500/30"
            }`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3">
              <motion.div
                className={`w-3 h-3 rounded-full ${
                  missionActive ? "bg-cyan-400" : "bg-slate-400"
                }`}
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
              <div>
                <div className="text-sm font-semibold text-white">
                  {missionActive ? "Mission Active" : "Standby"}
                </div>
                <div className="text-xs text-slate-400">
                  {missionActive ? "Drones deployed" : "Ready to deploy"}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-6">
        <div className="space-y-2">
          {navItems.map((item, idx) => (
            <motion.button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full p-4 rounded-xl text-left transition-all ${
                currentView === item.id
                  ? "bg-cyan-500/20 border border-cyan-500/50 text-cyan-300"
                  : "bg-slate-800/30 border border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-white"
              }`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * idx }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </div>
            </motion.button>
          ))}
        </div>
      </nav>

      {/* Footer Actions */}
      <div className="p-6 border-t border-slate-800/50 space-y-3">
        <motion.button
          onClick={onReplayDemo}
          className="w-full p-4 bg-slate-800/50 hover:bg-slate-800/70 text-slate-300 rounded-xl border border-slate-700/50 transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">🎬</span>
            <span className="font-medium">Replay Demo</span>
          </div>
        </motion.button>
      </div>
    </motion.aside>
  );
}
