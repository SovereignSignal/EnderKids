// Test script for real Minecraft Bedrock connection
import { minecraftConnector } from './server/minecraft.js';
import { config } from './server/config.js';

console.log('Starting Minecraft Bedrock real connection test...');
console.log(`Attempting to connect to ${config.minecraft.host}:${config.minecraft.port}`);

// Set environment variable to enable real connections
process.env.USE_REAL_MINECRAFT_CONNECTION = 'true';

// Create a test agent
const testAgentId = 999;
const testAgentName = 'TestRealConnection';

async function runTest() {
  try {
    // Try to connect the agent
    console.log(`Connecting agent ${testAgentId} (${testAgentName})...`);
    const connected = await minecraftConnector.connectAgent(testAgentId, testAgentName);
    
    console.log(`Connection result: ${connected ? 'Success' : 'Failed'}`);
    
    // Wait a bit to allow connection events to process
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Check agent status
    const status = minecraftConnector.getAgentStatus(testAgentId);
    console.log('Agent status:', status);
    
    // Try sending a command if connected
    if (status.connected) {
      console.log('Sending test command...');
      const commandResult = await minecraftConnector.sendCommand(testAgentId, '/build test');
      console.log('Command result:', commandResult);
      
      // Wait a bit to see the response
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Disconnect the agent
    console.log('Disconnecting agent...');
    await minecraftConnector.disconnectAgent(testAgentId);
    
    // Wait a bit to allow disconnection to complete
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('Test completed.');
    process.exit(0);
  } catch (error) {
    console.error('Test failed with error:', error);
    process.exit(1);
  }
}

runTest();
