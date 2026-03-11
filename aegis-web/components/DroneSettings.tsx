'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAegisStore } from '../lib/store'

interface DroneCapabilities {
  maxSpeed: number
  scanRadius: number
  batteryCapacity: number
  scanCost: number
  moveCost: number
  aidCapacity: number
}

const DEFAULT_CAPABILITIES: DroneCapabilities = {
  maxSpeed: 1,
  scanRadius: 1,
  batteryCapacity: 100,
  scanCost: 5,
  moveCost: 0.5,
  aidCapacity: 3,
}

export function DroneSettings() {
  const { gridState } = useAegisStore()
  const [selectedDrone, setSelectedDrone] = useState<string | null>(null)
  const [capabilities, setCapabilities] = useState<Record<string, DroneCapabilities>>({})
  const [showSettings, setShowSettings] = useState(false)

  if (!gridState) return null

  const { drones } = gridState

  const getDroneCapabilities = (droneId: string): DroneCapabilities => {
    const drone = drones.find(d => d.id === droneId)
    if (drone?.capabilities) {
      return {
        maxSpeed: drone.capabilities.max_speed,
        scanRadius: drone.capabilities.scan_radius,
        batteryCapacity: drone.capabilities.battery_capacity,
        scanCost: drone.capabilities.scan_cost,
        moveCost: drone.capabilities.move_cost,
        aidCapacity: drone.capabilities.aid_capacity,
      }
    }
    return capabilities[droneId] || DEFAULT_CAPABILITIES
  }

  const updateCapability = async (droneId: string, key: keyof DroneCapabilities, value: number) => {
    // Update local state
    const newCaps = {
      ...getDroneCapabilities(droneId),
      [key]: value
    }
    
    setCapabilities(prev => ({
      ...prev,
      [droneId]: newCaps
    }))

    // Send to backend
    try {
      const response = await fetch(`http://localhost:8000/api/drone/${droneId}/capabilities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          max_speed: key === 'maxSpeed' ? value : newCaps.maxSpeed,
          scan_radius: key === 'scanRadius' ? value : newCaps.scanRadius,
          battery_capacity: key === 'batteryCapacity' ? value : newCaps.batteryCapacity,
          scan_cost: key === 'scanCost' ? value : newCaps.scanCost,
          move_cost: key === 'moveCost' ? value : newCaps.moveCost,
          aid_capacity: key === 'aidCapacity' ? value : newCaps.aidCapacity,
        })
      })

      if (!response.ok) {
        console.error('Failed to update drone capabilities')
      } else {
      }
    } catch (error) {
      console.error('Error updating capabilities:', error)
    }
  }

  const resetDrone = async (droneId: string) => {
    setCapabilities(prev => {
      const newCaps = { ...prev }
      delete newCaps[droneId]
      return newCaps
    })

    // Reset to defaults on backend
    try {
      await fetch(`http://localhost:8000/api/drone/${droneId}/capabilities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(DEFAULT_CAPABILITIES)
      })
    } catch (error) {
      console.error('Error resetting drone:', error)
    }
  }

  const applyToAll = async (droneId: string) => {
    const caps = getDroneCapabilities(droneId)
    
    // Update all drones
    for (const drone of drones) {
      try {
        const response = await fetch(`http://localhost:8000/api/drone/${drone.id}/capabilities`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            max_speed: caps.maxSpeed,
            scan_radius: caps.scanRadius,
            battery_capacity: caps.batteryCapacity,
            scan_cost: caps.scanCost,
            move_cost: caps.moveCost,
            aid_capacity: caps.aidCapacity,
          })
        })

        if (response.ok) {
        }
      } catch (error) {
        console.error(`Error updating ${drone.id}:`, error)
      }
    }

    // Update local state
    const newCaps: Record<string, DroneCapabilities> = {}
    drones.forEach(d => {
      newCaps[d.id] = { ...caps }
    })
    setCapabilities(newCaps)
  }

  const selectedDroneData = drones.find(d => d.id === selectedDrone)
  const selectedCaps = selectedDrone ? getDroneCapabilities(selectedDrone) : null

  return (
    <>
      {/* Settings Button */}
      <motion.button
        onClick={() => setShowSettings(true)}
        className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/50 rounded-lg text-purple-300 text-sm font-bold transition-colors flex items-center gap-2"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <span>⚙️</span>
        <span>Drone Settings</span>
      </motion.button>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-100"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
            />

            {/* Modal */}
            <motion.div
              className="fixed inset-0 z-101 flex items-center justify-center p-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-purple-400/30 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-700/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <span className="text-3xl">⚙️</span>
                        Drone Capabilities
                      </h2>
                      <p className="text-slate-400 text-sm mt-1">
                        Customize individual drone performance parameters
                      </p>
                    </div>
                    <motion.button
                      onClick={() => setShowSettings(false)}
                      className="w-10 h-10 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      ✕
                    </motion.button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="grid grid-cols-3 gap-6">
                    {/* Drone List */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-bold text-slate-400 mb-3">SELECT DRONE</h3>
                      {drones.map((drone) => {
                        const caps = getDroneCapabilities(drone.id)
                        const isCustomized = capabilities[drone.id] !== undefined
                        
                        return (
                          <motion.button
                            key={drone.id}
                            onClick={() => setSelectedDrone(drone.id)}
                            className={`w-full p-3 rounded-lg border transition-all text-left ${
                              selectedDrone === drone.id
                                ? 'bg-purple-500/20 border-purple-400/50'
                                : 'bg-slate-800/30 border-slate-700/30 hover:bg-slate-800/50'
                            }`}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-white font-bold">{drone.id}</span>
                              {isCustomized && (
                                <span className="text-xs text-purple-400">●</span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400">
                              Battery: {Math.round(drone.battery)}% • {drone.status}
                            </div>
                          </motion.button>
                        )
                      })}
                    </div>

                    {/* Settings Panel */}
                    <div className="col-span-2">
                      {selectedDrone && selectedCaps && selectedDroneData ? (
                        <div className="space-y-6">
                          {/* Drone Info */}
                          <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/30">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="text-xl font-bold text-white">{selectedDrone}</h3>
                                <p className="text-sm text-slate-400">
                                  Position: ({selectedDroneData.x}, {selectedDroneData.y}) • {selectedDroneData.status}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <motion.button
                                  onClick={() => resetDrone(selectedDrone)}
                                  className="px-3 py-1 bg-slate-700/50 hover:bg-slate-700 rounded text-xs text-slate-300 font-bold"
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  Reset
                                </motion.button>
                                <motion.button
                                  onClick={() => applyToAll(selectedDrone)}
                                  className="px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/50 rounded text-xs text-purple-300 font-bold"
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  Apply to All
                                </motion.button>
                              </div>
                            </div>
                          </div>

                          {/* Capability Sliders */}
                          <div className="space-y-4">
                            {/* Max Speed */}
                            <CapabilitySlider
                              label="Max Speed"
                              icon="⚡"
                              value={selectedCaps.maxSpeed}
                              min={1}
                              max={3}
                              step={1}
                              unit="cells/tick"
                              description="Movement speed across the grid"
                              onChange={(v) => updateCapability(selectedDrone, 'maxSpeed', v)}
                            />

                            {/* Scan Radius */}
                            <CapabilitySlider
                              label="Scan Radius"
                              icon="📡"
                              value={selectedCaps.scanRadius}
                              min={1}
                              max={3}
                              step={1}
                              unit="cells"
                              description="Area coverage per scan (1=3x3, 2=5x5, 3=7x7)"
                              onChange={(v) => updateCapability(selectedDrone, 'scanRadius', v)}
                            />

                            {/* Battery Capacity */}
                            <CapabilitySlider
                              label="Battery Capacity"
                              icon="🔋"
                              value={selectedCaps.batteryCapacity}
                              min={100}
                              max={200}
                              step={10}
                              unit="%"
                              description="Maximum battery charge"
                              onChange={(v) => updateCapability(selectedDrone, 'batteryCapacity', v)}
                            />

                            {/* Scan Cost */}
                            <CapabilitySlider
                              label="Scan Cost"
                              icon="🔍"
                              value={selectedCaps.scanCost}
                              min={3}
                              max={10}
                              step={0.5}
                              unit="% per scan"
                              description="Battery consumed per thermal scan"
                              onChange={(v) => updateCapability(selectedDrone, 'scanCost', v)}
                              inverse
                            />

                            {/* Move Cost */}
                            <CapabilitySlider
                              label="Move Cost"
                              icon="🚁"
                              value={selectedCaps.moveCost}
                              min={0.3}
                              max={1.0}
                              step={0.1}
                              unit="% per cell"
                              description="Battery consumed per cell moved"
                              onChange={(v) => updateCapability(selectedDrone, 'moveCost', v)}
                              inverse
                            />

                            {/* Aid Capacity */}
                            <CapabilitySlider
                              label="Aid Capacity"
                              icon="📦"
                              value={selectedCaps.aidCapacity}
                              min={1}
                              max={5}
                              step={1}
                              unit="drops"
                              description="Number of aid packages carried"
                              onChange={(v) => updateCapability(selectedDrone, 'aidCapacity', v)}
                            />
                          </div>

                          {/* Performance Summary */}
                          <div className="bg-cyan-500/10 border border-cyan-400/30 rounded-lg p-4">
                            <h4 className="text-sm font-bold text-cyan-300 mb-3">Performance Summary</h4>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="text-slate-400">Max Range:</span>
                                <span className="text-white font-bold ml-2">
                                  {Math.floor(selectedCaps.batteryCapacity / selectedCaps.moveCost)} cells
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400">Max Scans:</span>
                                <span className="text-white font-bold ml-2">
                                  {Math.floor(selectedCaps.batteryCapacity / selectedCaps.scanCost)} scans
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400">Scan Coverage:</span>
                                <span className="text-white font-bold ml-2">
                                  {(selectedCaps.scanRadius * 2 + 1)}x{(selectedCaps.scanRadius * 2 + 1)} area
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400">Efficiency:</span>
                                <span className="text-white font-bold ml-2">
                                  {((selectedCaps.batteryCapacity / (selectedCaps.scanCost + selectedCaps.moveCost * 5)) * 100 / 100).toFixed(1)}x
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center text-slate-400">
                          <div className="text-center">
                            <div className="text-6xl mb-4">🚁</div>
                            <p>Select a drone to customize</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

interface CapabilitySliderProps {
  label: string
  icon: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  description: string
  onChange: (value: number) => void
  inverse?: boolean
}

function CapabilitySlider({
  label,
  icon,
  value,
  min,
  max,
  step,
  unit,
  description,
  onChange,
  inverse = false
}: CapabilitySliderProps) {
  const percentage = ((value - min) / (max - min)) * 100
  const displayPercentage = inverse ? 100 - percentage : percentage

  return (
    <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/30">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className="text-white font-bold">{label}</span>
        </div>
        <span className="text-cyan-400 font-mono font-bold">
          {value.toFixed(step < 1 ? 1 : 0)} {unit}
        </span>
      </div>
      
      <p className="text-xs text-slate-400 mb-3">{description}</p>
      
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-slate-700/50 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, 
              ${inverse ? 'rgb(239, 68, 68)' : 'rgb(34, 197, 94)'} 0%, 
              ${inverse ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'} 100%)`
          }}
        />
        <div 
          className="absolute top-0 left-0 h-2 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-lg pointer-events-none"
          style={{ width: `${displayPercentage}%` }}
        />
      </div>
      
      <div className="flex justify-between text-xs text-slate-500 mt-1">
        <span>{min} {unit}</span>
        <span>{max} {unit}</span>
      </div>
    </div>
  )
}
