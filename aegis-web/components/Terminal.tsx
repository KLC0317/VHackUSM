"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAegisStore } from "../lib/store";

export function Terminal() {
  const { agentMessages } = useAegisStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingMessage, setThinkingMessage] = useState("");

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [agentMessages]);

  // Detect AI thinking state with specific messages
  useEffect(() => {
    const lastMessage = agentMessages[agentMessages.length - 1];
    if (lastMessage?.content) {
      const content = lastMessage.content.toLowerCase();

      if (content.includes("planning") || content.includes("optimizing")) {
        setIsThinking(true);
        setThinkingMessage("Calculating optimal drone routes...");
      } else if (content.includes("initializing")) {
        setIsThinking(true);
        setThinkingMessage("Initializing mission parameters...");
      } else if (content.includes("replanning")) {
        setIsThinking(true);
        setThinkingMessage("Adapting strategy to new conditions...");
      } else if (content.includes("verification")) {
        setIsThinking(true);
        setThinkingMessage("Verifying coverage completeness...");
      } else {
        setIsThinking(false);
      }

      if (isThinking) {
        const timer = setTimeout(() => setIsThinking(false), 8000);
        return () => clearTimeout(timer);
      }
    }
  }, [agentMessages]);

  // Filter messages to show only AI actions and important events
  const filteredMessages = agentMessages.filter((msg) => {
    const content = msg.content.toLowerCase();
    
    // Show agent actions (move, scan, return, drop aid)
    if (msg.type === "agent_action") return true;
    
    // Show tool results for important actions
    if (msg.type === "tool_result" && msg.tool) {
      const importantTools = ["move_drone", "thermal_scan", "drop_aid_payload", "return_to_base"];
      return importantTools.includes(msg.tool);
    }
    
    // Show important agent thoughts (mission status, discoveries, completion)
    if (msg.type === "agent_thought") {
      return (
        content.includes("initializing") ||
        content.includes("complete") ||
        content.includes("found") ||
        content.includes("discovered") ||
        content.includes("returning") ||
        content.includes("coverage") ||
        content.includes("mission") ||
        content.includes("survivor") ||
        content.includes("aid drop")
      );
    }
    
    return false;
  });

  const getMessageIcon = (type: string, tool?: string) => {
    if (tool === "move_drone") return "🚁";
    if (tool === "thermal_scan") return "🔍";
    if (tool === "drop_aid_payload") return "📦";
    if (tool === "return_to_base") return "🏠";
    
    switch (type) {
      case "agent_thought":
        return "💭";
      case "agent_action":
        return "⚡";
      case "tool_result":
        return "✅";
      default:
        return "📡";
    }
  };

  const getMessageColor = (type: string) => {
    switch (type) {
      case "agent_thought":
        return "text-cyan-400";
      case "agent_action":
        return "text-purple-400";
      case "tool_result":
        return "text-green-400";
      default:
        return "text-slate-400";
    }
  };

  const getMessageBadge = (type: string, tool?: string) => {
    if (tool === "move_drone") return "MOVE";
    if (tool === "thermal_scan") return "SCAN";
    if (tool === "drop_aid_payload") return "AID DROP";
    if (tool === "return_to_base") return "RETURN";
    
    switch (type) {
      case "agent_thought":
        return "STATUS";
      case "agent_action":
        return "ACTION";
      case "tool_result":
        return "RESULT";
      default:
        return "SYSTEM";
    }
  };

  const getMessageBadgeColor = (type: string, tool?: string) => {
    if (tool === "move_drone") return "bg-blue-500/20 text-blue-300 border-blue-400/50";
    if (tool === "thermal_scan") return "bg-orange-500/20 text-orange-300 border-orange-400/50";
    if (tool === "drop_aid_payload") return "bg-red-500/20 text-red-300 border-red-400/50";
    if (tool === "return_to_base") return "bg-yellow-500/20 text-yellow-300 border-yellow-400/50";
    
    switch (type) {
      case "agent_thought":
        return "bg-cyan-500/20 text-cyan-300 border-cyan-400/50";
      case "agent_action":
        return "bg-purple-500/20 text-purple-300 border-purple-400/50";
      case "tool_result":
        return "bg-green-500/20 text-green-300 border-green-400/50";
      default:
        return "bg-slate-500/20 text-slate-300 border-slate-400/50";
    }
  };

  return (
    <div className="h-full rounded-2xl overflow-hidden bg-slate-900/30 backdrop-blur-xl border border-slate-700/30 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex-shrink-0 bg-gradient-to-r from-slate-950/60 via-slate-900/60 to-slate-950/60 px-4 py-3 border-b border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <motion.div
                className="w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-500/50"
                whileHover={{ scale: 1.2 }}
              />
              <motion.div
                className="w-3 h-3 rounded-full bg-yellow-500 shadow-lg shadow-yellow-500/50"
                whileHover={{ scale: 1.2 }}
              />
              <motion.div
                className="w-3 h-3 rounded-full bg-green-500 shadow-lg shadow-green-500/50"
                whileHover={{ scale: 1.2 }}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-green-400 text-sm font-mono font-bold">
                aegis@ai
              </span>
              <span className="text-slate-600">~</span>
              <span className="text-cyan-400 text-sm font-mono">
                mission-control
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <AnimatePresence>
              {isThinking && (
                <motion.div
                  className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 border border-cyan-400/30 rounded-full"
                  initial={{ opacity: 0, scale: 0.8, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: 20 }}
                >
                  <motion.div
                    className="w-2 h-2 bg-cyan-400 rounded-full"
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [1, 0.5, 1],
                    }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                  <span className="text-xs text-cyan-400 font-mono font-bold">
                    PROCESSING
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="px-2 py-1 bg-slate-800/50 rounded border border-slate-700/50">
              <span className="text-xs text-slate-400 font-mono">
                {filteredMessages.length} actions
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-sm"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(34, 197, 94, 0.3) transparent",
        }}
      >
        {filteredMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <motion.div
                animate={{
                  opacity: [0.3, 0.7, 0.3],
                  scale: [1, 1.05, 1],
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-6xl mb-4"
              >
                🤖
              </motion.div>
              <div className="text-slate-300 text-lg font-bold mb-2">
                AI Agent Standby
              </div>
              <div className="text-slate-500 text-sm">
                Waiting for mission activation...
              </div>
              <div className="mt-4 px-4 py-2 bg-slate-800/30 border border-slate-700/30 rounded-lg inline-block">
                <span className="text-xs text-slate-400 font-mono">
                  Ready to deploy autonomous operations
                </span>
              </div>
            </div>
          </div>
        ) : (
          <>
            <AnimatePresence initial={false}>
              {filteredMessages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20, y: 10 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  exit={{ opacity: 0, x: 20, y: -10 }}
                  transition={{ duration: 0.3, type: "spring", stiffness: 100 }}
                  className="group bg-slate-800/30 backdrop-blur-sm border border-slate-700/30 rounded-xl p-4 hover:bg-slate-800/40 hover:border-slate-600/50 transition-all cursor-default"
                >
                  <div className="flex items-start gap-3">
                    <motion.div
                      className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-900/50 border border-slate-700/50 flex items-center justify-center"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                    >
                      <span className="text-lg">
                        {getMessageIcon(msg.type, msg.tool)}
                      </span>
                    </motion.div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded border text-xs font-bold ${getMessageBadgeColor(msg.type, msg.tool)}`}
                          >
                            {getMessageBadge(msg.type, msg.tool)}
                          </span>
                        </div>
                        <span className="text-slate-500 text-xs font-mono">
                          {new Date(msg.timestamp).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                            hour12: false,
                          })}
                        </span>
                      </div>

                      <div
                        className={`${getMessageColor(msg.type)} leading-relaxed break-words`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* AI Thinking Animation */}
            <AnimatePresence>
              {isThinking && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  className="relative overflow-hidden bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-pink-500/10 backdrop-blur-sm border border-cyan-400/40 rounded-xl p-5 shadow-lg"
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-purple-500/5 to-pink-500/5"
                    animate={{
                      x: ["-100%", "100%"],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />

                  <div className="relative flex items-center gap-4">
                    <div className="relative flex-shrink-0">
                      <motion.div
                        className="w-12 h-12 rounded-full border-2 border-cyan-400/20"
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      />
                      <motion.div
                        className="absolute inset-0 w-12 h-12 rounded-full border-t-2 border-r-2 border-cyan-400"
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div
                          className="text-2xl"
                          animate={{
                            scale: [1, 1.2, 1],
                          }}
                          transition={{ duration: 1, repeat: Infinity }}
                        >
                          🧠
                        </motion.div>
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-cyan-300 font-bold text-base">
                          AI Processing
                        </span>
                        <div className="flex items-center gap-1">
                          {[0, 1, 2].map((i) => (
                            <motion.div
                              key={i}
                              className="w-1.5 h-1.5 bg-cyan-400 rounded-full"
                              animate={{
                                scale: [1, 1.5, 1],
                                opacity: [0.3, 1, 0.3],
                              }}
                              transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                delay: i * 0.2,
                              }}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="text-sm text-cyan-400/80 font-mono">
                        {thinkingMessage}
                      </div>

                      <div className="mt-3 h-1 bg-slate-800/50 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400"
                          animate={{
                            x: ["-100%", "100%"],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}
