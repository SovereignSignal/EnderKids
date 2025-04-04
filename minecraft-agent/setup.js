#!/usr/bin/env node

/**
 * Minecraft Bedrock Agent Setup Script
 * 
 * This script helps set up the development environment for the Minecraft Bedrock agent.
 * It checks for required dependencies and guides the user through the setup process.
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline';

// Create readline interface for user input
const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

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

// Main function
async function main() {
  printHeader();
  
  try {
    await checkDependencies();
    await setupProject();
    await configureAgent();
    
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
       MINECRAFT BEDROCK AGENT SETUP
===============================================${colors.reset}

This script will help you set up the development environment
for connecting to a Minecraft Bedrock server.

`);
}

// Check for required dependencies
async function checkDependencies() {
  console.log(`${colors.bright}Checking dependencies...${colors.reset}\n`);
  
  // Check Node.js version
  try {
    const nodeVersion = execSync('node --version').toString().trim();
    console.log(`${colors.green}✓ Node.js ${nodeVersion}${colors.reset}`);
    
    // Check if version is >= 16
    const versionNumber = nodeVersion.replace('v', '').split('.')[0];
    if (parseInt(versionNumber) < 16) {
      console.log(`${colors.yellow}⚠ Warning: Node.js version 16 or higher is recommended.${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.red}✗ Node.js not found${colors.reset}`);
    throw new Error('Node.js is required. Please install it from https://nodejs.org/');
  }
  
  // Check npm
  try {
    const npmVersion = execSync('npm --version').toString().trim();
    console.log(`${colors.green}✓ npm ${npmVersion}${colors.reset}`);
  } catch (error) {
    console.log(`${colors.red}✗ npm not found${colors.reset}`);
    throw new Error('npm is required. It should be installed with Node.js.');
  }
  
  // Check CMake
  try {
    const cmakeVersion = execSync('cmake --version').toString().split('\n')[0];
    console.log(`${colors.green}✓ ${cmakeVersion}${colors.reset}`);
  } catch (error) {
    console.log(`${colors.red}✗ CMake not found${colors.reset}`);
    console.log(`${colors.yellow}
CMake is required to build native dependencies.
Please install it using your system's package manager:

macOS:    brew install cmake
Windows:  Download from https://cmake.org/download/
Linux:    sudo apt-get install cmake
${colors.reset}`);
    
    const answer = await askQuestion('Do you want to continue without CMake? (y/n) ');
    if (answer.toLowerCase() !== 'y') {
      throw new Error('Setup aborted. Please install CMake and try again.');
    }
  }
  
  // Check C++ build tools (platform-specific)
  if (process.platform === 'darwin') {
    try {
      execSync('xcode-select -p');
      console.log(`${colors.green}✓ Xcode Command Line Tools${colors.reset}`);
    } catch (error) {
      console.log(`${colors.yellow}⚠ Xcode Command Line Tools might not be installed.${colors.reset}`);
      console.log(`${colors.yellow}  Run 'xcode-select --install' to install them.${colors.reset}`);
    }
  } else if (process.platform === 'win32') {
    console.log(`${colors.yellow}⚠ Please ensure you have Visual Studio Build Tools installed.${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠ Please ensure you have build-essential installed.${colors.reset}`);
  }
  
  console.log('\nDependency check completed.\n');
}

// Set up project structure
async function setupProject() {
  console.log(`${colors.bright}Setting up project structure...${colors.reset}\n`);
  
  // Create project directory if it doesn't exist
  const projectDir = './minecraft-real-agent';
  if (!existsSync(projectDir)) {
    mkdirSync(projectDir, { recursive: true });
    console.log(`${colors.green}✓ Created project directory: ${projectDir}${colors.reset}`);
  } else {
    console.log(`${colors.green}✓ Project directory already exists: ${projectDir}${colors.reset}`);
  }
  
  // Create package.json
  const packageJsonPath = join(projectDir, 'package.json');
  if (!existsSync(packageJsonPath)) {
    const packageJson = {
      name: 'minecraft-real-agent',
      version: '1.0.0',
      type: 'module',
      description: 'A real Minecraft Bedrock agent that connects to a server',
      main: 'index.js',
      scripts: {
        start: 'node index.js'
      },
      dependencies: {
        'bedrock-protocol': '^3.44.0'
      }
    };
    
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log(`${colors.green}✓ Created package.json${colors.reset}`);
  } else {
    console.log(`${colors.green}✓ package.json already exists${colors.reset}`);
  }
  
  // Copy sample agent implementation
  const sampleAgentPath = join(projectDir, 'index.js');
  if (!existsSync(sampleAgentPath)) {
    try {
      const sampleContent = await readFile('./real-agent-sample.js');
      writeFileSync(sampleAgentPath, sampleContent);
      console.log(`${colors.green}✓ Created index.js with sample agent implementation${colors.reset}`);
    } catch (error) {
      // If we can't read the sample file, create a basic implementation
      const basicImplementation = `// Real Minecraft Bedrock Agent
import bedrock from 'bedrock-protocol';

// Configuration
const config = {
  host: '147.135.41.229',
  port: 25565,
  username: 'RealAgent',
  offline: true,
  version: '1.21.71'
};

console.log(\`Starting Minecraft Bedrock agent...\`);
console.log(\`Connecting to \${config.host}:\${config.port} as \${config.username}\`);

try {
  const client = bedrock.createClient(config);
  console.log('Client created, waiting for connection...');
  
  client.on('spawn', () => {
    console.log('Agent has spawned in the world!');
  });
  
  client.on('text', (packet) => {
    console.log(\`Received message: \${packet.params.message}\`);
  });
  
  client.on('error', (err) => {
    console.error(\`Error: \${err}\`);
  });
  
  client.on('close', () => {
    console.log('Connection closed');
    process.exit(0);
  });
  
  // Handle process termination
  process.on('SIGINT', () => {
    console.log('Disconnecting...');
    client.close();
    process.exit(0);
  });
} catch (error) {
  console.error(\`Failed to create client: \${error.message}\`);
  process.exit(1);
}
`;
      writeFileSync(sampleAgentPath, basicImplementation);
      console.log(`${colors.green}✓ Created index.js with basic agent implementation${colors.reset}`);
    }
  } else {
    console.log(`${colors.green}✓ index.js already exists${colors.reset}`);
  }
  
  // Create README.md
  const readmePath = join(projectDir, 'README.md');
  if (!existsSync(readmePath)) {
    const readme = `# Minecraft Bedrock Agent

This is a real Minecraft Bedrock agent that connects to a server.

## Prerequisites

- Node.js (v16 or higher)
- npm
- CMake (required for building native dependencies)

## Installation

1. Install dependencies:
   \`\`\`
   npm install
   \`\`\`

## Running the Agent

\`\`\`
npm start
\`\`\`

## Configuration

Edit the \`config\` object in \`index.js\` to update the server connection details:

\`\`\`javascript
const config = {
  host: '147.135.41.229',  // Your server IP
  port: 25565,             // Your server port
  username: 'RealAgent',   // The username to connect with
  offline: true,           // Use offline mode (no Xbox Live authentication)
  version: '1.21.71'       // Specify your server's version
};
\`\`\`
`;
    writeFileSync(readmePath, readme);
    console.log(`${colors.green}✓ Created README.md${colors.reset}`);
  } else {
    console.log(`${colors.green}✓ README.md already exists${colors.reset}`);
  }
  
  console.log('\nProject structure setup completed.\n');
}

// Configure agent
async function configureAgent() {
  console.log(`${colors.bright}Configuring agent...${colors.reset}\n`);
  
  const serverIp = await askQuestion(`Enter Minecraft server IP [147.135.41.229]: `);
  const serverPort = await askQuestion(`Enter Minecraft server port [25565]: `);
  const username = await askQuestion(`Enter agent username [RealAgent]: `);
  const offlineMode = await askQuestion(`Use offline mode (no Xbox Live authentication)? (y/n) [y]: `);
  
  console.log(`\n${colors.bright}Agent configuration:${colors.reset}`);
  console.log(`Server IP: ${serverIp || '147.135.41.229'}`);
  console.log(`Server Port: ${serverPort || '25565'}`);
  console.log(`Username: ${username || 'RealAgent'}`);
  console.log(`Offline Mode: ${offlineMode.toLowerCase() !== 'n' ? 'Yes' : 'No'}`);
  
  console.log(`\n${colors.yellow}To update the configuration, edit the config object in ./minecraft-real-agent/index.js${colors.reset}`);
  
  console.log('\nAgent configuration completed.\n');
}

// Print success message
function printSuccess() {
  console.log(`
${colors.green}${colors.bright}===============================================
       SETUP COMPLETED SUCCESSFULLY!
===============================================${colors.reset}

To start the agent:
${colors.cyan}
  cd minecraft-real-agent
  npm install
  npm start
${colors.reset}

For more information, see:
${colors.cyan}
  - README.md in the minecraft-real-agent directory
  - MINECRAFT_IMPLEMENTATION_NEXT_STEPS.md
  - REAL_MINECRAFT_IMPLEMENTATION.md
${colors.reset}

Happy mining!
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

// Helper function to read a file
function readFile(path) {
  return new Promise((resolve, reject) => {
    try {
      const content = require('fs').readFileSync(path, 'utf8');
      resolve(content);
    } catch (error) {
      reject(error);
    }
  });
}

// Run the main function
main();
