import { createHash } from 'crypto';
import { config } from './config';
import { log } from './vite';
import { spawn } from 'child_process';
import { join } from 'path';
import { existsSync } from 'fs';

// Define a real Minecraft client for Bedrock Edition using the minecraft-agent implementation
class BedrockClient {
  private host: string;
  private port: number;
  private username: string;
  private callbacks: Record<string, Array<(data?: any) => void>>;
  private isConnected: boolean = false;
  private agentProcess: any = null;
  private position: { x: number; y: number; z: number } = { x: 0, y: 64, z: 0 };

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
    
    // Check if we should use real connection or simulation
    const useRealConnection = process.env.USE_REAL_MINECRAFT_CONNECTION === 'true';
    
    if (useRealConnection) {
      this.connectToRealServer();
    } else {
      log(`[SIMULATION] Connection to ${this.host}:${this.port} as ${this.username} is being simulated`, 'minecraft');
      log(`[NOTE] Set USE_REAL_MINECRAFT_CONNECTION=true in environment to use real connections`, 'minecraft');
      
      // Simulate successful connection
      setTimeout(() => {
        this.isConnected = true;
        log(`[SIMULATION] Successfully connected to ${this.host}:${this.port} as ${this.username}`, 'minecraft');
        this.triggerEvent('connect');
      }, 1500);
    }
  }

  private connectToRealServer() {
    try {
      // Path to the minecraft-agent directory
      const agentDir = join(process.cwd(), 'minecraft-agent');
      
      // Check if the directory exists
      if (!existsSync(agentDir)) {
        log(`Error: minecraft-agent directory not found at ${agentDir}`, 'minecraft');
        this.triggerEvent('error', 'minecraft-agent directory not found');
        return;
      }
      
      // Create a temporary connection script for this agent
      const scriptContent = `
        // Temporary connection script for ${this.username}
        import bedrock from 'bedrock-protocol';

        // Configuration
        const config = {
          host: '${this.host}',
          port: ${this.port},
          username: '${this.username}',
          offline: true
        };

        console.log(\`Connecting to \${config.host}:\${config.port} as \${config.username}\`);

        // Create the client
        const client = bedrock.createClient(config);

        // Handle connection events
        client.on('spawn', () => {
          console.log('CONNECTED:Agent has spawned in the world!');
          
          // Listen for position updates
          client.on('move_player', (packet) => {
            const position = {
              x: packet.params.position.x,
              y: packet.params.position.y,
              z: packet.params.position.z
            };
            console.log(\`POSITION:\${JSON.stringify(position)}\`);
          });
        });

        client.on('text', (packet) => {
          console.log(\`MESSAGE:\${packet.params.message}\`);
        });

        client.on('error', (err) => {
          console.error(\`ERROR:\${err}\`);
          process.exit(1);
        });

        client.on('close', () => {
          console.log('DISCONNECTED:Connection closed');
          process.exit(0);
        });

        // Handle commands from parent process
        process.on('message', (message) => {
          if (message.type === 'command') {
            console.log(\`Sending command: \${message.command}\`);
            
            client.queue('text', {
              type: 'chat',
              needs_translation: false,
              source_name: config.username,
              xuid: '',
              platform_chat_id: '',
              message: message.command
            });
          } else if (message.type === 'disconnect') {
            console.log('Disconnecting...');
            client.close();
          }
        });

        // Handle process termination
        process.on('SIGINT', () => {
          console.log('Disconnecting...');
          client.close();
          process.exit(0);
        });
      `;
      
      // Spawn the Node.js process to run the agent
      const nodeExecutable = process.execPath; // Get the current Node.js executable path
      
      log(`Starting real Minecraft Bedrock client for ${this.username}...`, 'minecraft');
      
      // Use the simple-agent.js script from the minecraft-agent directory
      // This avoids having to create a temporary file
      this.agentProcess = spawn(nodeExecutable, [join(agentDir, 'simple-agent.js')], {
        cwd: agentDir,
        env: {
          ...process.env,
          MINECRAFT_HOST: this.host,
          MINECRAFT_PORT: this.port.toString(),
          MINECRAFT_USERNAME: this.username
        },
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'] // Enable IPC channel
      });
      
      // Handle stdout (for logging)
      this.agentProcess.stdout.on('data', (data: Buffer) => {
        const output = data.toString().trim();
        
        // Parse special messages
        if (output.startsWith('CONNECTED:')) {
          this.isConnected = true;
          log(`BedrockClient: ${this.username} connected to Minecraft server`, 'minecraft');
          this.triggerEvent('connect');
        } else if (output.startsWith('DISCONNECTED:')) {
          this.isConnected = false;
          log(`BedrockClient: ${this.username} disconnected from Minecraft server`, 'minecraft');
          this.triggerEvent('disconnect', output.substring(13));
        } else if (output.startsWith('ERROR:')) {
          log(`BedrockClient Error: ${output.substring(6)}`, 'minecraft');
          this.triggerEvent('error', output.substring(6));
        } else if (output.startsWith('POSITION:')) {
          try {
            this.position = JSON.parse(output.substring(9));
            this.triggerEvent('position', this.position);
          } catch (e) {
            log(`Error parsing position: ${e}`, 'minecraft');
          }
        } else if (output.startsWith('MESSAGE:')) {
          log(`Message from server: ${output.substring(8)}`, 'minecraft');
          this.triggerEvent('message', output.substring(8));
        } else {
          log(`BedrockClient: ${output}`, 'minecraft');
        }
      });
      
      // Handle stderr (for errors)
      this.agentProcess.stderr.on('data', (data: Buffer) => {
        const error = data.toString().trim();
        log(`BedrockClient Error: ${error}`, 'minecraft');
        this.triggerEvent('error', error);
      });
      
      // Handle process exit
      this.agentProcess.on('close', (code: number) => {
        this.isConnected = false;
        log(`BedrockClient: Process exited with code ${code}`, 'minecraft');
        this.agentProcess = null;
        this.triggerEvent('disconnect', `Process exited with code ${code}`);
      });
      
      // Handle process errors
      this.agentProcess.on('error', (err: Error) => {
        this.isConnected = false;
        log(`BedrockClient Error: ${err.message}`, 'minecraft');
        this.agentProcess = null;
        this.triggerEvent('error', err.message);
      });
      
    } catch (error) {
      log(`Error starting Minecraft Bedrock client: ${error}`, 'minecraft');
      this.triggerEvent('error', error);
    }
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
    if (this.agentProcess) {
      // Send disconnect message to the agent process
      if (this.agentProcess.connected) {
        this.agentProcess.send({ type: 'disconnect' });
      }
      
      // Give it a moment to clean up, then kill if still running
      setTimeout(() => {
        if (this.agentProcess) {
          this.agentProcess.kill();
          this.agentProcess = null;
        }
      }, 1000);
    }
    
    this.isConnected = false;
    this.triggerEvent('disconnect', reason);
  }

  // Send a chat message/command to the Minecraft server
  sendChat(message: string) {
    if (this.agentProcess && this.isConnected) {
      // Send the command to the agent process
      if (this.agentProcess.connected) {
        this.agentProcess.send({ type: 'command', command: message });
        log(`Command sent to ${this.host}:${this.port} as ${this.username}: ${message}`, 'minecraft');
        return true;
      }
    } else if (process.env.USE_REAL_MINECRAFT_CONNECTION !== 'true') {
      // Simulate sending a command
      log(`[SIMULATION] Chat message sent to ${this.host}:${this.port} as ${this.username}: ${message}`, 'minecraft');
      log(`[NOTE] This is a simulation - no actual connection to the Minecraft server is being made`, 'minecraft');
      return true;
    }
    
    log(`Failed to send command: Client not connected`, 'minecraft');
    return false;
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
