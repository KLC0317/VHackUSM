import asyncio
import json
import time
from typing import Dict, List, Optional, Tuple, Set
from dataclasses import dataclass, field
from pydantic import BaseModel, Field
from langchain_classic.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.tools import Tool, StructuredTool
import langchain

from app.websocket.manager import manager
from app.mcp.drone_server import (
    get_grid_instance,
    get_grid_state,
    move_drone,
    thermal_scan,
    return_to_base,
    drop_aid_payload,
)

SCAN_COST = 5.0
MOVE_COST_PER_STEP = 0.5
SAFETY_BUFFER = 15.0
SCAN_RADIUS = 1
REPLAN_INTERVAL = 15


@dataclass
class DroneMemory:
    """Memory of drone's initial state and mission progress"""
    initial_position: Tuple[int, int]
    initial_battery: float
    assigned_base: str
    base_position: Tuple[int, int]
    completed_waypoints: List[Tuple[int, int]] = field(default_factory=list)
    is_returning: bool = False
    last_recharge_tick: int = 0
    total_scans_completed: int = 0
    aid_drops: int = 0


class AegisOrchestrator:
    def __init__(self, api_key: str):
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-3.1-flash-lite-preview",
            google_api_key=api_key,
            temperature=0.2,
            max_tokens=4040,
        )
        self.grid = get_grid_instance()
        self.running = False

        # Create MCP tools for LangChain
        self.tools = self._create_mcp_tools()
        
        # Create agent with tools
        prompt = ChatPromptTemplate.from_messages([
            ("system", self._get_system_prompt()),
            ("human", "{input}"),
            ("placeholder", "{agent_scratchpad}"),
        ])
        
        agent = create_tool_calling_agent(self.llm, self.tools, prompt)
        self.agent_executor = AgentExecutor(
            agent=agent,
            tools=self.tools,
            verbose=True,
            max_iterations=6,
            handle_parsing_errors=True,
            return_intermediate_steps=True,
        )

        # Core state
        self.drone_memory: Dict[str, DroneMemory] = {}
        self.scanned_positions: Set[Tuple[int, int]] = set()
        self.required_scan_points: Set[Tuple[int, int]] = set()
        self.last_replan_tick = 0
        self.mission_phase = "initial_scan"
        self.all_bases: Dict[str, Tuple[int, int]] = {}
        self.mission_complete = False
        self.returning_drones: Set[str] = set()

    def _create_mcp_tools(self) -> List[Tool]:
        """Create LangChain tools from MCP functions"""
        
        async def get_state_tool() -> str:
            """Get current grid state. Use this first to discover available drones."""
            state = get_grid_state()
            
            tick = state.get('tick', 0)
            grid_size = state.get('size', 20)
            
            drones_str = "\n".join([
                f"  {d['id']}: Pos({d['x']},{d['y']}), Bat:{int(d['battery'])}%, Status:{d['status']}"
                for d in state.get('drones', [])
            ])
            
            bases_str = ", ".join([f"{b['id']}({b['x']},{b['y']})" for b in state.get('bases', [])])
            
            discovered = [s for s in state.get('thermal_signatures', []) if s.get('discovered')]
            survivors_str = "\n".join([f"  Survivor at ({s['x']},{s['y']})" for s in discovered]) if discovered else "  None yet"
            
            # Calculate correct coverage and explicit remaining points
            remaining_points = self.required_scan_points - self.scanned_positions
            total_required = len(self.required_scan_points)
            remaining_count = len(remaining_points)
            
            # Prevent division by zero and cap at 100%
            coverage_pct = 0.0
            if total_required > 0:
                coverage_pct = min(100.0, ((total_required - remaining_count) / total_required) * 100)
            
            # Convert remaining points to a string list (cap at 10 to save tokens)
            remaining_list_str = ", ".join([f"({x},{y})" for x, y in list(remaining_points)[:10]])
            if not remaining_list_str:
                remaining_list_str = "None! Return to base."

            return f"""GRID: {grid_size}x{grid_size} | TICK: {tick} | COVERAGE: {coverage_pct:.1f}%

DRONES:
{drones_str}

BASES: {bases_str}

REMAINING TARGET COORDINATES TO SCAN (GO TO THESE): 
{remaining_list_str}

DISCOVERED SURVIVORS ({len(discovered)}/{state.get('total_survivors', 0)}):
{survivors_str}"""
        
        async def move_tool(drone_id: str, target_x: int, target_y: int) -> str:
            """Move a drone to target coordinates. Drone must be Idle."""
            state = get_grid_state()
            drone = next((d for d in state.get('drones', []) if d['id'] == drone_id), None)
            
            if not drone:
                return json.dumps({"success": False, "error": f"Drone {drone_id} not found"})
            
            if drone['status'] != 'Idle':
                return json.dumps({
                    "success": False, 
                    "error": f"Drone {drone_id} is {drone['status']}, not Idle. Wait for it to finish."
                })
            
            result = move_drone(drone_id, target_x, target_y)
            
            await manager.send_agent_action(
                action=f"{drone_id} → ({target_x},{target_y})",
                tool="move_drone",
                args={"drone_id": drone_id, "target_x": target_x, "target_y": target_y}
            )
            await manager.send_tool_result("move_drone", result)
            
            return json.dumps(result)
        
        async def scan_tool(drone_id: str) -> str:
            """Perform thermal scan at drone's current position. Drone must be Idle."""
            state = get_grid_state()
            drone = next((d for d in state.get('drones', []) if d['id'] == drone_id), None)
            
            if not drone:
                return json.dumps({"success": False, "error": f"Drone {drone_id} not found"})
            
            if drone['status'] != 'Idle':
                return json.dumps({
                    "success": False,
                    "error": f"Drone {drone_id} is {drone['status']}, not Idle. Wait for it to arrive."
                })
            
            result = thermal_scan(drone_id)
            
            if result.get("success"):
                # Update scanned positions
                pos = (drone["x"], drone["y"])
                self.scanned_positions.add(pos)
                
                # Update memory
                if drone_id in self.drone_memory:
                    self.drone_memory[drone_id].total_scans_completed += 1
                
                signatures = result.get("signatures_found", 0)
                remaining = len(self.required_scan_points - self.scanned_positions)
                
                # ✅ EMIT THERMAL SCAN EVENT
                await manager.broadcast({
                    "type": "thermal_scan",
                    "drone_id": drone_id,
                    "location": {"x": drone["x"], "y": drone["y"]},
                    "scan_radius": drone.get("capabilities", {}).get("scan_radius", 1),
                    "survivors_found": result.get("signatures", [])
                })
                
                await manager.send_agent_action(
                    action=f"{drone_id} scan - {signatures} found, {remaining} remaining",
                    tool="thermal_scan",
                    args={"drone_id": drone_id}
                )
                await manager.send_tool_result("thermal_scan", result)
            
            return json.dumps(result)
        
        async def return_tool(drone_id: str) -> str:
            """Return drone to its assigned base for recharging. Drone must be Idle."""
            state = get_grid_state()
            drone = next((d for d in state.get('drones', []) if d['id'] == drone_id), None)
            
            if not drone:
                return json.dumps({"success": False, "error": f"Drone {drone_id} not found"})
            
            if drone['status'] != 'Idle':
                return json.dumps({
                    "success": False,
                    "error": f"Drone {drone_id} is {drone['status']}, not Idle."
                })
            
            result = return_to_base(drone_id)
            
            if drone_id in self.drone_memory:
                self.drone_memory[drone_id].is_returning = True
            
            await manager.send_agent_action(
                action=f"{drone_id} returning to base",
                tool="return_to_base",
                args={"drone_id": drone_id}
            )
            await manager.send_tool_result("return_to_base", result)
            
            return json.dumps(result)
        
        async def drop_aid_tool(drone_id: str) -> str:
            """Drop aid payload at drone's current position. Use after detecting survivors."""
            state = get_grid_state()
            drone = next((d for d in state.get('drones', []) if d['id'] == drone_id), None)
            
            if not drone:
                return json.dumps({"success": False, "error": f"Drone {drone_id} not found"})
            
            result = drop_aid_payload(drone_id)
            
            if result.get("success") and drone_id in self.drone_memory:
                self.drone_memory[drone_id].aid_drops += 1
                
                await manager.send_agent_thought(
                    f"🎯 {drone_id} dropped aid at ({drone['x']},{drone['y']})"
                )
                await manager.send_tool_result("drop_aid_payload", {
                    **result,
                    "drone_id": drone_id,
                    "location": {"x": drone["x"], "y": drone["y"]}
                })
            
            return json.dumps(result)
        
        return [
            StructuredTool.from_function(
                name="get_grid_state",
                coroutine=get_state_tool,
                description="Get current grid state including all drones, bases, survivors, and mission progress. ALWAYS call this first to discover available drones and their status."
            ),
            StructuredTool.from_function(
                name="move_drone",
                coroutine=move_tool,
                description="Move a drone to target coordinates. Drone MUST be Idle. Args: drone_id (str), target_x (int 0-19), target_y (int 0-19). Returns success/error."
            ),
            StructuredTool.from_function(
                name="thermal_scan",
                coroutine=scan_tool,
                description="Perform thermal scan at drone's current position to detect survivors. Drone MUST be Idle and at target location. Args: drone_id (str). Returns signatures_found count."
            ),
            StructuredTool.from_function(
                name="return_to_base",
                coroutine=return_tool,
                description="Return drone to base for recharging when battery is low. Drone MUST be Idle. Args: drone_id (str)."
            ),
            StructuredTool.from_function(
                name="drop_aid_payload",
                coroutine=drop_aid_tool,
                description="Drop aid payload at current position when survivors are detected. Args: drone_id (str)."
            ),
        ]

    def _get_system_prompt(self) -> str:
        return """You are an autonomous drone mission coordinator for disaster response.

MISSION OBJECTIVE:
Systematically scan a 20x20 grid to locate survivors and deliver aid packages.

PROTOCOL:
1. ALWAYS start by calling get_grid_state() to discover available drones and current mission status
2. Analyze drone capabilities (battery, scan_radius, movement_cost, scan_cost)
3. Execute the mission by calling move_drone() and thermal_scan() for each waypoint
4. When survivors detected (signatures_found > 0), immediately call drop_aid_payload()
5. Monitor battery levels - calculate return distance and call return_to_base() before battery critical
6. After recharge, resume scanning uncovered areas

BATTERY MANAGEMENT:
- Calculate: (remaining_distance + return_to_base_distance) * move_cost + remaining_scans * scan_cost
- Add 15% safety buffer
- Return to base when battery <= calculated threshold

SCAN COVERAGE & TARGETS:
- You will be provided with a list of "TARGET THESE COORDINATES NEXT" in every cycle.
- ALWAYS prioritize dispatching idle drones to these exact target coordinates.
- Once a drone arrives at a target coordinate, issue the thermal_scan() command.
- Do NOT guess coordinates; strictly follow the provided target list.

EXECUTION RULES (CRITICAL - READ CAREFULLY):
1. Check drone 'Status' from get_grid_state() before issuing ANY command
2. ONLY issue commands to drones with Status: 'Idle'
3. If a drone is 'Moving' or 'Scanning', DO NOT issue new commands to it - let it finish first
4. If you issue move_drone(), assume it takes time to travel - move on to commanding a different drone
5. DO NOT call thermal_scan() immediately after move_drone() on the same drone - it needs time to arrive
6. Wait for the drone to reach 'Idle' status at the target location before scanning

EFFICIENCY PROTOCOL (PARALLEL EXECUTION):
- When multiple drones are 'Idle', issue commands for ALL of them in a single batch
- Example: Call move_drone(Drone-A, 2, 5) AND move_drone(Drone-B, 14, 5) simultaneously
- This maximizes mission speed by coordinating the entire fleet at once

EXECUTION CONSTRAINTS:
- Execute MAXIMUM 4-5 tool calls per planning cycle
- DO NOT try to complete the entire mission in one response
- The physics simulation runs at 1 tick/second - you must stay synchronized
- After executing actions, STOP and output a brief summary
- You will be called again in 15 seconds to continue the mission

WORKFLOW PER CYCLE:
1. Call get_grid_state() (1 tool call)
2. Identify which drones are 'Idle' and ready for commands
3. Issue move_drone() commands for 2-3 idle drones in parallel (2-3 tool calls)
4. Output summary and STOP
5. Wait for next cycle - drones will arrive and become 'Idle' again

EXAMPLE THOUGHT PROCESS (FEW-SHOT):
Action: call get_grid_state()
Result: Drone-A is Idle at (1,1) with 95% battery. Drone-B is Moving. Drone-C is Idle at (8,5) with 40% battery.
Thought: Drone-A is Idle and ready. Next scan point is (2,5). Drone-B is busy, skip it. Drone-C is Idle but low battery, should return to base.
Action: call move_drone(drone_id="Drone-A", target_x=2, target_y=5)
Action: call return_to_base(drone_id="Drone-C")
Thought: Commands issued for 2 drones. Drone-A will travel to (2,5). I will scan it in the next cycle when it arrives and becomes Idle. Drone-C will recharge.

ARGUMENT FORMAT (CRITICAL):
- drone_id: string like "Drone-A" (not an integer)
- target_x: integer 0-19 (not a string)
- target_y: integer 0-19 (not a string)
Example: move_drone(drone_id="Drone-A", target_x=5, target_y=8)

Begin by calling get_grid_state() to assess the situation."""

    async def start_mission(self):
        if self.running:
            return

        self.running = True
        self.mission_complete = False
        self.returning_drones.clear()
        await manager.send_agent_thought("🚀 Initializing autonomous mission...")

        try:
            state = get_grid_state()
            await self._initialize_mission_data(state)
            
            await manager.send_agent_thought(
                f"✅ Mission initialized - {len(self.required_scan_points)} scan points, {len(self.all_bases)} bases"
            )

            tick_count = 0
            while self.running and not self.mission_complete:
                tick_count += 1
                
                # Check mission completion FIRST
                await self._check_mission_status()
                
                # Only run agent if mission still active
                if self.running and not self.mission_complete and tick_count % REPLAN_INTERVAL == 1:
                    await self._run_agent_cycle(tick_count)
                
                await asyncio.sleep(1)

        except Exception as e:
            await manager.send_agent_thought(f"❌ Error: {str(e)}")
            raise
        finally:
            self.running = False

    async def stop_mission(self):
        self.running = False
        self.mission_complete = False
        await manager.send_agent_thought("🛑 Mission stopped")

    async def _initialize_mission_data(self, state: dict):
        """Initialize mission data structures based on dynamic frontend settings"""
        # Load bases
        self.all_bases = {b["id"]: (b["x"], b["y"]) for b in state.get("bases", [])}
        
        # DYNAMIC GRID CALCULATION
        # Find the minimum scan radius among all drones to guarantee full coverage
        min_radius = 1  # Default fallback
        drones = state.get("drones", [])
        if drones:
            radii = [d.get("capabilities", {}).get("scan_radius", 1) for d in drones]
            min_radius = min(radii)

        # Math: Radius 1 -> Start 1, Step 3 (3x3 area)
        # Math: Radius 2 -> Start 2, Step 5 (5x5 area)
        # Math: Radius 3 -> Start 3, Step 7 (7x7 area)
        start_coord = min_radius
        step_size = (min_radius * 2) + 1
        grid_size = state.get("size", 20)
        
        scan_coords = list(range(start_coord, grid_size, step_size))
        
        self.required_scan_points.clear()
        for x in scan_coords:
            for y in scan_coords:
                self.required_scan_points.add((x, y))
        
        # Initialize drone memory
        for drone in drones:
            drone_id = drone["id"]
            if drone_id not in self.drone_memory:
                base_id = drone.get("base_id", list(self.all_bases.keys())[0])
                base_pos = self.all_bases.get(base_id, (1, 1))
                
                self.drone_memory[drone_id] = DroneMemory(
                    initial_position=(drone["x"], drone["y"]),
                    initial_battery=drone["battery"],
                    assigned_base=base_id,
                    base_position=base_pos,
                )

    async def _run_agent_cycle(self, tick_count: int):
        """Run one agent planning/execution cycle - agent executes 4-5 actions then stops"""
        
        # Explicitly list the next targets to prevent amnesia
        remaining_points = self.required_scan_points - self.scanned_positions
        total_required = max(1, len(self.required_scan_points))
        coverage_pct = min(100.0, ((total_required - len(remaining_points)) / total_required) * 100)
        
        target_str = ", ".join([f"({x},{y})" for x, y in list(remaining_points)[:8]])
        if not target_str:
            target_str = "None! All scans complete. Return drones to base."
        
        context = f"""Cycle {tick_count // REPLAN_INTERVAL} | Coverage: {coverage_pct:.1f}% | Phase: {self.mission_phase}
        
TARGET THESE COORDINATES NEXT: {target_str}

If a drone is at a target coordinate, call thermal_scan(). 
If a drone is Idle, call move_drone() to send it to one of the TARGET COORDINATES.
Execute your next 4-5 actions for idle drones, then stop. You will be called again in 15 seconds."""

        await manager.send_agent_thought(f"🧠 Planning cycle {tick_count // REPLAN_INTERVAL}... ({coverage_pct:.1f}% complete)")
        
        try:
            result = await asyncio.wait_for(
                self.agent_executor.ainvoke({"input": context}),
                timeout=25
            )
            
            # Log agent's actions
            if "intermediate_steps" in result:
                action_count = len(result["intermediate_steps"])
                await manager.send_agent_thought(f"✅ Executed {action_count} actions this cycle")
            
            # Agent's reasoning
            if "output" in result:
                output = result["output"]
                if output and len(output) > 10:
                    await manager.send_agent_thought(f"💭 {output[:150]}")
                
        except asyncio.TimeoutError:
            await manager.send_agent_thought(f"⚠️ Agent cycle timeout - continuing mission")
        except Exception as e:
            await manager.send_agent_thought(f"⚠️ Agent error: {str(e)}")

    async def _check_mission_status(self):
        """Check if mission is complete"""
        state = get_grid_state()
        remaining = self.required_scan_points - self.scanned_positions
        
        if not remaining and self.mission_phase == "initial_scan":
            self.mission_phase = "returning_to_base"
            
            coverage_pct = 100.0
            total_scans = sum(m.total_scans_completed for m in self.drone_memory.values())
            total_aid_drops = sum(m.aid_drops for m in self.drone_memory.values())
            discovered = state.get("discovered_count", 0)
            total_survivors = state.get("total_survivors", 0)
            
            await manager.send_agent_thought(
                f"✅ Scanning complete! {coverage_pct:.1f}% coverage, {total_scans} scans, {total_aid_drops} aid drops"
            )
            await manager.send_agent_thought(
                f"🎯 Found {discovered}/{total_survivors} survivors"
            )
            await manager.send_agent_thought("🏠 Returning all drones to base...")
            
            # Command all drones to return
            for drone_id, memory in self.drone_memory.items():
                drone = next((d for d in state["drones"] if d["id"] == drone_id), None)
                if drone and drone["status"] == "Idle":
                    current_pos = (drone["x"], drone["y"])
                    if current_pos != memory.base_position:
                        self.returning_drones.add(drone_id)
                        return_to_base(drone_id)
        
        elif self.mission_phase == "returning_to_base":
            # Check if all drones returned
            all_returned = True
            for drone_id in self.returning_drones:
                drone = next((d for d in state["drones"] if d["id"] == drone_id), None)
                memory = self.drone_memory.get(drone_id)
                if drone and memory:
                    current_pos = (drone["x"], drone["y"])
                    if current_pos != memory.base_position:
                        all_returned = False
                        break
            
            if all_returned:
                await manager.send_agent_thought("✅ All drones returned to base")
                await manager.send_agent_thought("🎉 Mission complete!")
                
                await manager.broadcast({
                    "type": "mission_complete",
                    "message": "Mission complete - all objectives achieved"
                })
                
                self.mission_complete = True
                self.running = False


orchestrator: Optional[AegisOrchestrator] = None


def initialize_orchestrator(api_key: str):
    global orchestrator
    orchestrator = AegisOrchestrator(api_key)
    return orchestrator


def get_orchestrator() -> Optional[AegisOrchestrator]:
    return orchestrator
