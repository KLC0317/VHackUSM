// frontend/app/lib/store.ts
import { create } from "zustand";

interface DroneCapabilities {
  max_speed: number;
  scan_radius: number;
  battery_capacity: number;
  scan_cost: number;
  move_cost: number;
  aid_capacity: number;
  aid_remaining: number;
}

interface Drone {
  id: string;
  x: number;
  y: number;
  battery: number;
  status: string;
  base_id: string;
  target_x?: number | null;
  target_y?: number | null;
  capabilities?: DroneCapabilities;
}

export interface ThermalSignature {
  x: number;
  y: number;
  discovered: boolean;
  id?: string;
}

export interface Base {
  id: string;
  x: number;
  y: number;
  name: string;
}

export interface GridState {
  size: number;
  tick: number;
  drones: Drone[];
  thermal_signatures: ThermalSignature[];
  bases: Base[];
  discovered_count: number;
  total_survivors: number;
}

export interface AgentMessage {
  type: "agent_thought" | "agent_action" | "tool_result";
  content: string;
  tool?: string;
  timestamp: number;
}

interface AegisStore {
  connected: boolean;
  gridState: GridState | null;
  agentMessages: AgentMessage[];
  missionActive: boolean;
  isDragging: boolean;
  dragType: "survivor" | "base" | null;
  gridSize: number;

  setConnected: (connected: boolean) => void;
  setGridState: (state: GridState) => void;
  addAgentMessage: (message: AgentMessage) => void;
  setMissionActive: (active: boolean) => void;
  clearMessages: () => void;
  setIsDragging: (dragging: boolean, type?: "survivor" | "base") => void;
  addThermalSignature: (x: number, y: number) => Promise<void>;
  addBase: (x: number, y: number, name: string) => Promise<void>;
  removeThermalSignature: (id: string) => Promise<void>;
  removeBase: (id: string) => Promise<void>;
  resetSystem: () => Promise<void>;
  setGridSize: (size: number) => void;
}

export const useAegisStore = create<AegisStore>((set, get) => ({
  connected: false,
  gridState: null,
  agentMessages: [],
  missionActive: false,
  isDragging: false,
  dragType: null,
  gridSize: 20,

  setConnected: (connected) => set({ connected }),

  setGridState: (state) =>
    set({
      gridState: state,
      gridSize: state.size,
    }),

  addAgentMessage: (message) =>
    set((state) => ({
      agentMessages: [...state.agentMessages, message].slice(-100),
    })),

  setMissionActive: (active) => set({ missionActive: active }),

  clearMessages: () => set({ agentMessages: [] }),

  setIsDragging: (dragging, type) =>
    set({ isDragging: dragging, dragType: dragging ? type || null : null }),

  addThermalSignature: async (x, y) => {
    const sig_id = `sig-${Date.now()}-${Math.random()}`;
    try {
      const response = await fetch(
        `http://localhost:8000/api/grid/add_survivor?x=${x}&y=${y}&sig_id=${encodeURIComponent(sig_id)}`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        const error = await response.json();
        console.error("Failed to add survivor:", error);
      }
    } catch (error) {
      console.error("Error adding survivor:", error);
    }
  },

  addBase: async (x, y, name) => {
    const base_id = `base-${Date.now()}`;
    try {
      const response = await fetch(
        `http://localhost:8000/api/grid/add_base?x=${x}&y=${y}&base_id=${encodeURIComponent(base_id)}&name=${encodeURIComponent(name)}`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        const error = await response.json();
        console.error("Failed to add base:", error);
      }
    } catch (error) {
      console.error("Error adding base:", error);
    }
  },

  removeThermalSignature: async (id) => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/grid/remove_survivor?sig_id=${encodeURIComponent(id)}`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        const error = await response.json();
        console.error("Failed to remove survivor:", error);
      }
    } catch (error) {
      console.error("Error removing survivor:", error);
    }
  },

  removeBase: async (id) => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/grid/remove_base?base_id=${encodeURIComponent(id)}`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        const error = await response.json();
        console.error("Failed to remove base:", error);
      }
    } catch (error) {
      console.error("Error removing base:", error);
    }
  },

  resetSystem: async () => {
    try {
      const response = await fetch("http://localhost:8000/api/mission/reset", {
        method: "POST",
      });

      if (response.ok) {
        const result = await response.json();

        set({
          missionActive: false,
          agentMessages: [],
        });
      } else {
        const error = await response.json();
        console.error("Failed to reset system:", error);
      }
    } catch (error) {
      console.error("Error resetting system:", error);
    }
  },

  setGridSize: (size) => set({ gridSize: size }),
}));
