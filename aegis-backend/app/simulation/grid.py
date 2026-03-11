from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Tuple
import random


class DroneStatus(Enum):
    IDLE = "Idle"
    MOVING = "Moving"
    SCANNING = "Scanning"
    RETURNING = "Returning"
    CHARGING = "Charging"


@dataclass
class Drone:
    id: str
    x: int
    y: int
    battery: float
    status: DroneStatus
    base_id: str
    target: Optional[Tuple[int, int]] = None
    # Capabilities
    max_speed: int = 1
    scan_radius: int = 1
    battery_capacity: float = 100.0
    scan_cost: float = 5.0
    move_cost: float = 0.5
    aid_capacity: int = 3
    aid_remaining: int = 3

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "x": self.x,
            "y": self.y,
            "battery": round(self.battery, 1),
            "status": self.status.value,
            "base_id": self.base_id,
            "target": self.target,
            "capabilities": {
                "max_speed": self.max_speed,
                "scan_radius": self.scan_radius,
                "battery_capacity": self.battery_capacity,
                "scan_cost": self.scan_cost,
                "move_cost": self.move_cost,
                "aid_capacity": self.aid_capacity,
                "aid_remaining": self.aid_remaining,
            }
        }


@dataclass
class ThermalSignature:
    id: str
    x: int
    y: int
    discovered: bool = False

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "x": self.x,
            "y": self.y,
            "discovered": self.discovered,
        }


@dataclass
class BaseStation:
    id: str
    name: str
    x: int
    y: int

    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "name": self.name,
            "x": self.x,
            "y": self.y,
        }


class DisasterGrid:
    def __init__(self, size: int = 20, num_drones: int = 6, num_survivors: int = 24):
        self.size = size
        self.tick_count = 0
        self.drones: Dict[str, Drone] = {}
        self.thermal_signatures: List[ThermalSignature] = []
        self.bases: Dict[str, BaseStation] = {}

        # Initialize 3 bases at strategic positions
        base_positions = [
            (1, 1, "Base-Alpha"),
            (size - 2, 1, "Base-Bravo"),
            (size // 2, size - 2, "Base-Charlie")
        ]
        
        for i, (x, y, name) in enumerate(base_positions):
            base_id = f"base-{i}"
            self.bases[base_id] = BaseStation(
                id=base_id,
                name=name,
                x=x,
                y=y,
            )

        # Initialize drones based on num_drones parameter
        base_ids = list(self.bases.keys())
        num_bases = len(base_ids)
        
        for i in range(num_drones):
            # Generate drone ID using letters A-Z, then continue with numbers
            if i < 26:
                drone_id = f"Drone-{chr(65 + i)}"  # A-Z
            else:
                drone_id = f"Drone-{i}"
            
            # Distribute drones evenly across bases
            base_id = base_ids[i % num_bases]
            base = self.bases[base_id]
            
            self.drones[drone_id] = Drone(
                id=drone_id,
                x=base.x,
                y=base.y,
                battery=100.0,
                status=DroneStatus.IDLE,
                base_id=base_id,
            )

        # Place survivors randomly based on num_survivors parameter
        placed_positions = set()
        # Add base positions to avoid placing survivors there
        for base in self.bases.values():
            placed_positions.add((base.x, base.y))
        
        survivor_count = 0
        max_attempts = num_survivors * 10
        attempts = 0
        
        while survivor_count < num_survivors and attempts < max_attempts:
            x = random.randint(1, size - 2)
            y = random.randint(1, size - 2)
            
            if (x, y) not in placed_positions:
                self.thermal_signatures.append(
                    ThermalSignature(id=f"survivor-{survivor_count}", x=x, y=y)
                )
                placed_positions.add((x, y))
                survivor_count += 1
            
            attempts += 1

    def tick(self):
        """Advance simulation by one tick"""
        self.tick_count += 1

        for drone in self.drones.values():
            if drone.status == DroneStatus.MOVING and drone.target:
                # Use drone's max_speed
                moves_this_tick = 0
                while moves_this_tick < drone.max_speed and (drone.x, drone.y) != drone.target:
                    # Manhattan movement
                    if drone.x != drone.target[0]:
                        drone.x += 1 if drone.target[0] > drone.x else -1
                    elif drone.y != drone.target[1]:
                        drone.y += 1 if drone.target[1] > drone.y else -1
                    
                    moves_this_tick += 1
                    # Use drone's move_cost
                    drone.battery = max(0, drone.battery - drone.move_cost)

                # Check arrival
                if (drone.x, drone.y) == drone.target:
                    drone.status = DroneStatus.IDLE
                    drone.target = None

            elif drone.status == DroneStatus.RETURNING and drone.target:
                # Same logic for returning
                moves_this_tick = 0
                while moves_this_tick < drone.max_speed and (drone.x, drone.y) != drone.target:
                    if drone.x != drone.target[0]:
                        drone.x += 1 if drone.target[0] > drone.x else -1
                    elif drone.y != drone.target[1]:
                        drone.y += 1 if drone.target[1] > drone.y else -1
                    
                    moves_this_tick += 1
                    drone.battery = max(0, drone.battery - drone.move_cost)

                # Check if reached base
                if (drone.x, drone.y) == drone.target:
                    drone.status = DroneStatus.CHARGING
                    drone.target = None

            elif drone.status == DroneStatus.CHARGING:
                # Recharge at base
                drone.battery = min(drone.battery_capacity, drone.battery + 5.0)
                if drone.battery >= drone.battery_capacity:
                    drone.status = DroneStatus.IDLE

    def move_drone(self, drone_id: str, target_x: int, target_y: int) -> Dict:
        """Command drone to move to target"""
        if drone_id not in self.drones:
            return {"success": False, "error": "Drone not found"}

        drone = self.drones[drone_id]

        if drone.status not in [DroneStatus.IDLE, DroneStatus.MOVING]:
            return {
                "success": False,
                "error": f"Drone is {drone.status.value}, cannot move",
            }

        if not (0 <= target_x < self.size and 0 <= target_y < self.size):
            return {"success": False, "error": "Target out of bounds"}

        drone.target = (target_x, target_y)
        drone.status = DroneStatus.MOVING

        return {
            "success": True,
            "message": f"Drone {drone_id} moving to ({target_x}, {target_y})",
            "drone": drone.to_dict(),
        }

    def thermal_scan(self, drone_id: str) -> Dict:
        """Perform thermal scan"""
        if drone_id not in self.drones:
            return {"success": False, "error": "Drone not found"}

        drone = self.drones[drone_id]

        if drone.battery < drone.scan_cost:
            return {"success": False, "error": "Insufficient battery for scan"}

        if drone.status != DroneStatus.IDLE:
            return {"success": False, "error": "Drone must be idle to scan"}

        # Scan area based on drone's scan_radius
        found = []
        for signature in self.thermal_signatures:
            if (
                abs(signature.x - drone.x) <= drone.scan_radius
                and abs(signature.y - drone.y) <= drone.scan_radius
            ):
                if not signature.discovered:
                    signature.discovered = True
                    found.append(signature.to_dict())

        # Use drone's scan_cost
        drone.battery -= drone.scan_cost

        return {
            "success": True,
            "signatures_found": len(found),
            "signatures": found,
            "scan_area": {
                "center": (drone.x, drone.y),
                "radius": drone.scan_radius,
            },
            "battery_remaining": round(drone.battery, 1),
            "drone_id": drone_id,  # Add this
            "location": {"x": drone.x, "y": drone.y},  # Add this
        }

    def return_to_base(self, drone_id: str) -> Dict:
        """Command drone to return to base"""
        if drone_id not in self.drones:
            return {"success": False, "error": "Drone not found"}

        drone = self.drones[drone_id]
        base = self.bases.get(drone.base_id)

        if not base:
            return {"success": False, "error": "Base not found"}

        drone.target = (base.x, base.y)
        drone.status = DroneStatus.RETURNING

        return {
            "success": True,
            "message": f"Drone {drone_id} returning to {base.name}",
            "drone": drone.to_dict(),
        }

    def drop_aid(self, drone_id: str) -> Dict:
        """Drop aid payload at drone's current position"""
        if drone_id not in self.drones:
            return {"success": False, "error": "Drone not found"}

        drone = self.drones[drone_id]

        if drone.aid_remaining <= 0:
            return {
                "success": False,
                "error": "No aid packages remaining"
            }

        if drone.battery < 10:
            return {
                "success": False,
                "error": "Insufficient battery for aid drop",
            }

        drone.battery -= 10
        drone.aid_remaining -= 1

        return {
            "success": True,
            "message": f"Aid dropped at ({drone.x}, {drone.y})",
            "remaining_battery": round(drone.battery, 1),
            "aid_remaining": drone.aid_remaining,
            "location": {"x": drone.x, "y": drone.y},
        }

    def update_drone_capabilities(
        self, 
        drone_id: str, 
        max_speed: Optional[int] = None,
        scan_radius: Optional[int] = None,
        battery_capacity: Optional[float] = None,
        scan_cost: Optional[float] = None,
        move_cost: Optional[float] = None,
        aid_capacity: Optional[int] = None
    ) -> Dict:
        """Update drone capabilities"""
        if drone_id not in self.drones:
            return {"success": False, "error": "Drone not found"}
        
        drone = self.drones[drone_id]
        
        if max_speed is not None:
            drone.max_speed = max(1, min(3, max_speed))
        if scan_radius is not None:
            drone.scan_radius = max(1, min(3, scan_radius))
        if battery_capacity is not None:
            old_capacity = drone.battery_capacity
            drone.battery_capacity = max(100, min(200, battery_capacity))
            # Adjust current battery proportionally
            if old_capacity > 0:
                battery_ratio = drone.battery / old_capacity
                drone.battery = battery_ratio * drone.battery_capacity
        if scan_cost is not None:
            drone.scan_cost = max(3, min(10, scan_cost))
        if move_cost is not None:
            drone.move_cost = max(0.3, min(1.0, move_cost))
        if aid_capacity is not None:
            drone.aid_capacity = max(1, min(5, aid_capacity))
            drone.aid_remaining = drone.aid_capacity
        
        return {
            "success": True,
            "message": f"Updated capabilities for {drone_id}",
            "capabilities": drone.to_dict()["capabilities"]
        }

    def get_state(self) -> Dict:
        """Get complete grid state"""
        return {
            "size": self.size,
            "tick": self.tick_count,
            "drones": [d.to_dict() for d in self.drones.values()],
            "thermal_signatures": [s.to_dict() for s in self.thermal_signatures],
            "bases": [b.to_dict() for b in self.bases.values()],
            "discovered_count": sum(1 for s in self.thermal_signatures if s.discovered),
            "total_survivors": len(self.thermal_signatures),
        }

    def get_active_fleet(self) -> List[Dict]:
        """Get list of all active drones"""
        return [d.to_dict() for d in self.drones.values()]

    def get_other_drone_info(self, drone_id: str) -> Dict:
        """Get info about other drones"""
        other_drones = [
            {
                "id": d.id,
                "position": (d.x, d.y),
                "target": d.target,
                "status": d.status.value,
            }
            for d in self.drones.values()
            if d.id != drone_id
        ]

        return {
            "success": True,
            "other_drones": other_drones,
            "count": len(other_drones),
        }

    def add_thermal_signature(self, x: int, y: int, sig_id: str) -> Dict:
        """Add new survivor"""
        if not (0 <= x < self.size and 0 <= y < self.size):
            return {"success": False, "error": "Position out of bounds"}

        self.thermal_signatures.append(
            ThermalSignature(id=sig_id, x=x, y=y)
        )

        return {
            "success": True,
            "message": f"Survivor {sig_id} added at ({x}, {y})",
        }

    def remove_thermal_signature(self, sig_id: str) -> Dict:
        """Remove survivor"""
        self.thermal_signatures = [
            s for s in self.thermal_signatures if s.id != sig_id
        ]
        return {"success": True, "message": f"Survivor {sig_id} removed"}

    def add_base(self, x: int, y: int, base_id: str, name: str) -> Dict:
        """Add new base station"""
        if not (0 <= x < self.size and 0 <= y < self.size):
            return {"success": False, "error": "Position out of bounds"}

        if base_id in self.bases:
            return {"success": False, "error": "Base ID already exists"}

        self.bases[base_id] = BaseStation(
            id=base_id,
            name=name,
            x=x,
            y=y,
        )

        return {
            "success": True,
            "message": f"Base {name} added at ({x}, {y})",
            "base": self.bases[base_id].to_dict(),
        }

    def remove_base(self, base_id: str) -> Dict:
        """Remove base station"""
        if len(self.bases) <= 1:
            return {"success": False, "error": "Cannot remove last base"}

        if base_id not in self.bases:
            return {"success": False, "error": "Base not found"}

        # Reassign drones to another base
        remaining_bases = [bid for bid in self.bases.keys() if bid != base_id]
        new_base_id = remaining_bases[0]

        for drone in self.drones.values():
            if drone.base_id == base_id:
                drone.base_id = new_base_id

        del self.bases[base_id]

        return {
            "success": True,
            "message": f"Base {base_id} removed, drones reassigned to {new_base_id}",
        }

    def add_drone(self, drone_id: str, base_id: str, x: int, y: int) -> Dict:
        """Add new drone"""
        if drone_id in self.drones:
            return {"success": False, "error": "Drone ID already exists"}

        if base_id not in self.bases:
            return {"success": False, "error": "Base not found"}

        if not (0 <= x < self.size and 0 <= y < self.size):
            return {"success": False, "error": "Position out of bounds"}

        self.drones[drone_id] = Drone(
            id=drone_id,
            x=x,
            y=y,
            battery=100.0,
            status=DroneStatus.IDLE,
            base_id=base_id,
        )

        return {
            "success": True,
            "message": f"Drone {drone_id} added at ({x}, {y})",
            "drone": self.drones[drone_id].to_dict(),
        }

    def remove_drone(self, drone_id: str) -> Dict:
        """Remove drone"""
        if drone_id not in self.drones:
            return {"success": False, "error": "Drone not found"}

        del self.drones[drone_id]

        return {
            "success": True,
            "message": f"Drone {drone_id} removed",
        }
