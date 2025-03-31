import * as mc from 'minecraft-protocol';
import { createHash } from 'crypto';
import { config } from './config';
import { log } from './vite';

interface AgentConnection {
  client: mc.Client;
  status: 'connecting' | 'connected' | 'disconnected';
  world?: string;
  position?: {
    x: number;
    y: number;
    z: number;
  };
  lastCommand?: string;
  lastCommandResponse?: string;
}

export class MinecraftConnector {
  private connections: Map<number, AgentConnection>;
  
  constructor() {
    this.connections = new Map();
    log('Minecraft connector initialized', 'minecraft');
  }
  
  /**
   * Connect an agent to the Minecraft server
   */
  async connectAgent(agentId: number, agentName: string): Promise<boolean> {
    try {
      log(`Attempting to connect agent ${agentId} (${agentName}) to Minecraft server...`, 'minecraft');
      
      // Unique username for this agent
      const username = `${agentName}_${agentId}`;
      
      // Connect to Minecraft server
      const client = mc.createClient({
        host: config.minecraft.host,
        port: config.minecraft.port,
        username: username,
        version: config.minecraft.version,
        auth: config.minecraft.auth ? 'microsoft' : 'offline'
      });
      
      // Setup client event handlers
      client.on('connect', () => {
        log(`Agent ${agentId} (${agentName}) connected to Minecraft server`, 'minecraft');
        const connection = this.connections.get(agentId);
        if (connection) {
          connection.status = 'connected';
          this.connections.set(agentId, connection);
        }
      });
      
      client.on('disconnect', (reason) => {
        log(`Agent ${agentId} (${agentName}) disconnected from Minecraft server: ${reason}`, 'minecraft');
        const connection = this.connections.get(agentId);
        if (connection) {
          connection.status = 'disconnected';
          this.connections.set(agentId, connection);
        }
      });
      
      client.on('error', (err) => {
        log(`Error with agent ${agentId} (${agentName}): ${err.message}`, 'minecraft');
      });
      
      // Save connection
      this.connections.set(agentId, {
        client,
        status: 'connecting',
        world: 'EnderKids World',
        position: {
          x: 0,
          y: 64,
          z: 0
        }
      });
      
      return true;
    } catch (error) {
      log(`Failed to connect agent ${agentId} (${agentName}) to Minecraft server: ${error}`, 'minecraft');
      return false;
    }
  }
  
  /**
   * Disconnect an agent from the Minecraft server
   */
  async disconnectAgent(agentId: number): Promise<boolean> {
    try {
      const connection = this.connections.get(agentId);
      
      if (!connection) {
        log(`Agent ${agentId} not found for disconnection`, 'minecraft');
        return false;
      }
      
      if (connection.status !== 'disconnected') {
        connection.client.end('Disconnected by EnderKids platform');
        connection.status = 'disconnected';
        this.connections.set(agentId, connection);
      }
      
      return true;
    } catch (error) {
      log(`Error disconnecting agent ${agentId}: ${error}`, 'minecraft');
      return false;
    }
  }
  
  /**
   * Get the status of an agent
   */
  getAgentStatus(agentId: number): { connected: boolean; world?: string; position?: { x: number; y: number; z: number } } {
    const connection = this.connections.get(agentId);
    
    if (!connection) {
      return { connected: false };
    }
    
    return {
      connected: connection.status === 'connected',
      world: connection.world,
      position: connection.position
    };
  }
  
  /**
   * Send a command to an agent
   */
  async sendCommand(agentId: number, command: string): Promise<{ success: boolean; message: string }> {
    try {
      const connection = this.connections.get(agentId);
      
      if (!connection) {
        return { 
          success: false, 
          message: "Agent not found" 
        };
      }
      
      if (connection.status !== 'connected') {
        return { 
          success: false, 
          message: "Agent is not connected to Minecraft" 
        };
      }
      
      log(`Sending command to agent ${agentId}: ${command}`, 'minecraft');
      
      // Process different types of commands
      let processedCommand = command;
      let response = '';
      
      // Store the command and prepare response
      connection.lastCommand = command;
      
      // Process basic commands with simple responses for now
      // In a more advanced implementation, we would actually send commands to the Minecraft client
      if (command.toLowerCase().includes("build")) {
        response = "Building at current location...";
      } else if (command.toLowerCase().includes("mine")) {
        response = "Mining for resources...";
      } else if (command.toLowerCase().includes("come") || command.toLowerCase().includes("follow")) {
        response = "Coming to your location!";
      } else if (command.toLowerCase().includes("stop")) {
        response = "Stopping current action.";
      } else {
        response = "Command received. Processing...";
      }
      
      // Store the response
      connection.lastCommandResponse = response;
      
      // In a real implementation, we would send the actual command to the Minecraft client
      // client.write('chat', { message: processedCommand });
      
      return {
        success: true,
        message: response
      };
    } catch (error) {
      log(`Error sending command to agent ${agentId}: ${error}`, 'minecraft');
      return {
        success: false,
        message: `Error: ${error}`
      };
    }
  }
}

// Create a singleton instance
export const minecraftConnector = new MinecraftConnector();