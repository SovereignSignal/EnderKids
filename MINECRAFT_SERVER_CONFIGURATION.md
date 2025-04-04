# Minecraft Bedrock Server Configuration Guide

This guide provides step-by-step instructions for configuring your Minecraft Bedrock server to accept connections from the EnderKids platform.

## Server Information

- **Server Address**: 147.135.41.229
- **Port**: 25565
- **Version**: 1.21.71 (detected)

## Apex Hosting Control Panel Configuration

To allow external connections from the EnderKids platform to your Minecraft Bedrock server, you need to configure several settings in your Apex Hosting control panel.

### 1. Enable External Connections

1. Log in to your Apex Hosting control panel
2. Navigate to the **Settings** or **Server Settings** section
3. Look for an option called **Allow External Connections** or **Enable External Connections**
4. Ensure this option is set to **Enabled** or **Yes**

### 2. Configure Authentication Mode

You have two options for authentication:

#### Option A: Allow Offline Mode (Easier)

1. In your server settings, look for **Online Mode** or **Authentication Mode**
2. Set this option to **Off** or **Offline Mode**
3. This allows connections without Xbox Live authentication

#### Option B: Use Xbox Live Authentication (More Secure)

1. Keep **Online Mode** set to **On**
2. You'll need to implement Xbox Live authentication in your EnderKids platform
3. Follow the Xbox Live authentication instructions in the `REAL_MINECRAFT_IMPLEMENTATION.md` guide

### 3. Configure Server Port

1. Verify that your server is using port **25565**
2. If you need to change the port, update it in both:
   - The Apex Hosting control panel
   - Your EnderKids platform configuration (`server/config.ts`)

### 4. Whitelist Configuration (Optional)

If you want to restrict which usernames can connect to your server:

1. Navigate to the **Whitelist** section in your control panel
2. Add the usernames that your EnderKids platform will use to connect
   - Example: `RealAgent`, `ExplorerBot`, etc.
3. Enable the whitelist feature

### 5. Firewall Settings

Ensure your server's firewall allows connections on the specified port:

1. In your control panel, look for **Firewall** or **Security** settings
2. Make sure port **25565** is open for both TCP and UDP traffic
3. If you're using a custom port, make sure that port is open instead

## Testing Your Configuration

After configuring your server, you can test the connection using the tools provided in the EnderKids platform:

1. Run the protocol version tester to find the correct protocol version:
   ```bash
   cd minecraft-agent
   ./test-protocol-versions.js
   ```

2. Update your configuration with the correct protocol version:
   ```javascript
   const config = {
     host: '147.135.41.229',
     port: 25565,
     username: 'YourUsername',
     offline: true,
     version: '1.21.71',
     protocolVersion: 594  // Use the protocol version identified by the tester
   };
   ```

3. Run the setup script to create a real agent:
   ```bash
   cd minecraft-agent
   ./setup.js
   ```

## Common Issues and Solutions

### Connection Timeout

If you're experiencing connection timeouts:

1. Verify that your server is online and running
2. Check that the port is correctly configured and open
3. Ensure your server allows connections from external clients
4. Try using a different protocol version

### Authentication Failure

If you're experiencing authentication failures:

1. If using offline mode, ensure **Online Mode** is set to **Off**
2. If using Xbox Live authentication, verify your authentication credentials
3. Check if your server has a whitelist enabled and ensure your username is on it

### Version Mismatch

If you're experiencing version mismatch issues:

1. Verify your server's Minecraft version
2. Update the `version` field in your configuration
3. Use the protocol version tester to find the correct protocol version

## Advanced Configuration

For advanced server configuration options, refer to the Minecraft Bedrock server documentation or contact Apex Hosting support.

## Next Steps

After configuring your server, return to the `MINECRAFT_IMPLEMENTATION_NEXT_STEPS.md` guide to continue implementing the real Minecraft connection in your EnderKids platform.
