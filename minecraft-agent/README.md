# Minecraft Bedrock Agent Tools

This directory contains tools and scripts for connecting to a Minecraft Bedrock server.

## Contents

- `setup.js` - Interactive setup script to help you get started
- `real-agent-sample.js` - Sample implementation of a real Minecraft Bedrock agent
- `mock-bedrock-protocol.js` - Mock implementation of the bedrock-protocol library (for development without native dependencies)
- `simple-agent.js` - Simple agent implementation using the mock protocol
- `demo-agent.js` - Demo agent implementation
- `test-protocol-versions.js` - Script to test different protocol versions with your Minecraft server
- `xbox-auth-setup.js` - Script to set up Xbox Live authentication for Minecraft Bedrock
- `connect.py`, `connect_fixed.py`, `connect_multi.py` - Python scripts for testing server connectivity

## Getting Started

### Option 1: Use the Setup Script (Recommended)

The setup script will guide you through the process of setting up a real Minecraft Bedrock agent:

```bash
# Make the script executable (if not already)
chmod +x setup.js

# Run the setup script
./setup.js
```

This will:
1. Check for required dependencies
2. Create a new project directory
3. Set up the project structure
4. Configure the agent

### Option 2: Manual Setup

1. Create a new directory for your agent:
   ```bash
   mkdir minecraft-real-agent
   cd minecraft-real-agent
   ```

2. Initialize a new Node.js project:
   ```bash
   npm init -y
   ```

3. Update package.json to use ES modules:
   ```json
   {
     "type": "module"
   }
   ```

4. Install dependencies:
   ```bash
   npm install bedrock-protocol
   ```

5. Copy the sample agent implementation:
   ```bash
   cp ../minecraft-agent/real-agent-sample.js index.js
   ```

6. Edit the configuration in index.js to match your server settings.

7. Run the agent:
   ```bash
   node index.js
   ```

## Troubleshooting

If you encounter issues with native dependencies:

1. Make sure you have CMake installed:
   ```bash
   cmake --version
   ```

2. Make sure you have the necessary build tools installed:
   - macOS: `xcode-select --install`
   - Windows: Visual Studio Build Tools
   - Linux: `sudo apt-get install build-essential`

3. If you still have issues, you can use the mock implementation for development:
   ```javascript
   // Import the mock implementation instead of the real one
   import bedrock from './mock-bedrock-protocol.js';
   ```

## Additional Resources

For more information, see:
- `REAL_MINECRAFT_IMPLEMENTATION.md` - Detailed guide on implementing a real connection
- `MINECRAFT_IMPLEMENTATION_NEXT_STEPS.md` - Next steps for implementation
- `MINECRAFT_INTEGRATION.md` - Information about the current simulation implementation
