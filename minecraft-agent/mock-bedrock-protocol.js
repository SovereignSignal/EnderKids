// Mock implementation of the bedrock-protocol library
// This is used when the real library can't be installed due to native dependencies

class MockClient {
  constructor(options) {
    this.options = options;
    this.connected = false;
    this.eventHandlers = {};
    
    console.log(`MockClient: Created client for ${options.username} to connect to ${options.host}:${options.port}`);
    
    // Simulate connection process
    setTimeout(() => {
      console.log(`MockClient: Connecting to ${options.host}:${options.port}...`);
      this.connected = true;
      
      // Trigger spawn event
      if (this.eventHandlers.spawn) {
        this.eventHandlers.spawn.forEach(handler => handler());
      }
      
      // Simulate position updates
      this.startPositionUpdates();
    }, 2000);
  }
  
  on(event, handler) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(handler);
    return this;
  }
  
  queue(packetName, params) {
    console.log(`MockClient: Sending ${packetName} packet:`, params);
    
    // Simulate receiving a response
    if (packetName === 'text' && this.eventHandlers.text) {
      setTimeout(() => {
        this.eventHandlers.text.forEach(handler => {
          handler({
            name: 'text',
            params: {
              message: `Response to: ${params.message}`,
              sender: 'Server'
            }
          });
        });
      }, 500);
    }
  }
  
  close() {
    console.log('MockClient: Closing connection');
    this.connected = false;
    
    // Trigger close event
    if (this.eventHandlers.close) {
      this.eventHandlers.close.forEach(handler => handler());
    }
  }
  
  startPositionUpdates() {
    // Simulate position updates
    let x = 0;
    let y = 64;
    let z = 0;
    
    const updateInterval = setInterval(() => {
      if (!this.connected) {
        clearInterval(updateInterval);
        return;
      }
      
      // Update position
      x += Math.random() * 2 - 1;
      z += Math.random() * 2 - 1;
      
      // Trigger move_player event
      if (this.eventHandlers.move_player) {
        this.eventHandlers.move_player.forEach(handler => {
          handler({
            name: 'move_player',
            params: {
              position: { x, y, z }
            }
          });
        });
      }
    }, 5000);
  }
}

export default {
  createClient: (options) => new MockClient(options)
};
