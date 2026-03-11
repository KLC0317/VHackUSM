"""
Test backend components
"""
import sys
import asyncio

print("🔍 Testing Aegis Backend Components...\n")

# Test 1: Import grid
print("1. Testing grid import...")
try:
    from app.simulation.grid import DisasterGrid
    print(" ✅ Grid imported successfully")
except Exception as e:
    print(f" ❌ Failed to import grid: {e}")
    sys.exit(1)

# Test 2: Create grid instance
print("\n2. Testing grid instantiation...")
try:
    grid = DisasterGrid(size=20, num_drones=3, num_survivors=3)
    print(f" ✅ Grid created: {grid.size}x{grid.size}")
    print(f" ✅ Drones: {len(grid.drones)}")
    print(f" ✅ Survivors: {len(grid.thermal_signatures)}")
except Exception as e:
    print(f" ❌ Failed to create grid: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 3: Get grid state
print("\n3. Testing get_state()...")
try:
    state = grid.get_state()
    print(" ✅ State retrieved")
    print(f" - Size: {state['size']}")
    print(f" - Drones: {len(state['drones'])}")
    print(f" - Thermal signatures: {len(state['thermal_signatures'])}")
    print(f" - Discovered: {state['discovered_count']}")

    # Verify structure
    if 'drones' in state and 'thermal_signatures' in state:
        print("   ✅ State structure is valid")
    else:
        print("   ❌ State structure is invalid")
        print(f"   State keys: {state.keys()}")

except Exception as e:
    print(f" ❌ Failed to get state: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 4: Test tick
print("\n4. Testing tick()...")
try:
    tick_state = grid.tick()
    print(" ✅ Tick executed")
    print(f" - Tick count: {tick_state['tick']}")
    print(f" - Drones: {len(tick_state['drones'])}")
except Exception as e:
    print(f" ❌ Failed to tick: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 5: Test MCP tools
print("\n5. Testing MCP tools...")
try:
    from app.mcp.drone_server import get_active_fleet, get_grid_state

    fleet = get_active_fleet()
    print("   ✅ get_active_fleet() works")
    print(f"   - Active drones: {fleet['count']}")

    grid_state = get_grid_state()
    print("   ✅ get_grid_state() works")
    print(f"   - Grid size: {grid_state['size']}")

except Exception as e:
    print(f" ❌ Failed to test MCP tools: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 6: Test WebSocket manager
print("\n6. Testing WebSocket manager...")
try:
    from app.websocket.manager import manager
    print(" ✅ WebSocket manager imported")
except Exception as e:
    print(f" ❌ Failed to import manager: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n" + "="*50)
print("✨ All backend tests passed!")
print("\nYou can now run: python -m app.main")
