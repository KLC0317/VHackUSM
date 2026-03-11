"use client";

import { motion } from "framer-motion";
import { use, useState } from "react";

export function SetupGuide() {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <motion.div
      className="mb-6 bg-gradient-to-r from-blue-900/30 to-cyan-900/30 border border-cyan-500/50 rounded-xl overflow-hidden backdrop-blur-sm relative z-10"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-cyan-500/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <motion.div className="text-2xl">🛠️</motion.div>
          <div className="text-left">
            <h3 className="text-cyan-400 font-semibold text-lg">
              Backend Setup Required
            </h3>
            <p className="text-cyan-300/70 text-sm">
              Click to view setup instructions
            </p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className="text-cyan-400 text-2xl"
        >
          ▼
        </motion.div>
      </button>

      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="px-6 pb-6"
        >
          <div className="bg-slate-900/50 rounded-lg p-4 space-y-4">
            <div>
              <h4 className="text-cyan-400 font-semibold mb-2 flex items-center gap-2">
                <span>1️⃣</span> Navigate to Backend Directory
              </h4>
              <div className="bg-slate-950 rounded p-3 font-mono text-sm text-green-400">
                cd aegis-backend
              </div>
            </div>

            <div>
              <h4 className="text-cyan-400 font-semibold mb-2 flex items-center gap-2">
                <span>2️⃣</span> Activate Virtual Environment
              </h4>
              <div className="bg-slate-950 rounded p-3 font-mono text-sm text-green-400">
                <div>source venv/bin/activate</div>
                <div className="text-slate-500 text-xs mt-1">
                  # Windows: venv\Scripts\activate
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-cyan-400 font-semibold mb-2 flex items-center gap-2">
                <span>3️⃣</span> Set Google API Key
              </h4>
              <div className="bg-slate-950 rounded p-3 font-mono text-sm text-green-400">
                <div>cp .env.example .env</div>
                <div className="text-slate-500 text-xs mt-1">
                  # Then edit .env and add your GOOGLE_API_KEY
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-cyan-400 font-semibold mb-2 flex items-center gap-2">
                <span>4️⃣</span> Start Backend Server
              </h4>
              <div className="bg-slate-950 rounded p-3 font-mono text-sm text-green-400">
                python -m app.main
              </div>
            </div>

            <div className="pt-4 border-t border-cyan-500/30">
              <p className="text-cyan-300/80 text-sm">
                💡 The backend should start on{" "}
                <span className="text-cyan-400 font-mono">
                  http://localhost:8000
                </span>
              </p>
              <p className="text-cyan-300/80 text-sm mt-2">
                🔑 Get your Google API key from:{" "}
                <a
                  href="https://makersuite.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 underline"
                >
                  Google AI Studio
                </a>
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
