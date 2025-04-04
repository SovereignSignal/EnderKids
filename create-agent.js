// Script to create and activate a Minecraft agent directly
import { storage } from './server/storage';
import { minecraftConnector } from './server/minecraft';

async function createAndActivateAgent() {
  try {
    console.log('Creating a new Minecraft agent...');
    
    // Get the admin user (should be user ID 1)
    const adminUser = await storage.getUser(1);
    
    if (!adminUser) {
      console.error('Admin user not found!');
      return;
    }
    
    console.log(`Found admin user: ${adminUser.name} (${adminUser.email})`);
    
    // Create a new agent
    const agentData = {
      name: 'BedrockAgent',
      type: 'builder',
      description: 'A builder agent that connects to the Minecraft Bedrock server to construct buildings and structures.',
      userId: adminUser.id
    };
    
    const agent = await storage.createAgent(agentData);
    console.log(`Agent created: ${agent.name} (ID: ${agent.id})`);
    
    // Activate the agent (change status from 'pending' to 'active')
    const updatedAgent = await storage.updateAgentStatus(agent.id, 'active');
    console.log(`Agent status updated to: ${updatedAgent.status}`);
    
    // Connect the agent to the Minecraft server
    console.log(`Connecting agent ${agent.id} (${agent.name}) to Minecraft server...`);
    const connected = await minecraftConnector.connectAgent(agent.id, agent.name);
    
    if (connected) {
      console.log('Agent connection initiated. Waiting for connection to establish...');
      
      // Wait for the connection to fully establish (3 seconds)
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Get agent status
      const status = minecraftConnector.getAgentStatus(agent.id);
      console.log('Agent connection status:', status);
      
      if (status.connected) {
        console.log('Agent successfully connected to Minecraft server!');
        
        // Send a test command
        console.log('Sending test command...');
        const commandResult = await minecraftConnector.sendCommand(agent.id, '/build house');
        console.log('Command result:', commandResult);
      } else {
        console.error('Agent is not fully connected yet. Please check server logs.');
      }
    } else {
      console.error('Failed to connect agent to Minecraft server.');
    }
    
    console.log('Agent creation and activation completed.');
  } catch (error) {
    console.error('Error creating or activating agent:', error);
  }
}

// Run the function
createAndActivateAgent();
