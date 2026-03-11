"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

interface DemoStep {
  title: string;
  description: string;
  icon: string;
  duration: number;
}

const DEMO_STEPS: DemoStep[] = [
  {
    title: "System Initialization",
    description:
      "Aegis command center coming online. Establishing satellite uplink and initializing drone fleet...",
    icon: "🛰️",
    duration: 3000,
  },
  {
    title: "Fleet Deployment",
    description:
      "3 autonomous drones deployed from base station. Each drone equipped with thermal imaging and AI navigation.",
    icon: "🚁",
    duration: 4000,
  },
  {
    title: "AI Agent Activation",
    description:
      "Gemini 1.5 Pro agent analyzing disaster zone. Calculating optimal search patterns for maximum coverage.",
    icon: "🤖",
    duration: 4000,
  },
  {
    title: "Grid Scanning",
    description:
      "Drones executing coordinated sweep pattern. Thermal sensors active, scanning for heat signatures...",
    icon: "🔍",
    duration: 5000,
  },
  {
    title: "Survivor Detection",
    description:
      "Thermal signature detected! Drone-A confirming location and marking for rescue team.",
    icon: "🔥",
    duration: 4000,
  },
  {
    title: "Battery Management",
    description:
      "Drone-B battery at 25%. Agent autonomously recalling to base for recharge. Mission continuity maintained.",
    icon: "🔋",
    duration: 4000,
  },
  {
    title: "Multi-Drone Coordination",
    description:
      "Agent coordinating 3 drones simultaneously. Optimizing search paths to avoid redundant coverage.",
    icon: "🎯",
    duration: 4000,
  },
  {
    title: "Mission Complete",
    description:
      "All 3 survivors located and marked. Total mission time: 8 minutes. Fleet returning to base.",
    icon: "✅",
    duration: 4000,
  },
];

export function DemoMode({ onComplete }: { onComplete: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (currentStep >= DEMO_STEPS.length) {
      setTimeout(() => {
        setIsVisible(false);
        setTimeout(onComplete, 500);
      }, 2000);
      return;
    }

    const timer = setTimeout(() => {
      setCurrentStep((prev) => prev + 1);
    }, DEMO_STEPS[currentStep].duration);

    return () => clearTimeout(timer);
  }, [currentStep, onComplete]);

  const progress = ((currentStep + 1) / DEMO_STEPS.length) * 100;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="max-w-2xl w-full mx-4">
            {/* Demo header */}
            <motion.div
              className="text-center mb-12"
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="text-5xl font-bold text-cyan-400 mb-4">
                PROJECT AEGIS
              </h1>
              <p className="text-slate-400 text-lg">
                Autonomous Disaster Response Demonstration
              </p>
            </motion.div>

            {/* Current step */}
            <AnimatePresence mode="wait">
              {currentStep < DEMO_STEPS.length && (
                <motion.div
                  key={currentStep}
                  className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-cyan-500/30 p-8 shadow-2xl"
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                >
                  {/* Icon */}
                  <motion.div
                    className="text-6xl mb-6 text-center"
                    animate={{
                      scale: [1, 1.2, 1],
                      rotate: [0, 5, -5, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    {DEMO_STEPS[currentStep].icon}
                  </motion.div>

                  {/* Title */}
                  <h2 className="text-2xl font-bold text-cyan-400 mb-4 text-center">
                    {DEMO_STEPS[currentStep].title}
                  </h2>

                  {/* Description */}
                  <p className="text-slate-300 text-center leading-relaxed">
                    {DEMO_STEPS[currentStep].description}
                  </p>

                  {/* Step indicator */}
                  <div className="mt-8 flex items-center justify-center gap-2">
                    {DEMO_STEPS.map((_, idx) => (
                      <motion.div
                        key={idx}
                        className={`h-2 rounded-full ${
                          idx <= currentStep ? "bg-cyan-400" : "bg-slate-700"
                        }`}
                        initial={{ width: 8 }}
                        animate={{ width: idx === currentStep ? 32 : 8 }}
                        transition={{ duration: 0.3 }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Progress bar */}
            <motion.div
              className="mt-8 bg-slate-800 rounded-full h-2 overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-400 to-cyan-600"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </motion.div>

            {/* Skip button */}
            <motion.button
              className="mt-6 w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg border border-slate-700 transition-all"
              onClick={() => {
                setIsVisible(false);
                setTimeout(onComplete, 500);
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Skip Demo
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
