'use client'

import { motion } from 'framer-motion'
import { useAegisStore } from '../lib/store'
import { useState, useRef, useEffect } from 'react'

const MAP_WIDTH = 800
const MAP_HEIGHT = 800

const gridToPixel = (gridX: number, gridY: number, gridSize: number) => {
  return {
    x: (gridX / gridSize) * MAP_WIDTH,
    y: (gridY / gridSize) * MAP_HEIGHT
  }
}

const pixelToGrid = (pixelX: number, pixelY: number, rect: DOMRect, zoom: number, gridSize: number) => {
  const relativeX = (pixelX - rect.left) / zoom
  const relativeY = (pixelY - rect.top) / zoom
  const gridX = Math.floor((relativeX / rect.width) * gridSize)
  const gridY = Math.floor((relativeY / rect.height) * gridSize)
  return { x: Math.max(0, Math.min(gridSize - 1, gridX)), y: Math.max(0, Math.min(gridSize - 1, gridY)) }
}

// Helper to get drone offset position when at base
const getDroneDisplayPosition = (drone: any, bases: any[]) => {
  const base = bases.find(b => b.id === drone.base_id)
  if (!base || drone.x !== base.x || drone.y !== base.y) {
    return { x: drone.x, y: drone.y }
  }
  return { x: drone.x + 0.3, y: drone.y }
}

// Aid drop animation type
interface AidDrop {
  id: string
  x: number
  y: number
  timestamp: number
}

// Thermal scan animation type
interface ThermalScan {
  id: string
  x: number
  y: number
  radius: number
  timestamp: number
}

export function Grid() {
  const { gridState, gridSize, isDragging, dragType, addThermalSignature, addBase, removeThermalSignature, removeBase } = useAegisStore()
  const mapRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [aidDrops, setAidDrops] = useState<AidDrop[]>([])
  const [thermalScans, setThermalScans] = useState<ThermalScan[]>([])

  // Use dynamic grid size from store
  const GRID_SIZE = gridSize || 20

  // Listen for thermal scans from WebSocket messages
  useEffect(() => {
    const handleThermalScan = (event: CustomEvent) => {
      const { drone_id, location, scan_radius } = event.detail
      if (location) {
        const newScan: ThermalScan = {
          id: `scan-${Date.now()}-${drone_id}`,
          x: location.x,
          y: location.y,
          radius: scan_radius || 1,
          timestamp: Date.now()
        }
        setThermalScans(prev => [...prev, newScan])
        
        // Remove scan animation after 2 seconds
        setTimeout(() => {
          setThermalScans(prev => prev.filter(scan => scan.id !== newScan.id))
        }, 2000)
      }
    }

    window.addEventListener('thermal_scan' as any, handleThermalScan)
    return () => window.removeEventListener('thermal_scan' as any, handleThermalScan)
  }, [])

  // Listen for aid drops from WebSocket messages
  useEffect(() => {
    const handleAidDrop = (event: CustomEvent) => {
      const { drone_id, location } = event.detail
      if (location) {
        const newAidDrop: AidDrop = {
          id: `aid-${Date.now()}-${drone_id}`,
          x: location.x,
          y: location.y,
          timestamp: Date.now()
        }
        setAidDrops(prev => [...prev, newAidDrop])
        
        // Remove aid drop after 5 seconds
        setTimeout(() => {
          setAidDrops(prev => prev.filter(drop => drop.id !== newAidDrop.id))
        }, 5000)
      }
    }

    window.addEventListener('aid_drop' as any, handleAidDrop)
    return () => window.removeEventListener('aid_drop' as any, handleAidDrop)
  }, [])

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 2))
  }

  const handleResetZoom = () => {
    setZoom(1)
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setZoom(prev => Math.max(1, Math.min(2, prev + delta)))
  }

  const handleAddDrone = async (baseId: string) => {
    try {
      const base = gridState?.bases?.find(b => b.id === baseId)
      if (!base) return

      const existingDrones = gridState?.drones || []
      const usedLetters = new Set(
        existingDrones
          .map(d => d.id.split('-')[1])
          .filter(letter => letter && letter.length === 1)
      )

      let droneId = ''
      for (let i = 0; i < 26; i++) {
        const letter = String.fromCharCode(65 + i)
        if (!usedLetters.has(letter)) {
          droneId = `Drone-${letter}`
          break
        }
      }

      if (!droneId) {
        droneId = `Drone-${Date.now()}`
      }

      const response = await fetch(
        `http://localhost:8000/api/grid/add_drone?drone_id=${encodeURIComponent(droneId)}&base_id=${encodeURIComponent(baseId)}&x=${base.x}&y=${base.y}`,
        {
          method: 'POST',
        }
      )

      if (response.ok) {
        console.log('✅ Drone added:', droneId)
      } else {
        const error = await response.json()
        console.error('❌ Failed to add drone:', error)
      }
    } catch (error) {
      console.error('Error adding drone:', error)
    }
  }

  const handleRemoveDrone = async (baseId: string) => {
    try {
      const dronesAtBase = gridState?.drones?.filter(d => d.base_id === baseId)
      if (!dronesAtBase || dronesAtBase.length === 0) return

      const droneToRemove = dronesAtBase[dronesAtBase.length - 1]

      const response = await fetch(
        `http://localhost:8000/api/grid/remove_drone?drone_id=${encodeURIComponent(droneToRemove.id)}`,
        {
          method: 'POST',
        }
      )

      if (response.ok) {
        console.log('✅ Drone removed:', droneToRemove.id)
      }
    } catch (error) {
      console.error('Error removing drone:', error)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (!mapRef.current || !dragType) return

    const rect = mapRef.current.getBoundingClientRect()
    const gridPos = pixelToGrid(e.clientX, e.clientY, rect, zoom, GRID_SIZE)

    if (dragType === 'survivor') {
      addThermalSignature(gridPos.x, gridPos.y)
    } else if (dragType === 'base') {
      const baseName = `Base-${String.fromCharCode(65 + (gridState?.bases?.length || 0))}`
      addBase(gridPos.x, gridPos.y, baseName)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setMenuPosition({ x: e.clientX, y: e.clientY })
    setShowAddMenu(true)
  }

  if (!gridState) {
    return (
      <div className="relative w-full h-full bg-slate-900/90 backdrop-blur-xl rounded-3xl border border-slate-700/50 overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-pink-500/10"></div>
        <div className="relative z-10 flex items-center justify-center h-full">
          <div className="text-center">
            <motion.div
              className="relative mx-auto mb-8 w-24 h-24"
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 opacity-30 blur-xl"></div>
              <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-cyan-400 border-r-purple-400"></div>
            </motion.div>
            <motion.p
              className="text-2xl font-light text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              Initializing Grid...
            </motion.p>
            <p className="text-slate-400 text-sm mt-3">Establishing satellite link...</p>
          </div>
        </div>
      </div>
    )
  }

  const { size, drones, thermal_signatures, bases = [] } = gridState

  const getDronesAtBase = (baseId: string) => {
    return drones.filter(drone => drone.base_id === baseId)
  }

  return (
    <>
      <div ref={mapRef} className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl" onDrop={handleDrop} onDragOver={handleDragOver} onContextMenu={handleContextMenu} onWheel={handleWheel} >
        {/* Dark Background with Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"></div>

        {/* Zoom Controls */}
        <div className="absolute top-4 right-4 z-50 flex flex-col gap-2">
          <motion.button
            onClick={handleZoomIn}
            className="w-10 h-10 bg-slate-800/90 hover:bg-slate-700/90 backdrop-blur-xl rounded-lg border border-cyan-400/30 flex items-center justify-center text-cyan-300 font-bold shadow-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            +
          </motion.button>
          <motion.button
            onClick={handleResetZoom}
            className="w-10 h-10 bg-slate-800/90 hover:bg-slate-700/90 backdrop-blur-xl rounded-lg border border-cyan-400/30 flex items-center justify-center text-cyan-300 text-xs font-bold shadow-lg"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {Math.round(zoom * 100)}%
          </motion.button>
        </div>

        {/* Zoomable Content */}
        <div 
          ref={contentRef}
          className="absolute inset-0 origin-center"
          style={{
            transform: `scale(${zoom})`,
            transition: 'transform 0.2s ease-out'
          }}
        >
          {/* Animated Grid Lines */}
          <svg className="absolute inset-0 w-full h-full opacity-20">
            <defs>
              <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
                <path 
                  d="M 40 0 L 0 0 0 40" 
                  fill="none" 
                  stroke="rgba(34, 211, 238, 0.3)" 
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-pattern)" />
          </svg>

          {/* Scanning Lines Animation */}
          <motion.div
            className="absolute left-0 right-0 pointer-events-none"
            style={{
              background: 'linear-gradient(180deg, transparent 0%, rgba(34, 211, 238, 0.1) 50%, transparent 100%)',
              height: '100px',
              top: 0
            }}
            animate={{
              top: ['-100px', 'calc(100% + 100px)']
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "linear",
              repeatType: "loop"
            }}
          />

          {/* Radar Sweep Effect */}
          <motion.div
            className="absolute top-1/2 left-1/2 pointer-events-none"
            style={{
              width: '200%',
              height: '2px',
              background: 'linear-gradient(90deg, transparent 0%, rgba(34, 211, 238, 0.5) 50%, transparent 100%)',
              transformOrigin: 'left center',
              left: '50%',
              top: '50%'
            }}
            animate={{
              rotate: [0, 360]
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "linear"
            }}
          />

          {/* Coordinate Grid Numbers */}
          <div className="absolute inset-0 pointer-events-none">
            {/* X-axis labels */}
            {Array.from({ length: GRID_SIZE + 1 }).map((_, i) => (
              <div
                key={`x-${i}`}
                className="absolute text-xs text-cyan-400/40 font-mono"
                style={{
                  left: `${(i / GRID_SIZE) * 100}%`,
                  top: '4px',
                  transform: 'translateX(-50%)'
                }}
              >
                {i}
              </div>
            ))}
            {/* Y-axis labels */}
            {Array.from({ length: GRID_SIZE + 1 }).map((_, i) => (
              <div
                key={`y-${i}`}
                className="absolute text-xs text-cyan-400/40 font-mono"
                style={{
                  top: `${(i / GRID_SIZE) * 100}%`,
                  left: '4px',
                  transform: 'translateY(-50%)'
                }}
              >
                {i}
              </div>
            ))}
          </div>

          {/* Map Content */}
          <div className="absolute inset-0 p-4">
            <div className="relative w-full h-full rounded-2xl overflow-visible">
              
              {/* Thermal Scan Animations */}
              {thermalScans.map((scan) => {
                const pos = gridToPixel(scan.x, scan.y, GRID_SIZE)
                const cellSize = MAP_WIDTH / GRID_SIZE
                const age = Date.now() - scan.timestamp
                const opacity = Math.max(0, 1 - (age / 2000))
                
                return (
                  <div
                    key={scan.id}
                    className="absolute z-15 pointer-events-none"
                    style={{
                      left: `${(pos.x / MAP_WIDTH) * 100}%`,
                      top: `${(pos.y / MAP_HEIGHT) * 100}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    {/* First thermal wave - Orange */}
                    <motion.div
                      className="absolute rounded-full border-2 border-orange-400/60 bg-orange-500/10"
                      style={{
                        width: `${(scan.radius * 2 + 1) * cellSize}px`,
                        height: `${(scan.radius * 2 + 1) * cellSize}px`,
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                      }}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ 
                        scale: [0, 1.2, 1],
                        opacity: [0, 0.8 * opacity, 0]
                      }}
                      transition={{ 
                        duration: 1.5,
                        ease: "easeOut"
                      }}
                    />

                    {/* Second thermal wave - Red */}
                    <motion.div
                      className="absolute rounded-full border-2 border-red-400/40 bg-red-500/5"
                      style={{
                        width: `${(scan.radius * 2 + 1) * cellSize}px`,
                        height: `${(scan.radius * 2 + 1) * cellSize}px`,
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                      }}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ 
                        scale: [0, 1.2, 1],
                        opacity: [0, 0.6 * opacity, 0]
                      }}
                      transition={{ 
                        duration: 1.5,
                        ease: "easeOut",
                        delay: 0.3
                      }}
                    />

                    {/* Third thermal wave - Yellow */}
                    <motion.div
                      className="absolute rounded-full border-2 border-yellow-400/30 bg-yellow-500/5"
                      style={{
                        width: `${(scan.radius * 2 + 1) * cellSize}px`,
                        height: `${(scan.radius * 2 + 1) * cellSize}px`,
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                      }}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ 
                        scale: [0, 1.2, 1],
                        opacity: [0, 0.4 * opacity, 0]
                      }}
                      transition={{ 
                        duration: 1.5,
                        ease: "easeOut",
                        delay: 0.6
                      }}
                    />
                  </div>
                )
              })}

              {/* Aid Drops - Render first (bottom layer) */}
              {aidDrops.map((drop) => {
                const pos = gridToPixel(drop.x, drop.y, GRID_SIZE)
                const age = Date.now() - drop.timestamp
                const opacity = Math.max(0, 1 - (age / 5000))
                
                return (
                  <motion.div
                    key={drop.id}
                    className="absolute z-5 pointer-events-none"
                    style={{
                      left: `${(pos.x / MAP_WIDTH) * 100}%`,
                      top: `${(pos.y / MAP_HEIGHT) * 100}%`,
                      transform: 'translate(-50%, -50%)',
                      opacity
                    }}
                    initial={{ scale: 0, y: -50, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity }}
                    exit={{ scale: 0.5, opacity: 0 }}
                  >
                    <motion.div
                      className="relative"
                      animate={{
                        rotate: [0, 5, -5, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      <div className="absolute inset-0 bg-green-400/30 blur-xl rounded-full"></div>
                      <div className="relative text-3xl drop-shadow-[0_0_12px_rgba(34,197,94,0.8)]">
                        📦
                      </div>
                    </motion.div>
                    
                    <motion.div
                      className="absolute left-1/2 whitespace-nowrap"
                      style={{ top: '35px', transform: 'translateX(-50%)' }}
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity, y: 0 }}
                    >
                      <div className="bg-green-900/95 backdrop-blur-md px-2 py-1 rounded border border-green-400/50">
                        <span className="text-xs text-green-300 font-semibold">
                          🚑 AID DEPLOYED
                        </span>
                      </div>
                    </motion.div>
                  </motion.div>
                )
              })}

              {/* Drones - Render above aid drops */}
              {drones.map((drone) => {
                const displayPos = getDroneDisplayPosition(drone, bases)
                const pos = gridToPixel(displayPos.x, displayPos.y, GRID_SIZE)
                
                return (
                  <motion.div
                    key={drone.id}
                    className="absolute z-20"
                    animate={{
                      left: `${(pos.x / MAP_WIDTH) * 100}%`,
                      top: `${(pos.y / MAP_HEIGHT) * 100}%`,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 60,
                      damping: 20,
                      mass: 0.8
                    }}
                    onMouseEnter={() => setHoveredItem(`drone-${drone.id}`)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <div className="relative" style={{ transform: 'translate(-50%, -50%)' }}>
                      {/* Status Indicator - Simple colored dot */}
                      <motion.div
                        className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-900"
                        style={{
                          backgroundColor: 
                            drone.status === 'Idle' ? '#10b981' :
                            drone.status === 'Charging' ? '#f59e0b' :
                            '#3b82f6'
                        }}
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      
                      {/* Drone Icon - Simple, no spinning */}
                      <div className="text-2xl drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]">
                        🚁
                      </div>
                      
                      {/* Drone Info Tooltip */}
                      {hoveredItem === `drone-${drone.id}` && (
                        <motion.div 
                          className="absolute left-1/2 whitespace-nowrap pointer-events-none z-50"
                          style={{ top: '40px', transform: 'translateX(-50%)' }}
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <div className="bg-slate-900/95 backdrop-blur-xl px-3 py-2 rounded-lg border border-cyan-400/30 shadow-xl">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-16 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${
                                    drone.battery > 50 ? 'bg-gradient-to-r from-green-400 to-green-500' :
                                    drone.battery > 20 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                                    'bg-gradient-to-r from-red-400 to-red-500'
                                  }`}
                                  style={{ width: `${drone.battery}%` }}
                                />
                              </div>
                              <span className={`text-xs font-mono font-bold ${
                                drone.battery > 50 ? 'text-green-300' :
                                drone.battery > 20 ? 'text-yellow-300' :
                                'text-red-300'
                              }`}>
                                {Math.round(drone.battery)}%
                              </span>
                            </div>
                            <div className="text-xs text-cyan-300 font-medium mb-1">
                              {drone.id} • {drone.status}
                            </div>
                            {drone.capabilities && (
                              <div className="text-xs text-slate-400">
                                Scan: {((drone.capabilities.scan_radius || 1) * 2 + 1)}x{((drone.capabilities.scan_radius || 1) * 2 + 1)} • 
                                Speed: {drone.capabilities.max_speed}x • 
                                Aid: {drone.capabilities.aid_remaining}/{drone.capabilities.aid_capacity}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )
              })}

              {/* Bases - Render on top */}
              {bases.map((base, idx) => {
                const pos = gridToPixel(base.x, base.y, GRID_SIZE)
                const dronesAtBase = getDronesAtBase(base.id)
                
                return (
                  <div
                    key={base.id}
                    className="absolute group z-30"
                    style={{
                      left: `${(pos.x / MAP_WIDTH) * 100}%`,
                      top: `${(pos.y / MAP_HEIGHT) * 100}%`,
                    }}
                    onMouseEnter={() => setHoveredItem(`base-${base.id}`)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <div className="relative" style={{ transform: 'translate(-50%, -50%)' }}>
                      <motion.div 
                        className="text-2xl drop-shadow-[0_0_8px_rgba(34,211,238,0.5)] cursor-pointer"
                        animate={{
                          scale: [1, 1.15, 1],
                          opacity: [1, 0.7, 1]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      >
                        🏢
                      </motion.div>
                      
                      <div className="absolute -top-2 -left-2 w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg border-2 border-slate-900 pointer-events-none">
                        {dronesAtBase.length}
                      </div>

                      {hoveredItem === `base-${base.id}` && (
                        <motion.div
                          className="absolute left-1/2 whitespace-nowrap z-50"
                          style={{ top: '35px', transform: 'translateX(-50%)' }}
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <div className="bg-slate-900/95 backdrop-blur-md rounded-lg border border-cyan-400/50 p-2 shadow-xl">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs text-cyan-300 font-semibold">{base.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <motion.button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleAddDrone(base.id)
                                }}
                                className="px-2 py-1 bg-green-500/20 hover:bg-green-500/30 border border-green-400/50 rounded text-green-300 text-xs font-bold transition-colors"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                + Drone
                              </motion.button>
                              {dronesAtBase.length > 0 && (
                                <motion.button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleRemoveDrone(base.id)
                                  }}
                                  className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 border border-red-400/50 rounded text-red-300 text-xs font-bold transition-colors"
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  - Drone
                                </motion.button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}

                      <button
                        onClick={() => removeBase(base.id)}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold shadow-lg z-10"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )
              })}
              
              {/* Thermal Signatures */}
              {thermal_signatures.map((sig, idx) => {
                const pos = gridToPixel(sig.x, sig.y, GRID_SIZE)
                return (
                  <div
                    key={sig.id || `sig-${idx}`}
                    className="absolute group z-10"
                    style={{
                      left: `${(pos.x / MAP_WIDTH) * 100}%`,
                      top: `${(pos.y / MAP_HEIGHT) * 100}%`,
                    }}
                    onMouseEnter={() => setHoveredItem(`sig-${sig.id}`)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <div className="relative" style={{ transform: 'translate(-50%, -50%)' }}>
                      <motion.div 
                        className={`text-2xl ${sig.discovered ? 'drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`}
                        animate={sig.discovered ? {
                          scale: [1, 1.1, 1]
                        } : {
                          scale: [1, 1.2, 1],
                          opacity: [1, 0.6, 1]
                        }}
                        transition={{
                          duration: sig.discovered ? 1.5 : 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      >
                        {sig.discovered ? '✅' : '🆘'}
                      </motion.div>
                      
                      {sig.id && !sig.discovered && (
                        <button
                          onClick={() => removeThermalSignature(sig.id!)}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold z-10 shadow-lg"
                        >
                          ✕
                        </button>
                      )}
                      
                      {/* Label - only show on hover */}
                      {hoveredItem === `sig-${sig.id}` && (
                        <motion.div 
                          className="absolute left-1/2 whitespace-nowrap pointer-events-none"
                          style={{ top: '30px', transform: 'translateX(-50%)' }}
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <div className={`backdrop-blur-md px-2 py-1 rounded border ${
                            sig.discovered 
                              ? 'bg-green-900/95 border-green-400/50' 
                              : 'bg-red-900/95 border-red-400/50'
                          }`}>
                            <span className={`text-xs font-semibold ${sig.discovered ? 'text-green-300' : 'text-red-300'}`}>
                              {sig.discovered ? '✓ RESCUED' : '⚠ SURVIVOR'}
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        
        {/* Corner HUD Elements */}
        <div className="absolute top-4 left-4 w-12 h-12 border-l-2 border-t-2 border-cyan-400/60 rounded-tl-lg pointer-events-none"></div>
        <div className="absolute bottom-4 left-4 w-12 h-12 border-l-2 border-b-2 border-cyan-400/60 rounded-bl-lg pointer-events-none"></div>
        <div className="absolute bottom-4 right-4 w-12 h-12 border-r-2 border-b-2 border-cyan-400/60 rounded-br-lg pointer-events-none"></div>

        {/* Drag hint */}
        {isDragging && (
          <motion.div
            className="absolute inset-0 bg-cyan-500/10 border-2 border-dashed border-cyan-400/50 rounded-3xl flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="text-center">
              <div className="text-4xl mb-2 drop-shadow-[0_0_20px_rgba(34,211,238,0.8)]">
                {dragType === 'survivor' ? '🆘' : '🏢'}
              </div>
              <motion.div 
                className="text-cyan-300 font-semibold text-lg"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                Drop to add {dragType === 'survivor' ? 'survivor' : 'base'}
              </motion.div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Context Menu */}
      {showAddMenu && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowAddMenu(false)}
          />
          <motion.div
            className="fixed z-50 bg-slate-900/95 backdrop-blur-xl rounded-xl border border-cyan-400/30 shadow-2xl overflow-hidden"
            style={{ left: menuPosition.x, top: menuPosition.y }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <button
              onClick={() => {
                setShowAddMenu(false)
              }}
              className="w-full px-6 py-3 text-left hover:bg-cyan-500/10 transition-colors flex items-center gap-3 text-white"
            >
              <span className="text-xl">🆘</span>
              <span>Add Survivor</span>
            </button>
            <button
              onClick={() => {
                setShowAddMenu(false)
              }}
              className="w-full px-6 py-3 text-left hover:bg-cyan-500/10 transition-colors flex items-center gap-3 text-white border-t border-cyan-400/20"
            >
              <span className="text-xl">🏢</span>
              <span>Add Base</span>
            </button>
          </motion.div>
        </>
      )}
    </>
  )
}
