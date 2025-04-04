// Configuration for external services like Minecraft
export const config = {
  minecraft: {
    host: process.env.MINECRAFT_HOST || '147.135.41.229',
    port: process.env.MINECRAFT_PORT ? parseInt(process.env.MINECRAFT_PORT) : 25565,
    version: process.env.MINECRAFT_VERSION || 'bedrock',
    gameMode: process.env.MINECRAFT_GAMEMODE || 'survival',
    auth: process.env.MINECRAFT_AUTH === 'true' || false,
    username: process.env.MINECRAFT_USERNAME || 'EnderKidsAgent',
    password: process.env.MINECRAFT_PASSWORD || '',
  }
};
