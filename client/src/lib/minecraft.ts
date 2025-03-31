// Enhanced Minecraft connection client to interact with real Minecraft Bedrock servers
// This communicates with our server API, which in turn connects to the Minecraft server

import { apiRequest } from './queryClient';

export interface MinecraftAgent {
  id: string;
  name: string;
  connected: boolean;
  currentWorld?: string;
  position?: {
    x: number;
    y: number;
    z: number;
  };
}

export interface CommandResult {
  success: boolean;
  message: string;
}

export class MinecraftConnection {
  private cachedAgentStatus: Map<string, MinecraftAgent>;
  
  constructor() {
    this.cachedAgentStatus = new Map();
  }
  
  /**
   * Get agent status from server/cache
   * This is used to display real-time information about an agent
   * In a production system, we might use WebSockets for live updates
   */
  async getAgentStatus(agentId: number): Promise<MinecraftAgent | null> {
    const id = `agent_${agentId}`;
    
    try {
      // In a real-time system, we would fetch this from an API endpoint
      // Since we don't have a specific endpoint for this yet, we'll use cached data
      // with a fallback to default values
      
      if (!this.cachedAgentStatus.has(id)) {
        // Default initial values
        this.cachedAgentStatus.set(id, {
          id,
          name: "Agent",
          connected: false,
          currentWorld: "EnderKids World",
          position: {
            x: 0,
            y: 64,
            z: 0
          }
        });
      }
      
      return this.cachedAgentStatus.get(id) || null;
    } catch (error) {
      console.error("Error getting agent status:", error);
      return null;
    }
  }
  
  /**
   * Send a command to the agent via the API
   */
  async sendCommand(agentId: number, command: string): Promise<CommandResult> {
    try {
      // Send command to server API
      const response = await apiRequest('POST', '/api/commands', {
        agentId,
        command
      });
      
      const responseData = await response.json();
      
      // Update cached status with any new info
      const id = `agent_${agentId}`;
      const currentStatus = this.cachedAgentStatus.get(id) || {
        id,
        name: "Agent",
        connected: true,
        currentWorld: "EnderKids World"
      };
      
      // Update cached agent status
      this.cachedAgentStatus.set(id, {
        ...currentStatus,
        connected: true
      });
      
      return {
        success: true,
        message: responseData.response || "Command sent."
      };
    } catch (error) {
      console.error("Error sending command:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to send command"
      };
    }
  }
  
  /**
   * Connect an agent to the Minecraft server
   */
  async connectAgent(agentId: number, agentName: string): Promise<MinecraftAgent> {
    const id = `agent_${agentId}`;
    
    try {
      // Request connection to the Minecraft server
      const response = await apiRequest('POST', `/api/agents/${agentId}/connect`);
      const responseData = await response.json();
      
      // Update cached agent status with server response or default values
      const newStatus: MinecraftAgent = {
        id,
        name: responseData.name || agentName,
        connected: responseData.connected || true,
        currentWorld: responseData.currentWorld || "EnderKids World",
        position: responseData.position || {
          x: 0,
          y: 64,
          z: 0
        }
      };
      
      this.cachedAgentStatus.set(id, newStatus);
      return newStatus;
    } catch (error) {
      console.error("Error connecting agent:", error);
      // Return a disconnected agent status
      const disconnectedStatus: MinecraftAgent = {
        id,
        name: agentName,
        connected: false
      };
      this.cachedAgentStatus.set(id, disconnectedStatus);
      return disconnectedStatus;
    }
  }
  
  /**
   * In a real-time system, we would have methods to subscribe to agent updates
   * For now, we'll provide a simpler implementation
   */
  async updateAgentPosition(agentId: number, position: { x: number; y: number; z: number }): Promise<void> {
    const id = `agent_${agentId}`;
    const currentStatus = this.cachedAgentStatus.get(id);
    
    if (currentStatus) {
      this.cachedAgentStatus.set(id, {
        ...currentStatus,
        position
      });
    }
  }
}

export const minecraftConnection = new MinecraftConnection();
