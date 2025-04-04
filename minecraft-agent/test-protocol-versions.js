#!/usr/bin/env node

/**
 * Minecraft Bedrock Protocol Version Tester
 * 
 * This script tests different protocol versions to find which one works with your server.
 * It helps identify the correct protocol version to use for connecting to your Minecraft Bedrock server.
 */

import { createSocket } from 'dgram';
import { randomBytes } from 'crypto';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Configuration
const config = {
  host: process.env.MINECRAFT_HOST || '147.135.41.229',
  port: process.env.MINECRAFT_PORT ? parseInt(process.env.MINECRAFT_PORT) : 25565,
  username: process.env.MINECRAFT_USERNAME || 'ProtocolTester',
  timeout: 5000, // Timeout in milliseconds
  protocolVersions: [
    // List of protocol versions to test, from newest to oldest
    // Minecraft Bedrock 1.21.x
    594, 589, 582, 575, 573, 568, 567, 
    // Minecraft Bedrock 1.20.x
    662, 622, 618, 594, 589, 582, 575, 573, 568, 567, 
    // Minecraft Bedrock 1.19.x
    554, 544, 534, 527, 524, 503, 486, 475, 465, 448, 440, 431, 428, 419, 408, 407, 
    // Minecraft Bedrock 1.18.x
    503, 486, 475, 465, 448, 440, 431, 428, 419, 408, 407, 
    // Minecraft Bedrock 1.17.x
    440, 431, 428, 419, 408, 407, 
    // Minecraft Bedrock 1.16.x
    407, 390, 389, 388, 387, 386, 385, 384, 354, 
    // Minecraft Bedrock 1.14.x - 1.15.x
    354, 340, 332, 313, 
    // Minecraft Bedrock 1.13.x
    313, 291, 290, 
    // Minecraft Bedrock 1.12.x
    291, 290, 282, 281, 274, 
    // Minecraft Bedrock 1.11.x
    282, 281, 274, 
    // Minecraft Bedrock 1.10.x
    274, 261, 260, 
    // Minecraft Bedrock 1.9.x
    261, 260, 223, 
    // Minecraft Bedrock 1.8.x
    223, 201, 
    // Minecraft Bedrock 1.7.x
    201, 191, 
    // Minecraft Bedrock 1.6.x
    191, 160, 
    // Minecraft Bedrock 1.5.x
    160, 141, 
    // Minecraft Bedrock 1.4.x
    141, 137, 
    // Minecraft Bedrock 1.2.x
    137, 113, 
    // Minecraft Bedrock 1.1.x
    113, 112, 111, 110, 109, 108, 107, 106, 105, 104, 103, 102, 101, 100, 
    // Minecraft Bedrock 1.0.x
    100, 91, 90, 
    // Minecraft Pocket Edition
    90, 70, 60, 39, 38, 37, 36, 35, 34, 33, 32, 31, 30, 29, 28, 27, 26, 25, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7
  ]
};

// Main function
async function main() {
  printHeader();
  
  try {
    await pingServer();
    await testProtocolVersions();
  } catch (error) {
    console.error(`${colors.red}${colors.bright}Error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Print header
function printHeader() {
  console.log(`
${colors.cyan}${colors.bright}===============================================
    MINECRAFT BEDROCK PROTOCOL VERSION TESTER
===============================================${colors.reset}

This script will test different protocol versions to find
which one works with your Minecraft Bedrock server.

Server: ${colors.bright}${config.host}:${config.port}${colors.reset}
`);
}

// Ping the server to check if it's online
function pingServer() {
  return new Promise((resolve, reject) => {
    console.log(`${colors.bright}Pinging server at ${config.host}:${config.port}...${colors.reset}`);
    
    const socket = createSocket('udp4');
    const pingId = Buffer.from(randomBytes(2)).readUInt16BE(0);
    
    // Create unconnected ping packet
    const packet = Buffer.alloc(1500);
    let offset = 0;
    
    packet.writeUInt8(0x01, offset++); // Packet ID: Unconnected Ping
    packet.writeUInt32BE(Date.now() & 0xFFFFFFFF, offset); // Time
    offset += 4;
    packet.writeUInt32BE(0, offset); // Time (high bits, always 0)
    offset += 4;
    
    // Magic
    const magic = Buffer.from([0x00, 0xff, 0xff, 0x00, 0xfe, 0xfe, 0xfe, 0xfe, 0xfd, 0xfd, 0xfd, 0xfd, 0x12, 0x34, 0x56, 0x78]);
    magic.copy(packet, offset);
    offset += 16;
    
    // Ping ID
    packet.writeUInt16BE(pingId, offset);
    offset += 2;
    
    const finalPacket = packet.slice(0, offset);
    
    // Set up timeout
    const timeout = setTimeout(() => {
      socket.close();
      reject(new Error('Timeout waiting for ping response'));
    }, config.timeout);
    
    // Set up message handler
    socket.on('message', (msg, rinfo) => {
      clearTimeout(timeout);
      
      if (msg.length < 35) {
        socket.close();
        reject(new Error('Invalid ping response (too short)'));
        return;
      }
      
      if (msg.readUInt8(0) !== 0x1c) {
        socket.close();
        reject(new Error(`Invalid ping response (expected 0x1c, got 0x${msg.readUInt8(0).toString(16)})`));
        return;
      }
      
      const responsePingId = msg.readUInt16BE(25);
      if (responsePingId !== pingId) {
        socket.close();
        reject(new Error(`Invalid ping response (expected ping ID ${pingId}, got ${responsePingId})`));
        return;
      }
      
      // Try to extract server info
      try {
        // Skip the first 35 bytes (header + magic + ping ID + string length)
        const serverInfo = msg.slice(35).toString('utf8');
        const parts = serverInfo.split(';');
        
        if (parts.length >= 4) {
          const version = parts[3];
          console.log(`${colors.green}✓ Server is online!${colors.reset}`);
          console.log(`${colors.green}✓ Server version: ${version}${colors.reset}`);
          
          // Try to extract protocol version from server info
          if (parts.length >= 8) {
            const protocolVersion = parseInt(parts[7]);
            if (!isNaN(protocolVersion)) {
              console.log(`${colors.green}✓ Server protocol version: ${protocolVersion}${colors.reset}`);
            }
          }
        } else {
          console.log(`${colors.green}✓ Server is online!${colors.reset}`);
          console.log(`${colors.yellow}⚠ Could not parse server info: ${serverInfo}${colors.reset}`);
        }
      } catch (error) {
        console.log(`${colors.green}✓ Server is online!${colors.reset}`);
        console.log(`${colors.yellow}⚠ Could not parse server info: ${error.message}${colors.reset}`);
        
        // Try to extract version from binary data
        const dataStr = msg.toString('hex');
        const versionMatch = dataStr.match(/312e32312e3731/); // "1.21.71" in hex
        if (versionMatch) {
          console.log(`${colors.green}✓ Detected server version: 1.21.71${colors.reset}`);
        }
      }
      
      socket.close();
      resolve();
    });
    
    // Set up error handler
    socket.on('error', (err) => {
      clearTimeout(timeout);
      socket.close();
      reject(err);
    });
    
    // Send the packet
    socket.send(finalPacket, 0, offset, config.port, config.host, (err) => {
      if (err) {
        clearTimeout(timeout);
        socket.close();
        reject(err);
      }
    });
  });
}

// Test different protocol versions
async function testProtocolVersions() {
  console.log(`\n${colors.bright}Testing protocol versions...${colors.reset}`);
  console.log(`${colors.yellow}This may take some time. Testing ${config.protocolVersions.length} different protocol versions.${colors.reset}\n`);
  
  const results = [];
  
  for (const protocolVersion of config.protocolVersions) {
    try {
      console.log(`Testing protocol version ${protocolVersion}...`);
      const result = await testProtocolVersion(protocolVersion);
      results.push({ protocolVersion, success: true, result });
      
      console.log(`${colors.green}✓ Protocol version ${protocolVersion} works!${colors.reset}`);
      console.log(`${colors.green}✓ Successfully connected to the server.${colors.reset}`);
      
      // If we found a working version, we can stop
      break;
    } catch (error) {
      results.push({ protocolVersion, success: false, error: error.message });
      console.log(`${colors.red}✗ Protocol version ${protocolVersion} failed: ${error.message}${colors.reset}`);
    }
  }
  
  // Print summary
  console.log(`\n${colors.bright}Protocol Version Test Results:${colors.reset}`);
  
  const successfulVersions = results.filter(r => r.success);
  if (successfulVersions.length > 0) {
    console.log(`\n${colors.green}${colors.bright}Working Protocol Versions:${colors.reset}`);
    successfulVersions.forEach(r => {
      console.log(`${colors.green}✓ Protocol version ${r.protocolVersion}${colors.reset}`);
    });
    
    console.log(`\n${colors.bright}To use this protocol version, update your configuration:${colors.reset}`);
    console.log(`
const config = {
  host: '${config.host}',
  port: ${config.port},
  username: 'YourUsername',
  offline: true,
  version: '1.21.71', // Your server version
  protocolVersion: ${successfulVersions[0].protocolVersion} // Use this protocol version
};
`);
  } else {
    console.log(`\n${colors.red}${colors.bright}No working protocol versions found.${colors.reset}`);
    console.log(`${colors.yellow}
Possible reasons:
1. The server is blocking connections from unauthorized clients
2. The server requires authentication
3. The server is using a protocol version not included in the test
4. There are firewall rules blocking the connection
${colors.reset}`);
  }
}

// Test a specific protocol version
function testProtocolVersion(protocolVersion) {
  return new Promise((resolve, reject) => {
    const socket = createSocket('udp4');
    
    // Create open connection request packet
    const packet = Buffer.alloc(1500);
    let offset = 0;
    
    packet.writeUInt8(0x05, offset++); // Packet ID: Open Connection Request 1
    
    // Magic
    const magic = Buffer.from([0x00, 0xff, 0xff, 0x00, 0xfe, 0xfe, 0xfe, 0xfe, 0xfd, 0xfd, 0xfd, 0xfd, 0x12, 0x34, 0x56, 0x78]);
    magic.copy(packet, offset);
    offset += 16;
    
    // Protocol version
    packet.writeUInt8(protocolVersion, offset++);
    
    // Padding (MTU size discovery)
    const padding = Buffer.alloc(1472 - offset);
    padding.copy(packet, offset);
    offset += padding.length;
    
    const finalPacket = packet.slice(0, offset);
    
    // Set up timeout
    const timeout = setTimeout(() => {
      socket.close();
      reject(new Error('Timeout waiting for response'));
    }, config.timeout);
    
    // Set up message handler
    socket.on('message', (msg, rinfo) => {
      clearTimeout(timeout);
      
      if (msg.length < 20) {
        socket.close();
        reject(new Error('Invalid response (too short)'));
        return;
      }
      
      if (msg.readUInt8(0) !== 0x06) {
        socket.close();
        reject(new Error(`Invalid response (expected 0x06, got 0x${msg.readUInt8(0).toString(16)})`));
        return;
      }
      
      socket.close();
      resolve('Success');
    });
    
    // Set up error handler
    socket.on('error', (err) => {
      clearTimeout(timeout);
      socket.close();
      reject(err);
    });
    
    // Send the packet
    socket.send(finalPacket, 0, offset, config.port, config.host, (err) => {
      if (err) {
        clearTimeout(timeout);
        socket.close();
        reject(err);
      }
    });
  });
}

// Run the main function
main();
