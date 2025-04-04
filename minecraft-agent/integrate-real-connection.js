#!/usr/bin/env node

/**
 * EnderKids Real Minecraft Connection Integration
 * 
 * This script helps integrate the real Minecraft Bedrock connection into the EnderKids platform.
 * It modifies the necessary files to replace the simulation with a real connection.
 */

import { createInterface } from 'readline';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

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

// Create readline interface for user input
const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

// Main function
async function main() {
  printHeader();
  
  try {
    await checkFiles();
    await getConfiguration();
    await modifyFiles();
    
    printSuccess();
  } catch (error) {
    console.error(`${colors.red}${colors.bright}Error: ${error.message}${colors.reset}`);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Print header
function printHeader() {
  console.log(`
${colors.cyan}${colors.bright}===============================================
  ENDERKIDS REAL MINECRAFT CONNECTION INTEGRATION
===============================================${colors.reset}

This script will help you integrate the real Minecraft Bedrock
connection into the EnderKids platform.

`);
}

// Check if the necessary files exist
async function checkFiles() {
  console.log(`${colors.bright}Checking files...${colors.reset}\n`);
  
  const requiredFiles = [
    '../server/minecraft.ts',
    '../server/config.ts',
    './simple-agent.js'
  ];
  
  for (const file of requiredFiles) {
    if (existsSync(file)) {
      console.log(`${colors.green}✓ Found ${file}${colors.reset}`);
    } else {
      console.log(`${colors.red}✗ Could not find ${file}${colors.reset}`);
      throw new Error(`Required file ${file} not found`);
    }
  }
  
  console.log('\nFile check completed.\n');
}

// Get configuration from user
async function getConfiguration() {
  console.log(`${colors.bright}Minecraft Server Configuration${colors.reset}\n`);
  
  const host = await askQuestion(`Enter Minecraft server host [147.135.41.229]: `);
  const port = await askQuestion(`Enter Minecraft server port [25565]: `);
  const version = await askQuestion(`Enter Minecraft server version [1.21.71]: `);
  const protocolVersion = await askQuestion(`Enter protocol version (from test-protocol-versions.js) [594]: `);
  const offlineMode = await askQuestion(`Use offline mode (no Xbox Live authentication)? (y/n) [y]: `);
  
  console.log(`\n${colors.bright}Configuration:${colors.reset}`);
  console.log(`Server Host: ${host || '147.135.41.229'}`);
  console.log(`Server Port: ${port || '25565'}`);
  console.log(`Server Version: ${version || '1.21.71'}`);
  console.log(`Protocol Version: ${protocolVersion || '594'}`);
  console.log(`Offline Mode: ${offlineMode.toLowerCase() !== 'n' ? 'Yes' : 'No'}`);
  
  // Store configuration for later use
  global.config = {
    host: host || '147.135.41.229',
    port: port || '25565',
    version: version || '1.21.71',
    protocolVersion: protocolVersion || '594',
    offlineMode: offlineMode.toLowerCase() !== 'n'
  };
  
  console.log('\nConfiguration completed.\n');
}

// Modify the necessary files
async function modifyFiles() {
  console.log(`${colors.bright}Modifying files...${colors.reset}\n`);
  
  // Modify server/config.ts
  await modifyConfigFile();
  
  // Modify server/minecraft.ts
  await modifyMinecraftFile();
  
  console.log('\nFile modifications completed.\n');
}

// Modify server/config.ts
async function modifyConfigFile() {
  console.log(`Modifying server/config.ts...`);
  
  try {
    const configPath = '../server/config.ts';
    let configContent = readFileSync(configPath, 'utf8');
    
    // Update the Minecraft configuration
    configContent = configContent.replace(
      /minecraft: \{[^}]*\}/s,
      `minecraft: {
    host: process.env.MINECRAFT_HOST || '${global.config.host}',
    port: process.env.MINECRAFT_PORT ? parseInt(process.env.MINECRAFT_PORT) : ${global.config.port},
    version: process.env.MINECRAFT_VERSION || '${global.config.version}',
    protocolVersion: process.env.MINECRAFT_PROTOCOL_VERSION ? parseInt(process.env.MINECRAFT_PROTOCOL_VERSION) : ${global.config.protocolVersion},
    gameMode: process.env.MINECRAFT_GAMEMODE || 'survival',
    auth: process.env.MINECRAFT_AUTH === 'true' || false,
    username: process.env.MINECRAFT_USERNAME || 'EnderKidsAgent',
    password: process.env.MINECRAFT_PASSWORD || '',
    useRealConnection: process.env.USE_REAL_MINECRAFT_CONNECTION === 'true' || true
  }`
    );
    
    writeFileSync(configPath, configContent);
    console.log(`${colors.green}✓ Updated server/config.ts${colors.reset}`);
  } catch (error) {
    console.log(`${colors.red}✗ Failed to modify server/config.ts: ${error.message}${colors.reset}`);
    throw error;
  }
}

// Modify server/minecraft.ts
async function modifyMinecraftFile() {
  console.log(`Modifying server/minecraft.ts...`);
  
  try {
    const minecraftPath = '../server/minecraft.ts';
    let minecraftContent = readFileSync(minecraftPath, 'utf8');
    
    // Update the BedrockClient constructor to use the configuration from config.ts
    minecraftContent = minecraftContent.replace(
      /const useRealConnection = process\.env\.USE_REAL_MINECRAFT_CONNECTION === 'true';/,
      `const useRealConnection = config.minecraft.useRealConnection;`
    );
    
    // Update the connectToRealServer method to use the protocol version
    minecraftContent = minecraftContent.replace(
      /const config = \{[^}]*\};/s,
      `const config = {
          host: '${this.host}',
          port: ${this.port},
          username: '${this.username}',
          offline: ${global.config.offlineMode},
          version: '${global.config.version}',
          protocolVersion: ${global.config.protocolVersion}
        };`
    );
    
    writeFileSync(minecraftPath, minecraftContent);
    console.log(`${colors.green}✓ Updated server/minecraft.ts${colors.reset}`);
  } catch (error) {
    console.log(`${colors.red}✗ Failed to modify server/minecraft.ts: ${error.message}${colors.reset}`);
    throw error;
  }
}

// Print success message
function printSuccess() {
  console.log(`
${colors.green}${colors.bright}===============================================
       INTEGRATION COMPLETED SUCCESSFULLY!
===============================================${colors.reset}

The EnderKids platform has been updated to use real Minecraft Bedrock connections.

To test the integration:
${colors.cyan}
  npm run build
  npm run dev
${colors.reset}

Then create a new agent and connect it to the Minecraft server.

For more information, see:
${colors.cyan}
  - MINECRAFT_SERVER_CONFIGURATION.md
  - REAL_MINECRAFT_IMPLEMENTATION.md
  - MINECRAFT_IMPLEMENTATION_NEXT_STEPS.md
${colors.reset}
`);
}

// Helper function to ask a question
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Run the main function
main();
