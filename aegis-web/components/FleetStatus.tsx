'use client'

import { motion } from 'framer-motion'
import { useAegisStore } from '../lib/store'

export function FleetStatus() {
  const { gridState } = useAegisStore()

  if (!gridState) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-slate-800/20 backdrop-blur-xl rounded-2xl border border-slate-700/30 p-6 animate-pulse"
          >
            <div className="h-4 bg-slate-700/30 rounded w-1/2 mb-3"></div>
            <div className="h-3 bg-slate-700/30 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    )
  }

  const { drones } = gridState

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Moving':
        return { bg: 'from-blue-500/10 to-cyan-500/10', text: 'text-blue-400', border: 'border-blue-400/20' }
      case 'Scanning':
        return { bg: 'from-cyan-500/10 to-teal-500/10', text: 'text-cyan-400', border: 'border-cyan-400/20' }
      case 'Charging':
        return { bg: 'from-yellow-500/10 to-orange-500/10', text: 'text-yellow-400', border: 'border-yellow-400/20' }
      case 'Idle':
        return { bg: 'from-green-500/10 to-emerald-500/10', text: 'text-green-400', border: 'border-green-400/20' }
      default:
        return { bg: 'from-slate-500/10 to-slate-600/10', text: 'text-slate-400', border: 'border-slate-400/20' }
    }
  }

  return (
    <div className="space-y-4">
      {drones.map((drone, idx) => {
        const statusStyle = getStatusColor(drone.status)
        return (
          <motion.div
            key={drone.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`bg-slate-800/20 backdrop-blur-xl rounded-2xl border p-6 ${statusStyle.border}`}
            whileHover={{ scale: 1.02, borderColor: 'rgba(255,255,255,0.1)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold backdrop-blur-xl border border-white/10 ${
                  drone.battery > 50 ? 'bg-gradient-to-br from-cyan-400/80 to-cyan-600/80' :
                  drone.battery > 20 ? 'bg-gradient-to-br from-yellow-400/80 to-yellow-600/80' :
                  'bg-gradient-to-br from-red-400/80 to-red-600/80'
                }`}>
                  {drone.id.split('-')[1]}
                </div>
                <div>
                  <div className="text-white font-bold">{drone.id}</div>
                  <div className="text-xs text-slate-400">({drone.x}, {drone.y})</div>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-lg text-xs font-bold border backdrop-blur-xl ${statusStyle.border} ${statusStyle.text}`}>
                {drone.status}
              </div>
            </div>

            {/* Battery */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">Battery</span>
                <span className={`text-sm font-bold ${
                  drone.battery > 50 ? 'text-green-400' :
                  drone.battery > 20 ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {Math.round(drone.battery)}%
                </span>
              </div>
              <div className="h-2 bg-slate-900/50 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full ${
                    drone.battery > 50 ? 'bg-gradient-to-r from-green-400 to-green-500' :
                    drone.battery > 20 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                    'bg-gradient-to-r from-red-400 to-red-500'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${drone.battery}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            {/* Capabilities */}
            {drone.capabilities && (
              <div className="mb-3 bg-slate-900/30 rounded-lg p-2 border border-purple-400/10">
                <div className="text-xs text-slate-400 mb-1">Capabilities</div>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div className="text-slate-400">
                    Speed: <span className="text-cyan-400">{drone.capabilities.max_speed}x</span>
                  </div>
                  <div className="text-slate-400">
                    Scan: <span className="text-cyan-400">
                      {drone.capabilities.scan_radius * 2 + 1}x{drone.capabilities.scan_radius * 2 + 1}
                    </span>
                  </div>
                  <div className="text-slate-400">
                    Battery: <span className="text-cyan-400">{drone.capabilities.battery_capacity}%</span>
                  </div>
                  <div className="text-slate-400">
                    Aid: <span className="text-cyan-400">
                      {drone.capabilities.aid_remaining}/{drone.capabilities.aid_capacity}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Target */}
            {drone.target_x !== null && drone.target_y !== null && (
              <div className="bg-slate-900/30 rounded-lg p-2 border border-cyan-400/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Target</span>
                  <div className="text-sm text-cyan-400 font-mono">
                    → ({drone.target_x}, {drone.target_y})
                  </div>
                </div>
              </div>
            )}

            {/* Low Battery Warning */}
            {drone.battery < 20 && drone.battery > 0 && (
              <motion.div
                className="mt-3 bg-red-500/10 border border-red-400/20 rounded-lg p-2 flex items-center gap-2"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <span className="text-lg">⚠️</span>
                <div className="text-xs text-red-400 font-bold">Low Battery</div>
              </motion.div>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}

