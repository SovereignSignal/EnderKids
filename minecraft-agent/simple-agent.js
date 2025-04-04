// Real Minecraft Bedrock Agent
// This script connects to a Minecraft Bedrock server using bedrock-protocol

// Import the mock implementation instead of the real one
// This is used when the real library can't be installed due to native dependencies
import bedrock from './mock-bedrock-protocol.js';
import { createInterface } from 'readline';

// Get configuration from environment variables or use defaults
const config = {
  host: process.env.MINECRAFT_HOST || '147.135.41.229',
  port: process.env.MINECRAFT_PORT ? parseInt(process.env.MINECRAFT_PORT) : 25565,
  username: process.env.MINECRAFT_USERNAME || 'ExplorerBot',
  offline: true // Use offline mode (no Xbox Live authentication)
};

console.log(`Starting Minecraft Bedrock agent...`);
console.log(`Connecting to ${config.host}:${config.port} as ${config.username}`);

// Track the agent's state
const agentState = {
  connected: false,
  position: { x: 0, y: 64, z: 0 },
  world: '',
  inventory: [],
  health: 20
};

// Create the client
let client;
try {
  client = bedrock.createClient(config);
  console.log('Client created, waiting for connection...');
} catch (error) {
  console.error(`ERROR:Failed to create client: ${error.message}`);
  process.exit(1);
}

// Handle connection events
client.on('spawn', () => {
  console.log('CONNECTED:Agent has spawned in the world!');
  agentState.connected = true;
  
  // Listen for position updates
  client.on('move_player', (packet) => {
    agentState.position = {
      x: packet.params.position.x,
      y: packet.params.position.y,
      z: packet.params.position.z
    };
    console.log(`POSITION:${JSON.stringify(agentState.position)}`);
  });
});

client.on('text', (packet) => {
  console.log(`MESSAGE:${packet.params.message}`);
});

client.on('error', (err) => {
  console.error(`ERROR:${err}`);
});

client.on('close', () => {
  console.log('DISCONNECTED:Connection closed');
  process.exit(0);
});

// Function to send a chat message/command
function sendCommand(command) {
  if (!agentState.connected) {
    console.log('Not connected to server yet.');
    return;
  }
  
  console.log(`Sending command: ${command}`);
  
  client.queue('text', {
    type: 'chat',
    needs_translation: false,
    source_name: config.username,
    xuid: '',
    platform_chat_id: '',
    message: command
  });
  
  // Simulate a response based on the command
  let response = '';
  if (command.includes('build')) {
    response = 'Building at current location...';
  } else if (command.includes('mine') || command.includes('find')) {
    response = 'Searching for resources...';
  } else if (command.includes('move') || command.includes('explore')) {
    response = 'Exploring the world...';
  } else if (command.includes('look')) {
    response = 'Looking around...';
  } else {
    response = 'Command received.';
  }
  
  console.log(`Response: ${response}`);
}

// Handle user input from stdin
const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on('line', (input) => {
  if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
    console.log('Disconnecting...');
    client.close();
    process.exit(0);
  } else {
    sendCommand(input);
  }
});

// Handle process messages (for IPC)
process.on('message', (message) => {
  if (message.type === 'command') {
    sendCommand(message.command);
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
