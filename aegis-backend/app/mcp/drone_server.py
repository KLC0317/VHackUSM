from fastmcp import FastMCP
from typing import Optional
from app.simulation.grid import DisasterGrid

# Global grid instance
grid = DisasterGrid()

# Create MCP server
mcp = FastMCP("Aegis Drone Fleet")


@mcp.tool()
def get_active_fleet() -> dict:
    """
    Returns a list of all active drones with their current status.
    Use this to discover available drones before commanding them.

    Returns:
        List of drone objects with id, position, battery, status, and assigned base
    """
    fleet = grid.get_active_fleet()
    return {
        "active_drones": fleet,
        "count": len(fleet),
        "message": f"Found {len(fleet)} active drones in the fleet",
    }


@mcp.tool()
def move_drone(drone_id: str, target_x: int, target_y: int) -> dict:
    """
    Command a specific drone to move to target coordinates.

    Args:
        drone_id: The ID of the drone (e.g., 'Drone-A')
        target_x: Target X coordinate (0-19)
        target_y: Target Y coordinate (0-19)

    Returns:
        Success status and drone state
    """
    result = grid.move_drone(drone_id, target_x, target_y)
    return result


@mcp.tool()
def thermal_scan(drone_id: str) -> dict:
    """
    Perform a thermal scan in a radius around the drone.
    This will detect any survivors in the area.
    Costs battery per scan (based on drone capabilities).

    Args:
        drone_id: The ID of the drone to perform the scan

    Returns:
        Scan results including any thermal signatures found
    """
    result = grid.thermal_scan(drone_id)
    return result


@mcp.tool()
def drop_aid_payload(drone_id: str) -> dict:
    """
    Drop emergency medical aid at drone's current location.
    Use immediately after discovering survivors.
    Costs 10% battery for mechanical release.

    Args:
        drone_id: The ID of the drone dropping aid

    Returns:
        Success status and remaining battery
    """
    result = grid.drop_aid(drone_id)
    return result


@mcp.tool()
def return_to_base(drone_id: str) -> dict:
    """
    Command a drone to return to its assigned base station for recharging.
    Use this when battery is low (below 20%).

    Args:
        drone_id: The ID of the drone to recall

    Returns:
        Success status and drone state
    """
    result = grid.return_to_base(drone_id)
    return result


@mcp.tool()
def get_grid_state() -> dict:
    """
    Get the complete state of the disaster zone grid.
    Shows all drones, discovered survivors, bases, and grid size.

    Returns:
        Complete grid state including bases
    """
    state = grid.get_state()
    # CRITICAL FIX: Only show discovered survivors to prevent cheating
    state["thermal_signatures"] = [
        s for s in state.get("thermal_signatures", []) if s.get("discovered", False)
    ]
    return state


@mcp.tool()
def get_other_drone_info(drone_id: str) -> dict:
    """
    Get positions and targets of other drones to coordinate and avoid redundant coverage.
    Use this before assigning tasks to ensure efficient fleet coordination.

    Args:
        drone_id: The ID of the drone to exclude from results

    Returns:
        Positions and targets of all other drones
    """
    result = grid.get_other_drone_info(drone_id)
    return result


@mcp.tool()
def update_drone_capabilities(
    drone_id: str,
    max_speed: Optional[int] = None,
    scan_radius: Optional[int] = None,
    battery_capacity: Optional[float] = None,
    scan_cost: Optional[float] = None,
    move_cost: Optional[float] = None,
    aid_capacity: Optional[int] = None
) -> dict:
    """
    Update a drone's capabilities and performance parameters.
    
    Args:
        drone_id: The ID of the drone to update
        max_speed: Movement speed (1-3 cells per tick)
        scan_radius: Scan area radius (1-3 cells)
        battery_capacity: Maximum battery (100-200%)
        scan_cost: Battery cost per scan (3-10%)
        move_cost: Battery cost per cell moved (0.3-1.0%)
        aid_capacity: Number of aid packages (1-5)
    
    Returns:
        Success status and updated capabilities
    """
    result = grid.update_drone_capabilities(
        drone_id=drone_id,
        max_speed=max_speed,
        scan_radius=scan_radius,
        battery_capacity=battery_capacity,
        scan_cost=scan_cost,
        move_cost=move_cost,
        aid_capacity=aid_capacity
    )
    return result


# REMOVED @mcp.tool() - Internal function only
def add_survivor(x: int, y: int, sig_id: str) -> dict:
    """
    Add a new survivor (thermal signature) to the grid.
    Used when operators manually place survivors on the map.
    NOT EXPOSED TO AI.
    """
    result = grid.add_thermal_signature(x, y, sig_id)
    return result


# REMOVED @mcp.tool() - Internal function only
def remove_survivor(sig_id: str) -> dict:
    """
    Remove a survivor from the grid.
    NOT EXPOSED TO AI.
    """
    result = grid.remove_thermal_signature(sig_id)
    return result


# REMOVED @mcp.tool() - Internal function only
def add_base_station(x: int, y: int, base_id: str, name: str) -> dict:
    """
    Add a new base station to the grid.
    NOT EXPOSED TO AI.
    """
    result = grid.add_base(x, y, base_id, name)
    return result


# REMOVED @mcp.tool() - Internal function only
def remove_base_station(base_id: str) -> dict:
    """
    Remove a base station from the grid.
    NOT EXPOSED TO AI.
    """
    result = grid.remove_base(base_id)
    return result


# REMOVED @mcp.tool() - Internal function only
def add_drone(drone_id: str, base_id: str, x: int, y: int) -> dict:
    """
    Add a new drone to the grid at a specific base.
    NOT EXPOSED TO AI.
    """
    result = grid.add_drone(drone_id, base_id, x, y)
    return result


# REMOVED @mcp.tool() - Internal function only
def remove_drone(drone_id: str) -> dict:
    """
    Remove a drone from the grid.
    NOT EXPOSED TO AI.
    """
    result = grid.remove_drone(drone_id)
    return result


def get_grid_instance():
    """Helper to access grid from other modules"""
    return grid
