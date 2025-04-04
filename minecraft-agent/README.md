# Minecraft Bedrock Agent

This is a standalone agent that connects to a Minecraft Bedrock server and performs exploration actions.

## Prerequisites

- Node.js (v16 or higher)
- npm
- CMake (required for building native dependencies)

## Installation

1. Install dependencies:
   ```
   npm install
   ```

## Configuration

Edit the `index.js` file to update the configuration:

```javascript
const config = {
  host: '147.135.41.229',  // Your Apex Hosting server IP
  port: 25565,             // Your server port
  username: 'ExplorerBot', // The username to connect with
  offline: true            // Use offline mode (no Xbox Live authentication)
};
```

## Running the Agent

```
npm start
```

## What the Agent Does

1. Connects to the specified Minecraft Bedrock server
2. Spawns in the world
3. Executes a series of commands:
   - `/look around`
   - `/move forward 10`
   - `/explore`
   - `/find resources`
   - `/build shelter`
4. Disconnects after completing all commands

## Troubleshooting

### Connection Issues

- Make sure your Minecraft server allows connections from external clients
- Verify that the server IP and port are correct
- Check if the server allows offline mode connections (if offline: true)

### Build Errors

If you encounter build errors related to native dependencies:

1. Make sure CMake is installed:
   ```
   # On macOS
   brew install cmake
   
   # On Ubuntu/Debian
   sudo apt-get install cmake
   
   # On Windows
   # Install from https://cmake.org/download/
   ```

2. Install build tools:
   ```
   # On macOS
   xcode-select --install
   
   # On Ubuntu/Debian
   sudo apt-get install build-essential
   
   # On Windows
   npm install --global windows-build-tools
   ```

## Server Configuration

Your Minecraft Bedrock server may need specific settings to allow external connections:

1. Make sure the server is publicly accessible
2. Check if the server allows offline mode connections
3. Verify that the server port is open and properly forwarded
