// Script to create a new user, give them an agent, and have the agent login to the server with a real connection
import { storage } from './server/storage.js';
import { minecraftConnector } from './server/minecraft.js';
import { config } from './server/config.js';

// Enable real Minecraft connections
process.env.USE_REAL_MINECRAFT_CONNECTION = 'true';

async function createUserAndRealAgent() {
  try {
    console.log('Creating a new user and agent with real Minecraft connection...');
    
    // Create a new user
    const userData = {
      name: "RealExplorer",
      email: "real-explorer@enderkids.com",
      password: "explorer123",
      isAdmin: false
    };
    
    console.log(`Creating new user: ${userData.name} (${userData.email})`);
    const user = await storage.createUser(userData);
    console.log(`User created with ID: ${user.id}`);
    
    // Create a new agent for the user
    const agentData = {
      name: 'RealExplorerAgent',
      type: 'explorer',
      description: 'An explorer agent that connects to the Minecraft Bedrock server to explore the world.',
      userId: user.id
    };
    
    console.log(`Creating new agent for user ${user.id}: ${agentData.name}`);
    const agent = await storage.createAgent(agentData);
    console.log(`Agent created with ID: ${agent.id}`);
    
    // Activate the agent (change status from 'pending' to 'active')
    console.log(`Activating agent ${agent.id}...`);
    const updatedAgent = await storage.updateAgentStatus(agent.id, 'active');
    console.log(`Agent status updated to: ${updatedAgent.status}`);
    
    // Connect the agent to the Minecraft server
    console.log(`Connecting agent ${agent.id} (${agent.name}) to Minecraft server at ${config.minecraft.host}:${config.minecraft.port}...`);
    console.log('Using REAL connection (not simulated)');
    const connected = await minecraftConnector.connectAgent(agent.id, agent.name);
    
    if (connected) {
      console.log('Agent connection initiated. Waiting for connection to establish...');
      
      // Wait for the connection to fully establish (10 seconds)
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Get agent status
      const status = minecraftConnector.getAgentStatus(agent.id);
      console.log('Agent connection status:', status);
      
      if (status.connected) {
        console.log('Agent successfully connected to Minecraft server!');
        
        // Start exploring the world
        console.log('Starting exploration...');
        
        // Send a series of commands to explore the world
        const commands = [
          '/look around',
          '/move forward',
          '/explore',
          '/find resources',
          '/build shelter'
        ];
        
        for (const command of commands) {
          console.log(`Sending command: ${command}`);
          const commandResult = await minecraftConnector.sendCommand(agent.id, command);
          console.log(`Command result: ${commandResult.message}`);
          
          // Wait a bit between commands
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
        console.log('Exploration started successfully!');
      } else {
        console.error('Agent is not fully connected yet. Please check server logs.');
      }
    } else {
      console.error('Failed to connect agent to Minecraft server.');
    }
    
    console.log('\nUser and agent creation completed.');
    console.log('\nUser credentials:');
    console.log(`Email: ${userData.email}`);
    console.log(`Password: ${userData.password}`);
    console.log('\nYou can now log in with these credentials and control the agent through the EnderKids platform.');
    
    // Keep the script running for a while to allow the agent to continue operating
    console.log('\nKeeping the agent connected for 60 seconds...');
    await new Promise(resolve => setTimeout(resolve, 60000));
    
    // Disconnect the agent
    console.log('Disconnecting agent...');
    await minecraftConnector.disconnectAgent(agent.id);
    
    console.log('Script completed.');
    process.exit(0);
  } catch (error) {
    console.error('Error creating user or agent:', error);
    process.exit(1);
  }
}

// Run the function
createUserAndRealAgent();
