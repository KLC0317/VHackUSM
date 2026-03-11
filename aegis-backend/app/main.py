from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from typing import Optional
from pydantic import BaseModel
import asyncio
import os
import traceback
from dotenv import load_dotenv

from app.websocket.manager import manager
from app.mcp.drone_server import get_grid_instance
from app.agent.orchestrator import initialize_orchestrator, get_orchestrator
from app.simulation.grid import BaseStation, Drone, DroneStatus, ThermalSignature
import random

load_dotenv()

class DroneCapabilitiesUpdate(BaseModel):
    """Schema for updating physical and operational drone constraints."""
    max_speed: Optional[int] = None
    scan_radius: Optional[int] = None
    battery_capacity: Optional[float] = None
    scan_cost: Optional[float] = None
    move_cost: Optional[float] = None
    aid_capacity: Optional[int] = None


async def grid_physics_loop():
    """
    Infinite loop running the grid physics engine. 
    Ticks every 1 second to update drone positions, battery, and environment state.
    """
    grid = get_grid_instance()
    while True:
        try:
            grid.tick()
            state = grid.get_state()
            # Broadcast state to all connected WebSocket clients
            await manager.send_grid_update(state)
            await asyncio.sleep(1)
        except Exception as e:
            traceback.print_exc()
            await asyncio.sleep(1)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handles application startup and shutdown events."""
    api_key = os.getenv("GOOGLE_API_KEY")
    if api_key:
        try:
            initialize_orchestrator(api_key)
        except Exception:
            traceback.print_exc()

    # Start the background physics simulation
    physics_task = asyncio.create_task(grid_physics_loop())

    yield

    # Clean up background tasks on shutdown
    physics_task.cancel()


app = FastAPI(title="Aegis Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "service": "Aegis Backend",
        "status": "operational",
        "version": "1.0.0",
        "ai_model": "Google Gemini 2.0 Flash"
    }


@app.get("/api/grid/state")
async def get_grid_state():
    """Returns the current state of all drones, survivors, and bases."""
    grid = get_grid_instance()
    return grid.get_state()


@app.post("/api/mission/start")
async def start_mission():
    """Triggers the AI Orchestrator to begin autonomous search and rescue."""
    try:
        orchestrator = get_orchestrator()
        if not orchestrator:
            raise HTTPException(
                status_code=500,
                detail="Orchestrator not initialized. Check GOOGLE_API_KEY in .env file."
            )

        if orchestrator.running:
            raise HTTPException(status_code=400, detail="Mission already running")

        # Run mission logic as a background task to avoid blocking the API
        asyncio.create_task(orchestrator.start_mission())

        return {"status": "Mission started", "message": "Agent is now autonomous"}

    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start mission: {str(e)}"
        )


@app.post("/api/mission/stop")
async def stop_mission():
    """Halts the AI Orchestrator's decision-making loop."""
    try:
        orchestrator = get_orchestrator()
        if not orchestrator:
            raise HTTPException(status_code=500, detail="Orchestrator not initialized")

        await orchestrator.stop_mission()
        return {"status": "Mission stopped"}

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to stop mission: {str(e)}"
        )


@app.post("/api/mission/reset")
async def reset_mission():
    """Resets grid elements to their starting positions and clears AI memory."""
    try:
        orchestrator = get_orchestrator()
        if orchestrator and orchestrator.running:
            await orchestrator.stop_mission()
            await asyncio.sleep(1)
        
        grid = get_grid_instance()
        
        # Snapshot current configuration to restore it after clearing
        existing_bases = {base_id: (base.x, base.y, base.name) for base_id, base in grid.bases.items()}
        existing_survivors = [(sig.id, sig.x, sig.y) for sig in grid.thermal_signatures]
        drones_per_base = {}
        for drone in grid.drones.values():
            if drone.base_id not in drones_per_base:
                drones_per_base[drone.base_id] = []
            drones_per_base[drone.base_id].append(drone.id)
        
        # Wipe current simulation state
        grid.drones.clear()
        grid.thermal_signatures.clear()
        grid.bases.clear()
        grid.tick_count = 0
        
        # Restore base stations
        for base_id, (x, y, name) in existing_bases.items():
            grid.bases[base_id] = BaseStation(id=base_id, name=name, x=x, y=y)
        
        # Re-initialize drones at their home bases with full battery/aid
        for base_id, drone_ids in drones_per_base.items():
            base = grid.bases.get(base_id)
            if not base:
                continue
            for drone_id in drone_ids:
                new_drone = Drone(
                    id=drone_id,
                    x=base.x,
                    y=base.y,
                    battery=100.0,
                    status=DroneStatus.IDLE,
                    base_id=base_id,
                    max_speed=1,
                    scan_radius=1,
                    battery_capacity=100.0,
                    scan_cost=5.0,
                    move_cost=0.5,
                    aid_capacity=3,
                    aid_remaining=3,
                )
                grid.drones[drone_id] = new_drone
        
        # Restore survivors to original locations
        for sig_id, x, y in existing_survivors:
            survivor = ThermalSignature(id=sig_id, x=x, y=y, discovered=False)
            grid.thermal_signatures.append(survivor)
        
        # Reset orchestrator internal memory and planning states
        if orchestrator:
            orchestrator.current_plan = None
            orchestrator.route_index = {}
            orchestrator.last_commanded_target = {}
            orchestrator.drone_memory = {}
            orchestrator.scanned_positions = set()
            orchestrator.required_scan_points = set()
            orchestrator.last_replan_tick = 0
            orchestrator.mission_phase = "initial_scan"
            orchestrator.all_bases = {}
            orchestrator.plan_cache = {}
            orchestrator.last_cache_time = 0
            orchestrator.running = False
        
        fresh_state = grid.get_state()
        await manager.send_grid_update(fresh_state)
        await manager.send_agent_thought("🔄 System reset complete")
        
        return {
            "status": "success",
            "message": "System reset - all positions preserved",
            "bases": len(grid.bases),
            "drones": len(grid.drones),
            "survivors": len(grid.thermal_signatures),
            "state": fresh_state
        }

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to reset system: {str(e)}"
        )

@app.post("/api/grid/resize")
async def resize_grid(size: int = Query(..., ge=15, le=30)):
    """Changes grid dimensions and redistributes all entities proportionally."""
    try:
        grid = get_grid_instance()
        
        num_drones = len(grid.drones)
        num_survivors = len(grid.thermal_signatures)
        num_bases = len(grid.bases)
        
        orchestrator = get_orchestrator()
        if orchestrator and orchestrator.running:
            await orchestrator.stop_mission()
            await asyncio.sleep(0.5)
        
        drone_info = [(drone.id, drone.base_id) for drone in grid.drones.values()]
        
        grid.drones.clear()
        grid.thermal_signatures.clear()
        grid.bases.clear()
        grid.tick_count = 0
        grid.size = size
        
        # Logical distribution of bases based on count and new grid size
        if num_bases == 1:
            base_positions = [(size // 2, size // 2)]
        elif num_bases == 2:
            base_positions = [(1, 1), (size - 2, size - 2)]
        elif num_bases == 3:
            base_positions = [(1, 1), (size - 2, 1), (size // 2, size - 2)]
        else:
            base_positions = []
            corners = [(1, 1), (size - 2, 1), (size - 2, size - 2), (1, size - 2)]
            base_positions.extend(corners[:min(4, num_bases)])
            if num_bases > 4:
                middle_positions = [(size // 2, 1), (size - 2, size // 2), (size // 2, size - 2), (1, size // 2)]
                base_positions.extend(middle_positions[:num_bases - 4])
        
        base_names = ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf", "Hotel"]
        for i in range(num_bases):
            base_id = f"base-{i}"
            x, y = base_positions[i] if i < len(base_positions) else (size // 2, size // 2)
            name = f"Base-{base_names[i]}" if i < len(base_names) else f"Base-{i}"
            grid.bases[base_id] = BaseStation(id=base_id, name=name, x=x, y=y)
        
        base_ids = list(grid.bases.keys())
        for i, (drone_id, old_base_id) in enumerate(drone_info):
            base_id = old_base_id if old_base_id in grid.bases else base_ids[i % len(base_ids)]
            base = grid.bases[base_id]
            
            new_drone = Drone(
                id=drone_id, x=base.x, y=base.y, battery=100.0,
                status=DroneStatus.IDLE, base_id=base_id, max_speed=1,
                scan_radius=1, battery_capacity=100.0, scan_cost=5.0,
                move_cost=0.5, aid_capacity=3, aid_remaining=3,
            )
            grid.drones[drone_id] = new_drone
        
        # Place survivors in valid random locations (avoiding edges and base occupied tiles)
        placed_positions = set((base.x, base.y) for base in grid.bases.values())
        survivor_count = 0
        attempts = 0
        while survivor_count < num_survivors and attempts < num_survivors * 10:
            x, y = random.randint(1, size - 2), random.randint(1, size - 2)
            if (x, y) not in placed_positions:
                grid.thermal_signatures.append(ThermalSignature(id=f"survivor-{survivor_count}", x=x, y=y, discovered=False))
                placed_positions.add((x, y))
                survivor_count += 1
            attempts += 1
        
        if orchestrator:
            orchestrator.current_plan = None
            orchestrator.route_index = {}
            orchestrator.last_commanded_target = {}
            orchestrator.drone_memory = {}
            orchestrator.scanned_positions = set()
            orchestrator.required_scan_points = set()
            orchestrator.last_replan_tick = 0
            orchestrator.mission_phase = "initial_scan"
            orchestrator.all_bases = {}
            orchestrator.plan_cache = {}
            orchestrator.last_cache_time = 0
            orchestrator.running = False
        
        fresh_state = grid.get_state()
        await manager.send_grid_update(fresh_state)
        await manager.send_agent_thought(f"🔄 Grid resized to {size}x{size}")
        
        return {
            "success": True,
            "message": f"Grid resized to {size}x{size}",
            "size": size,
            "bases": num_bases,
            "drones": num_drones,
            "survivors": survivor_count,
            "state": fresh_state
        }
        
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    

@app.post("/api/drone/{drone_id}/capabilities")
async def update_drone_capabilities(drone_id: str, capabilities: DroneCapabilitiesUpdate):
    """Dynamically adjusts drone performance parameters (speed, battery, costs)."""
    try:
        grid = get_grid_instance()
        result = grid.update_drone_capabilities(
            drone_id=drone_id,
            max_speed=capabilities.max_speed,
            scan_radius=capabilities.scan_radius,
            battery_capacity=capabilities.battery_capacity,
            scan_cost=capabilities.scan_cost,
            move_cost=capabilities.move_cost,
            aid_capacity=capabilities.aid_capacity
        )

        if result["success"]:
            await manager.send_grid_update(grid.get_state())
        
        return result
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/grid/add_survivor")
async def add_survivor(
    x: int = Query(..., description="X coordinate (0-19)"),
    y: int = Query(..., description="Y coordinate (0-19)"),
    sig_id: str = Query(..., description="Unique survivor ID")
):
    """Manually injects a thermal signature into the environment."""
    try:
        grid = get_grid_instance()
        result = grid.add_thermal_signature(x, y, sig_id)
        if result["success"]:
            await manager.send_grid_update(grid.get_state())
        return result
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/grid/remove_survivor")
async def remove_survivor(sig_id: str = Query(..., description="Survivor ID to remove")):
    """Removes a specific thermal signature from the grid."""
    try:
        grid = get_grid_instance()
        result = grid.remove_thermal_signature(sig_id)
        if result["success"]:
            await manager.send_grid_update(grid.get_state())
        return result
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/grid/add_base")
async def add_base(
    x: int = Query(..., description="X coordinate (0-19)"),
    y: int = Query(..., description="Y coordinate (0-19)"),
    base_id: str = Query(..., description="Unique base ID"),
    name: str = Query(..., description="Base name")
):
    """Registers a new Base Station for drone charging and deployment."""
    try:
        grid = get_grid_instance()
        result = grid.add_base(x, y, base_id, name)
        if result["success"]:
            await manager.send_grid_update(grid.get_state())
        return result
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/grid/remove_base")
async def remove_base(base_id: str = Query(..., description="Base ID to remove")):
    """Removes a Base Station; ensure drones are reassigned if necessary."""
    try:
        grid = get_grid_instance()
        result = grid.remove_base(base_id)
        if result["success"]:
            await manager.send_grid_update(grid.get_state())
        return result
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/grid/add_drone")
async def add_drone(
    base_id: str = Query(..., description="Base ID to assign drone to"),
    x: int = Query(..., description="Initial X coordinate"),
    y: int = Query(..., description="Initial Y coordinate"),
    drone_id: Optional[str] = Query(None, description="Optional drone ID (auto-generated if not provided)")
):
    """Instantiates a new drone unit and connects it to a base station."""
    try:
        grid = get_grid_instance()
        result = grid.add_drone(drone_id, base_id, x, y)
        if result["success"]:
            await manager.send_grid_update(grid.get_state())
        return result
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/grid/remove_drone")
async def remove_drone(drone_id: str = Query(..., description="Drone ID to remove")):
    """Decommissions a drone unit from the simulation."""
    try:
        grid = get_grid_instance()
        result = grid.remove_drone(drone_id)
        if result["success"]:
            await manager.send_grid_update(grid.get_state())
        return result
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """Primary WebSocket for real-time bidirectional communication with the frontend."""
    await manager.connect(websocket)

    try:
        # Provide immediate context to the client upon connection
        grid = get_grid_instance()
        initial_state = grid.get_state()
        await websocket.send_json({
            "type": "initial_state",
            "state": initial_state
        })
        
        while True:
            data = await websocket.receive_text()
            # Respond to client pings to ensure connection health
            await websocket.send_json({"type": "pong", "data": data})
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        traceback.print_exc()
        manager.disconnect(websocket)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
