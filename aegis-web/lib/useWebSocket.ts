import { useEffect, useRef } from 'react'
import { useAegisStore } from './store'

export function useWebSocket(url: string) {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 10
  const { setConnected, setGridState, addAgentMessage, setMissionActive } = useAegisStore()

  useEffect(() => {
    let isConnecting = false

    function connect() {
      if (isConnecting || wsRef.current?.readyState === WebSocket.OPEN) {
        return
      }

      // Stop trying after max attempts
      if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
        return
      }

      isConnecting = true
      reconnectAttemptsRef.current += 1
      
      if (reconnectAttemptsRef.current === 1) {
      } else {
      }

      try {
        const ws = new WebSocket(url)
        wsRef.current = ws

        ws.onopen = () => {
          setConnected(true)
          isConnecting = false
          reconnectAttemptsRef.current = 0 // Reset on successful connection
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            
            switch (data.type) {
              case 'initial_state':
                if (data.state && data.state.drones && data.state.thermal_signatures) {
                  setGridState(data.state)
                } else {
                  console.error('❌ Invalid initial state structure')
                }
                break
                
              case 'grid_update':
                if (data.state && data.state.drones && data.state.thermal_signatures) {
                  setGridState(data.state)
                }
                break
                
              case 'agent_thought':
                addAgentMessage({
                  type: 'agent_thought',
                  content: data.content,
                  timestamp: Date.now()
                })
                break
                
              case 'agent_action':
                addAgentMessage({
                  type: 'agent_action',
                  content: `${data.action}: ${JSON.stringify(data.args)}`,
                  tool: data.tool,
                  timestamp: Date.now()
                })
                break
                
              case 'tool_result':
                addAgentMessage({
                  type: 'tool_result',
                  content: JSON.stringify(data.result, null, 2),
                  tool: data.tool,
                  timestamp: Date.now()
                })
                
                // ✅ HANDLE AID DROP
                if (data.tool === 'drop_aid_payload' && data.result?.success) {
                  const aidDropEvent = new CustomEvent('aid_drop', {
                    detail: {
                      drone_id: data.result.drone_id || 'unknown',
                      location: data.result.location || { x: 0, y: 0 },
                      survivors_found: data.result.survivors_found || 0
                    }
                  })
                  window.dispatchEvent(aidDropEvent)
                }
                
                // ✅ HANDLE THERMAL SCAN
                if (data.tool === 'thermal_scan' && data.result?.success) {
                  const thermalScanEvent = new CustomEvent('thermal_scan', {
                    detail: {
                      drone_id: data.result.drone_id || 'unknown',
                      location: data.result.location || { x: 0, y: 0 },
                      scan_radius: data.result.scan_area?.radius || 1,
                      survivors_found: data.result.signatures || []
                    }
                  })
                  window.dispatchEvent(thermalScanEvent)
                }
                break
                
              case 'thermal_scan':
                const thermalScanEvent = new CustomEvent('thermal_scan', {
                  detail: {
                    drone_id: data.drone_id,
                    location: data.location,
                    scan_radius: data.scan_radius,
                    survivors_found: data.survivors_found
                  }
                })
                window.dispatchEvent(thermalScanEvent)
                break
              
              case 'mission_complete':
                setMissionActive(false)
                addAgentMessage({
                  type: 'agent_thought',
                  content: '🎉 Mission Complete! All objectives achieved.',
                  timestamp: Date.now()
                })
                break
                
              case 'pong':
                // Heartbeat response - silent
                break
                
              default:
            }
          } catch (error) {
            console.error('❌ Error parsing message:', error)
          }
        }

        ws.onerror = () => {
          // Error is expected when backend is not running
          // We'll handle it in onclose
          isConnecting = false
        }

        ws.onclose = (event) => {
          if (event.wasClean) {
          } else {
          }
          
          setConnected(false)
          isConnecting = false
          wsRef.current = null

          // Attempt to reconnect with exponential backoff
          const delay = Math.min(1000 * Math.pow(1.5, reconnectAttemptsRef.current - 1), 10000)
          
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectTimeoutRef.current = window.setTimeout(() => {
              connect()
            }, delay)
          }
        }
      } catch (error) {
        console.error('❌ Failed to create WebSocket connection')
        isConnecting = false
        
        // Retry with backoff
        const delay = Math.min(1000 * Math.pow(1.5, reconnectAttemptsRef.current - 1), 10000)
        
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectTimeoutRef.current = window.setTimeout(() => {
            connect()
          }, delay)
        }
      }
    }

    // Initial connection
    connect()

    // Cleanup
    return () => {
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [url, setConnected, setGridState, addAgentMessage, setMissionActive])

  return wsRef.current
}
