// Simple script to test the Minecraft Bedrock connection
import { minecraftConnector } from './server/minecraft';
import { config } from './server/config';

console.log('Starting Minecraft Bedrock connection test...');
console.log(`Attempting to connect to ${config.minecraft.host}:${config.minecraft.port}`);

// Create a test agent
const testAgentId = 999;
const testAgentName = 'TestConnectionAgent';

async function runTest() {
  try {
    // Try to connect the agent
    console.log(`Connecting agent ${testAgentId} (${testAgentName})...`);
    const connected = await minecraftConnector.connectAgent(testAgentId, testAgentName);
    
    console.log(`Connection result: ${connected ? 'Success' : 'Failed'}`);
    
    // Wait a bit to allow connection events to process
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check agent status
    const status = minecraftConnector.getAgentStatus(testAgentId);
    console.log('Agent status:', status);
    
    // Try sending a command if connected
    if (status.connected) {
      console.log('Sending test command...');
      const commandResult = await minecraftConnector.sendCommand(testAgentId, '/build test');
      console.log('Command result:', commandResult);
    }
    
    // Disconnect the agent
    console.log('Disconnecting agent...');
    await minecraftConnector.disconnectAgent(testAgentId);
    
    console.log('Test completed.');
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

runTest();
