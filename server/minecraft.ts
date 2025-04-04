import { createHash } from 'crypto';
import { config } from './config';
import { log } from './vite';

// Define a simulated Minecraft client for Bedrock Edition
class BedrockClient {
  private host: string;
  private port: number;
  private username: string;
  private callbacks: Record<string, Array<(data?: any) => void>>;
  private simulatedConnectionDelay = 1500; // ms
  private connectionTimeout: NodeJS.Timeout | null = null;
  private isConnected: boolean = false;

  constructor(options: {
    host: string,
    port: number,
    username: string
  }) {
    this.host = options.host;
    this.port = options.port;
    this.username = options.username;
    this.callbacks = {};

    log(`BedrockClient: Attempting to connect to ${this.host}:${this.port} as ${this.username}`, 'minecraft');
    
    // Simulate connection process
    this.connectionTimeout = setTimeout(() => {
      // Always attempt to connect to the configured server
      log(`BedrockClient: Attempting to connect to ${this.host}:${this.port} as ${this.username}`, 'minecraft');
      
      // For this simulation, we'll assume the connection is successful
      this.isConnected = true;
      log(`BedrockClient: Successfully connected to ${this.host}:${this.port} as ${this.username}`, 'minecraft');
      this.triggerEvent('connect');
    }, this.simulatedConnectionDelay);
  }

  on(event: string, callback: (data?: any) => void) {
    if (!this.callbacks[event]) {
      this.callbacks[event] = [];
    }
    this.callbacks[event].push(callback);
    
    // If registering for 'connect' event and we're already connected, trigger immediately
    if (event === 'connect' && this.isConnected) {
      callback();
    }
  }

  triggerEvent(event: string, data?: any) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(callback => callback(data));
    }
  }

  end(reason: string) {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    this.isConnected = false;
    this.triggerEvent('disconnect', reason);
  }

  // Simulate sending a chat message/command
  sendChat(message: string) {
    log(`[SIMULATION] Chat message sent to ${this.host}:${this.port} as ${this.username}: ${message}`, 'minecraft');
    log(`[NOTE] This is a simulation - no actual connection to the Minecraft server is being made`, 'minecraft');
    // In a real implementation, this would use the Bedrock protocol to send commands
    return true;
  }
}

interface AgentConnection {
  client: BedrockClient;
  status: 'connecting' | 'connected' | 'disconnected';
  world?: string;
  position?: {
    x: number;
    y: number;
    z: number;
  };
  lastCommand?: string;
  lastCommandResponse?: string;
  connectTime?: number; // Timestamp when the agent connected
  currentActivity?: string; // What the agent is currently doing
}

export class MinecraftConnector {
  private connections: Map<number, AgentConnection>;
  
  constructor() {
    this.connections = new Map();
    log('Minecraft Bedrock connector initialized', 'minecraft');
  }
  
  /**
   * Connect an agent to the Minecraft Bedrock server
   */
  async connectAgent(agentId: number, agentName: string): Promise<boolean> {
    try {
      log(`[SIMULATION] Attempting to connect agent ${agentId} (${agentName}) to Minecraft Bedrock server at ${config.minecraft.host}:${config.minecraft.port}...`, 'minecraft');
      log(`[NOTE] This is a simulated connection - no actual connection to the Minecraft server is being made`, 'minecraft');
      
      // Check if agent is already connected
      const existingConnection = this.connections.get(agentId);
      if (existingConnection && existingConnection.status === 'connected') {
        log(`Agent ${agentId} (${agentName}) is already connected to Minecraft Bedrock server`, 'minecraft');
        return true;
      }
      
      // If there's an existing connection in another state, disconnect it first
      if (existingConnection) {
        try {
          existingConnection.client.end('Reconnecting agent');
        } catch (e) {
          log(`Error disconnecting previous connection for agent ${agentId}: ${e}`, 'minecraft');
        }
      }
      
      // Unique username for this agent
      const username = `${agentName}_${agentId}`;
      
      log(`Creating new Bedrock client for ${username} to connect to ${config.minecraft.host}:${config.minecraft.port}`, 'minecraft');
      
      // Connect to Minecraft server using our simulated Bedrock client
      const client = new BedrockClient({
        host: config.minecraft.host,
        port: config.minecraft.port,
        username: username
      });
      
      // Create new connection object
      const newConnection: AgentConnection = {
        client,
        status: 'connecting',
        world: 'EnderKids World',
        position: {
          x: 0,
          y: 64,
          z: 0
        },
        connectTime: Date.now(),
        currentActivity: 'Joining world'
      };
      
      // Save connection
      this.connections.set(agentId, newConnection);
      
      // Setup client event handlers
      client.on('connect', () => {
        log(`Agent ${agentId} (${agentName}) connected to Minecraft Bedrock server`, 'minecraft');
        
        // Update the connection status directly, not using the previously fetched reference
        const updatedConnection = this.connections.get(agentId);
        if (updatedConnection) {
          updatedConnection.status = 'connected';
          this.connections.set(agentId, updatedConnection);
        }
      });
      
      client.on('error', (errorMessage) => {
        log(`Agent ${agentId} (${agentName}) connection error: ${errorMessage}`, 'minecraft');
        
        // Update connection status to disconnected on error
        const updatedConnection = this.connections.get(agentId);
        if (updatedConnection) {
          updatedConnection.status = 'disconnected';
          updatedConnection.lastCommandResponse = `Connection error: ${errorMessage}`;
          this.connections.set(agentId, updatedConnection);
        }
      });
      
      client.on('disconnect', (reason) => {
        log(`Agent ${agentId} (${agentName}) disconnected from Minecraft Bedrock server: ${reason}`, 'minecraft');
        
        const updatedConnection = this.connections.get(agentId);
        if (updatedConnection) {
          updatedConnection.status = 'disconnected';
          this.connections.set(agentId, updatedConnection);
        }
      });
      
      return true;
    } catch (error) {
      log(`Failed to connect agent ${agentId} (${agentName}) to Minecraft Bedrock server: ${error}`, 'minecraft');
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
   * Get the full online agent connection information
   */
  getOnlineAgent(agentId: number): AgentConnection | undefined {
    const connection = this.connections.get(agentId);
    
    if (!connection || connection.status !== 'connected') {
      return undefined;
    }
    
    return connection;
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
      
      log(`[SIMULATION] Sending command to agent ${agentId}: ${command}`, 'minecraft');
      log(`[NOTE] This is a simulated command - no actual command is being sent to the Minecraft server`, 'minecraft');
      
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
      
      // Send chat message using our simulated Bedrock client
      connection.client.sendChat(processedCommand);
      
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
