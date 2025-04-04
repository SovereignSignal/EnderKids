# Real Minecraft Bedrock Server Connection Implementation Guide

This guide provides step-by-step instructions for implementing a real connection to your Minecraft Bedrock server at 147.135.41.229:25565.

## Prerequisites

- Node.js (v16 or higher)
- npm (Node.js package manager)
- CMake (required for building native dependencies)
- C++ build tools (Visual Studio Build Tools on Windows, Xcode Command Line Tools on macOS, or build-essential on Linux)

## Step 1: Set Up the Project

1. Create a new directory for your Minecraft agent:
   ```bash
   mkdir minecraft-real-agent
   cd minecraft-real-agent
   ```

2. Initialize a new Node.js project:
   ```bash
   npm init -y
   ```

3. Update the package.json file to use ES modules:
   ```json
   {
     "name": "minecraft-real-agent",
     "version": "1.0.0",
     "type": "module",
     "main": "index.js",
     "scripts": {
       "start": "node index.js"
     }
   }
   ```

## Step 2: Install Dependencies

Install the required dependencies:

```bash
npm install bedrock-protocol
```

This will install the `bedrock-protocol` library, which provides a JavaScript implementation of the Minecraft Bedrock protocol. It requires native dependencies that will be built during installation.

## Step 3: Create the Agent Script

Create a file named `index.js` with the following content:

```javascript
// Real Minecraft Bedrock Agent
// This script connects to a Minecraft Bedrock server using bedrock-protocol

import bedrock from 'bedrock-protocol';
import { createInterface } from 'readline';

// Configuration
const config = {
  host: '147.135.41.229',  // Your Apex Hosting server IP
  port: 25565,             // Your server port
  username: 'RealAgent',   // The username to connect with
  offline: true            // Use offline mode (no Xbox Live authentication)
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
  console.error(`Failed to create client: ${error.message}`);
  process.exit(1);
}

// Handle connection events
client.on('spawn', () => {
  console.log('Agent has spawned in the world!');
  agentState.connected = true;
  
  // Listen for position updates
  client.on('move_player', (packet) => {
    agentState.position = {
      x: packet.params.position.x,
      y: packet.params.position.y,
      z: packet.params.position.z
    };
    console.log(`Position updated: (${agentState.position.x.toFixed(2)}, ${agentState.position.y.toFixed(2)}, ${agentState.position.z.toFixed(2)})`);
  });
});

client.on('text', (packet) => {
  console.log(`Received message: ${packet.params.message}`);
});

client.on('error', (err) => {
  console.error(`Error: ${err}`);
});

client.on('close', () => {
  console.log('Connection closed');
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

// Handle process termination
process.on('SIGINT', () => {
  console.log('Disconnecting...');
  client.close();
  process.exit(0);
});

// Automatically run some commands after connection
setTimeout(() => {
  if (agentState.connected) {
    console.log('Starting exploration sequence...');
    
    const commands = [
      '/look around',
      '/move forward',
      '/explore',
      '/find resources',
      '/build shelter'
    ];
    
    let index = 0;
    
    const sendNextCommand = () => {
      if (index < commands.length) {
        sendCommand(commands[index]);
        index++;
        setTimeout(sendNextCommand, 5000);
      } else {
        console.log('Exploration sequence completed.');
      }
    };
    
    sendNextCommand();
  }
}, 10000);
```

## Step 4: Run the Agent

Run the agent with:

```bash
node index.js
```

The agent will:
1. Connect to your Minecraft Bedrock server
2. Spawn in the world
3. Execute a series of commands
4. Allow you to send additional commands via the console

## Troubleshooting

### Connection Issues

If you encounter connection issues:

1. **Server Authentication Mode**: Make sure your server allows connections from external clients. If your server requires Xbox Live authentication, you'll need to modify the config:
   ```javascript
   const config = {
     host: '147.135.41.229',
     port: 25565,
     username: 'RealAgent',
     offline: false,  // Set to false for Xbox Live authentication
     auth: 'microsoft' // Use Microsoft authentication
   };
   ```

2. **Firewall Settings**: Ensure your server's firewall allows connections on the specified port.

3. **Server Version**: Make sure the `bedrock-protocol` library supports your server's Minecraft version. You may need to specify the version in the config:
   ```javascript
   const config = {
     host: '147.135.41.229',
     port: 25565,
     username: 'RealAgent',
     offline: true,
     version: '1.21.71' // Specify your server's version
   };
   ```

### Build Errors

If you encounter build errors related to native dependencies:

1. **CMake Installation**: Make sure CMake is installed and in your PATH.
   ```bash
   cmake --version
   ```

2. **C++ Build Tools**: Ensure you have the necessary C++ build tools installed:
   - Windows: Install Visual Studio Build Tools
   - macOS: Install Xcode Command Line Tools (`xcode-select --install`)
   - Linux: Install build-essential (`sudo apt-get install build-essential`)

3. **Node.js Version**: Make sure you're using a compatible Node.js version (v16 or higher).

## Advanced Features

### Xbox Live Authentication

To use Xbox Live authentication:

1. Install additional dependencies:
   ```bash
   npm install prismarine-auth
   ```

2. Modify the connection code:
   ```javascript
   import { Authflow } from 'prismarine-auth';

   const auth = new Authflow('YourEmail@example.com', './auth', {
     password: 'YourPassword',
     authTitle: 'minecraft',
     deviceType: 'Win32'
   });

   const xboxToken = await auth.getXboxToken();
   
   const client = bedrock.createClient({
     host: '147.135.41.229',
     port: 25565,
     username: 'RealAgent',
     offline: false,
     auth: 'microsoft',
     xboxToken: xboxToken
   });
   ```

### Handling Game Events

You can listen for various game events:

```javascript
// Listen for block updates
client.on('update_block', (packet) => {
  console.log(`Block updated at (${packet.params.position.x}, ${packet.params.position.y}, ${packet.params.position.z})`);
});

// Listen for entity movement
client.on('move_entity', (packet) => {
  console.log(`Entity moved: ${packet.params.runtime_entity_id}`);
});

// Listen for inventory changes
client.on('inventory_content', (packet) => {
  console.log('Inventory updated');
});
```

### Automated Actions

You can automate actions based on game events:

```javascript
// Automatically respond to chat messages
client.on('text', (packet) => {
  const message = packet.params.message;
  const sender = packet.params.source_name;
  
  if (sender !== config.username && message.includes('hello')) {
    sendCommand(`Hello, ${sender}!`);
  }
});

// Automatically mine blocks when found
client.on('update_block', (packet) => {
  const blockPosition = packet.params.position;
  const blockType = packet.params.block_runtime_id;
  
  // If it's a valuable block (e.g., diamond ore)
  if (isValuableBlock(blockType)) {
    sendCommand(`/mine ${blockPosition.x} ${blockPosition.y} ${blockPosition.z}`);
  }
});
```

## Integration with EnderKids Platform

To integrate this real Minecraft connection with the EnderKids platform, you would need to:

1. Replace the simulated `BedrockClient` in `server/minecraft.ts` with a real implementation using the `bedrock-protocol` library.
2. Update the connection and command handling logic to use the real protocol.
3. Ensure the build process includes the necessary native dependencies.

This would allow the EnderKids platform to establish real connections to Minecraft Bedrock servers and control agents within the game.
