from typing import List
from fastapi import WebSocket
import json

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def send_grid_update(self, state: dict):
        """Send grid state update to all connected clients"""
        if not self.active_connections:
            return
        
        message = {
            "type": "grid_update",
            "state": state
        }
        
        # Validate state before sending
        if not state or 'drones' not in state or 'thermal_signatures' not in state:
            return
        
        
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                disconnected.append(connection)
        
        # Clean up disconnected clients
        for connection in disconnected:
            self.disconnect(connection)

    async def send_agent_thought(self, content: str):
        """Send agent's reasoning to all connected clients"""
        if not self.active_connections:
            return
            
        message = {
            "type": "agent_thought",
            "content": content
        }
        
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                disconnected.append(connection)
        
        for connection in disconnected:
            self.disconnect(connection)

    async def send_agent_action(self, action: str, tool: str, args: dict):
        """Send agent action to all connected clients"""
        if not self.active_connections:
            return
            
        message = {
            "type": "agent_action",
            "action": action,
            "tool": tool,
            "args": args
        }
        
        
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                disconnected.append(connection)
        
        for connection in disconnected:
            self.disconnect(connection)

    async def send_tool_result(self, tool: str, result: dict):
        """Send tool execution result to all connected clients"""
        if not self.active_connections:
            return
            
        message = {
            "type": "tool_result",
            "tool": tool,
            "result": result
        }
        
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                disconnected.append(connection)
        
        for connection in disconnected:
            self.disconnect(connection)

    async def broadcast(self, message: dict):
        """Broadcast a message to all connected clients"""
        if not self.active_connections:
            return
        
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                disconnected.append(connection)
        
        for connection in disconnected:
            self.disconnect(connection)

# Global manager instance
manager = ConnectionManager()
