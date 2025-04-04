#!/usr/bin/env node

/**
 * Xbox Live Authentication Setup for Minecraft Bedrock
 * 
 * This script helps set up Xbox Live authentication for connecting to a Minecraft Bedrock server.
 * It guides you through the process of obtaining the necessary authentication tokens.
 */

import { createInterface } from 'readline';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
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
    await checkDependencies();
    await setupAuthProject();
    await getCredentials();
    
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
    XBOX LIVE AUTHENTICATION SETUP
===============================================${colors.reset}

This script will help you set up Xbox Live authentication
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
  
  console.log('\nDependency check completed.\n');
}

// Set up authentication project
async function setupAuthProject() {
  console.log(`${colors.bright}Setting up authentication project...${colors.reset}\n`);
  
  // Create project directory if it doesn't exist
  const projectDir = './minecraft-auth';
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
      name: 'minecraft-auth',
      version: '1.0.0',
      type: 'module',
      description: 'Xbox Live authentication for Minecraft Bedrock',
      main: 'index.js',
      scripts: {
        start: 'node index.js'
      },
      dependencies: {
        'prismarine-auth': '^2.2.0'
      }
    };
    
    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log(`${colors.green}✓ Created package.json${colors.reset}`);
  } else {
    console.log(`${colors.green}✓ package.json already exists${colors.reset}`);
  }
  
  // Create authentication script
  const authScriptPath = join(projectDir, 'index.js');
  if (!existsSync(authScriptPath)) {
    const authScript = `// Xbox Live Authentication for Minecraft Bedrock
import { Authflow, Titles } from 'prismarine-auth';
import { writeFileSync } from 'fs';

// Replace these with your Microsoft account credentials
const email = 'YOUR_EMAIL@example.com';
const password = 'YOUR_PASSWORD';

async function getXboxToken() {
  try {
    console.log('Starting Xbox Live authentication...');
    
    // Create an Authflow instance
    const authflow = new Authflow(email, './auth', {
      password: password,
      authTitle: Titles.MinecraftBedrock,
      deviceType: 'Win32',
      doSisuAuth: true
    });
    
    console.log('Authenticating with Microsoft account...');
    
    // Get Xbox Live token
    const xboxToken = await authflow.getXboxToken();
    
    console.log('\\nAuthentication successful!');
    console.log('\\nXbox Live token obtained:');
    console.log('\\nToken Type:', xboxToken.token_type);
    console.log('User Hash:', xboxToken.user_hash.substring(0, 5) + '...');
    
    // Save token to file
    const tokenInfo = {
      userHash: xboxToken.user_hash,
      XSTSToken: xboxToken.XSTSToken,
      expiresOn: xboxToken.expiresOn
    };
    
    writeFileSync('./auth/token-info.json', JSON.stringify(tokenInfo, null, 2));
    console.log('\\nToken information saved to ./auth/token-info.json');
    
    console.log('\\nYou can now use this token to connect to a Minecraft Bedrock server.');
    console.log('\\nTo use this token in your Minecraft agent:');
    console.log(\`
const config = {
  host: '147.135.41.229',
  port: 25565,
  username: 'YourUsername',
  offline: false,
  auth: 'microsoft',
  xboxToken: {
    userHash: '\${xboxToken.user_hash}',
    XSTSToken: '\${xboxToken.XSTSToken}',
    expiresOn: '\${xboxToken.expiresOn}'
  }
};
\`);
    
  } catch (error) {
    console.error('Authentication failed:', error);
  }
}

getXboxToken();
`;
    
    writeFileSync(authScriptPath, authScript);
    console.log(`${colors.green}✓ Created authentication script${colors.reset}`);
  } else {
    console.log(`${colors.green}✓ Authentication script already exists${colors.reset}`);
  }
  
  // Create README.md
  const readmePath = join(projectDir, 'README.md');
  if (!existsSync(readmePath)) {
    const readme = `# Xbox Live Authentication for Minecraft Bedrock

This project helps you obtain Xbox Live authentication tokens for connecting to a Minecraft Bedrock server.

## Prerequisites

- Node.js (v16 or higher)
- npm
- Microsoft account with Minecraft Bedrock Edition

## Installation

1. Install dependencies:
   \`\`\`
   npm install
   \`\`\`

2. Edit \`index.js\` to add your Microsoft account credentials:
   \`\`\`javascript
   const email = 'YOUR_EMAIL@example.com';
   const password = 'YOUR_PASSWORD';
   \`\`\`

## Running the Authentication

\`\`\`
npm start
\`\`\`

This will:
1. Authenticate with your Microsoft account
2. Obtain an Xbox Live token
3. Save the token information to \`./auth/token-info.json\`
4. Display the token information and how to use it

## Using the Token

Once you have obtained the Xbox Live token, you can use it to connect to a Minecraft Bedrock server:

\`\`\`javascript
const config = {
  host: '147.135.41.229',
  port: 25565,
  username: 'YourUsername',
  offline: false,
  auth: 'microsoft',
  xboxToken: {
    userHash: 'YOUR_USER_HASH',
    XSTSToken: 'YOUR_XSTS_TOKEN',
    expiresOn: 'EXPIRATION_DATE'
  }
};
\`\`\`

## Security Warning

This script stores your Microsoft account credentials in plain text. This is not secure and should only be used for testing purposes. In a production environment, you should use a more secure authentication method.
`;
    
    writeFileSync(readmePath, readme);
    console.log(`${colors.green}✓ Created README.md${colors.reset}`);
  } else {
    console.log(`${colors.green}✓ README.md already exists${colors.reset}`);
  }
  
  console.log('\nAuthentication project setup completed.\n');
}

// Get Microsoft account credentials
async function getCredentials() {
  console.log(`${colors.bright}Microsoft Account Credentials${colors.reset}\n`);
  console.log(`${colors.yellow}⚠ Warning: Your credentials will be stored in plain text in the authentication script.${colors.reset}`);
  console.log(`${colors.yellow}⚠ This is not secure and should only be used for testing purposes.${colors.reset}\n`);
  
  const email = await askQuestion(`Enter your Microsoft account email: `);
  const password = await askQuestion(`Enter your Microsoft account password: `);
  
  if (email && password) {
    // Update the authentication script with the provided credentials
    const authScriptPath = join('./minecraft-auth', 'index.js');
    if (existsSync(authScriptPath)) {
      let authScript = await readFile(authScriptPath);
      
      // Replace the placeholder credentials with the provided ones
      authScript = authScript.replace(/const email = ['"]YOUR_EMAIL@example\.com['"];/, `const email = '${email}';`);
      authScript = authScript.replace(/const password = ['"]YOUR_PASSWORD['"];/, `const password = '${password}';`);
      
      writeFileSync(authScriptPath, authScript);
      console.log(`\n${colors.green}✓ Updated authentication script with your credentials${colors.reset}`);
    }
  } else {
    console.log(`\n${colors.yellow}⚠ No credentials provided. You will need to edit the authentication script manually.${colors.reset}`);
  }
}

// Print success message
function printSuccess() {
  console.log(`
${colors.green}${colors.bright}===============================================
       SETUP COMPLETED SUCCESSFULLY!
===============================================${colors.reset}

To obtain your Xbox Live authentication token:
${colors.cyan}
  cd minecraft-auth
  npm install
  npm start
${colors.reset}

This will:
1. Authenticate with your Microsoft account
2. Obtain an Xbox Live token
3. Save the token information to ./auth/token-info.json
4. Display the token information and how to use it

Once you have obtained the token, you can use it to connect to your Minecraft Bedrock server.

For more information, see:
${colors.cyan}
  - README.md in the minecraft-auth directory
  - MINECRAFT_SERVER_CONFIGURATION.md
  - REAL_MINECRAFT_IMPLEMENTATION.md
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

// Helper function to read a file
async function readFile(path) {
  try {
    const content = require('fs').readFileSync(path, 'utf8');
    return content;
  } catch (error) {
    throw error;
  }
}

// Run the main function
main();
