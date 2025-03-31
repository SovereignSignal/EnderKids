import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { insertUserSchema, insertAgentSchema, insertCommandSchema, type Agent } from "@shared/schema";
import { createId } from "@paralleldrive/cuid2";
import { z } from "zod";
import MemoryStore from "memorystore";
import { WebSocketServer, WebSocket } from "ws";
import { minecraftConnector } from "./minecraft";

// Initialize express-session store
const SessionStore = MemoryStore(session);

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "minecraft-agent-secret",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: process.env.NODE_ENV === "production", maxAge: 24 * 60 * 60 * 1000 },
      store: new SessionStore({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
    })
  );

  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport
  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          
          if (!user) {
            return done(null, false, { message: "Invalid email or password" });
          }
          
          // In a real app, you would check the password hash
          if (user.password !== password) {
            return done(null, false, { message: "Invalid email or password" });
          }
          
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // Serialize and deserialize user
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Auth middleware
  const isAuthenticated = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };

  const isAdmin = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated() && (req.user as any).isAdmin) {
      return next();
    }
    res.status(403).json({ message: "Forbidden" });
  };

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }
      
      // Create user
      const user = await storage.createUser(userData);
      
      // Auto-login after registration
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Error during login" });
        }
        return res.status(201).json({ id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      req.login(user, (err: any) => {
        if (err) {
          return next(err);
        }
        return res.json({ id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Error during logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/session", (req, res) => {
    if (req.isAuthenticated()) {
      const user = req.user as any;
      return res.json({ id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin });
    }
    res.status(401).json({ message: "Not authenticated" });
  });

  // Agent routes
  app.post("/api/agents", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const agentData = insertAgentSchema.parse({ ...req.body, userId });
      
      const agent = await storage.createAgent(agentData);
      res.status(201).json(agent);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/agents", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const agents = await storage.getAgentsByUserId(userId);
      res.json(agents);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/agents/pending", isAdmin, async (req, res) => {
    try {
      const agents = await storage.getAllPendingAgents();
      res.json(agents);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/agents/:id", isAuthenticated, async (req, res) => {
    try {
      const agentId = parseInt(req.params.id);
      const agent = await storage.getAgentById(agentId);
      
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      
      const userId = (req.user as any).id;
      const isAdmin = (req.user as any).isAdmin;
      
      // Check if user owns agent or is admin
      if (agent.userId !== userId && !isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      res.json(agent);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Connect agent to Minecraft
  app.post("/api/agents/:id/connect", isAuthenticated, async (req, res) => {
    try {
      const agentId = parseInt(req.params.id);
      const agent = await storage.getAgentById(agentId);
      
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      
      const userId = (req.user as any).id;
      const isAdmin = (req.user as any).isAdmin;
      
      // Check if user owns agent or is admin
      if (agent.userId !== userId && !isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Check if agent is active
      if (agent.status !== "active") {
        return res.status(400).json({ message: "Agent must be active to connect" });
      }
      
      // Connect to Minecraft
      const connected = await minecraftConnector.connectAgent(agentId, agent.name);
      
      if (!connected) {
        return res.status(500).json({ message: "Failed to connect agent to Minecraft" });
      }
      
      // Get agent status
      const status = minecraftConnector.getAgentStatus(agentId);
      
      // Broadcast the updated agent status to all connected clients
      broadcastAgentStatus(agentId);
      
      res.json({
        id: agent.id,
        name: agent.name,
        connected: status.connected,
        currentWorld: status.world,
        position: status.position
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/agents/:id/status", isAdmin, async (req, res) => {
    try {
      const agentId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status || !["pending", "active", "inactive"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      // Get agent before update
      const existingAgent = await storage.getAgentById(agentId);
      if (!existingAgent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      
      // Update agent status in database
      const agent = await storage.updateAgentStatus(agentId, status);
      
      // Handle Minecraft connection based on status change
      if (status === "active" && existingAgent.status !== "active") {
        // Connect to Minecraft when agent is activated
        const connected = await minecraftConnector.connectAgent(agentId, agent?.name || `Agent_${agentId}`);
        if (!connected) {
          // If connection fails, log it but don't fail the request
          console.warn(`Failed to connect agent ${agentId} to Minecraft server`);
        } else {
          // Broadcast updated status
          broadcastAgentStatus(agentId);
        }
      } else if (status === "inactive" && existingAgent.status === "active") {
        // Disconnect from Minecraft when agent is deactivated
        await minecraftConnector.disconnectAgent(agentId);
        // Broadcast updated status
        broadcastAgentStatus(agentId);
      }
      
      res.json(agent);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Command routes
  app.post("/api/commands", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const isAdmin = (req.user as any).isAdmin;
      
      const { agentId, command } = req.body;
      const agentIdNum = parseInt(agentId);
      
      // Check if agent exists
      const agent = await storage.getAgentById(agentIdNum);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      
      // Check if user owns agent or is admin
      if (agent.userId !== userId && !isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Check if agent is active
      if (agent.status !== "active") {
        return res.status(400).json({ message: "Agent is not active" });
      }
      
      const commandData = insertCommandSchema.parse({
        agentId: agentIdNum,
        userId,
        command
      });
      
      // Create command in database
      const createdCommand = await storage.createCommand(commandData);

      // Send command to Minecraft server
      const result = await minecraftConnector.sendCommand(agentIdNum, command);
      
      // Update the command with the response
      createdCommand.response = result.message;
      
      // Broadcast the agent status update to all connected clients
      broadcastAgentStatus(agentIdNum);
      
      // Return the command with the response
      res.status(201).json(createdCommand);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/commands/agent/:agentId", isAuthenticated, async (req, res) => {
    try {
      const agentId = parseInt(req.params.agentId);
      const userId = (req.user as any).id;
      const isAdmin = (req.user as any).isAdmin;
      
      // Check if agent exists
      const agent = await storage.getAgentById(agentId);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      
      // Check if user owns agent or is admin
      if (agent.userId !== userId && !isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const commands = await storage.getCommandsByAgentId(agentId);
      res.json(commands);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Stats route
  app.get("/api/stats", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const isAdmin = (req.user as any).isAdmin;
      
      // Get user's agents
      const userAgents = await storage.getAgentsByUserId(userId);
      
      // Count active agents
      const activeAgents = userAgents.filter(agent => agent.status === "active").length;
      
      // Count pending agents if admin
      let pendingRequests = 0;
      if (isAdmin) {
        const pendingAgents = await storage.getAllPendingAgents();
        pendingRequests = pendingAgents.length;
      } else {
        pendingRequests = userAgents.filter(agent => agent.status === "pending").length;
      }
      
      // Count total commands
      let totalCommands = 0;
      for (const agent of userAgents) {
        const agentCommands = await storage.getCommandsByAgentId(agent.id);
        totalCommands += agentCommands.length;
      }
      
      res.json({
        activeAgents,
        pendingRequests,
        totalCommands
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  
  // Set up WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Track active client connections
  const activeConnections = new Map<string, WebSocket>();
  
  wss.on('connection', (ws) => {
    const clientId = createId();
    activeConnections.set(clientId, ws);
    
    // Send initial connection success message
    ws.send(JSON.stringify({ 
      type: 'connection', 
      status: 'connected', 
      message: 'Connected to EnderKids WebSocket server',
      clientId
    }));
    
    // Handle client messages
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Respond to subscription requests for specific agents
        if (data.type === 'subscribe' && data.agentId) {
          ws.send(JSON.stringify({
            type: 'subscribed',
            agentId: data.agentId,
            message: `Subscribed to updates for agent ${data.agentId}`
          }));
          
          // Immediately get and send agent status
          const status = minecraftConnector.getAgentStatus(data.agentId);
          const onlineAgent = minecraftConnector.getOnlineAgent(data.agentId);
          
          ws.send(JSON.stringify({
            type: 'agent_status',
            agentId: data.agentId,
            status: {
              connected: status.connected,
              world: status.world,
              position: status.position,
              lastAction: onlineAgent?.lastCommand || (status.connected ? 'Idle' : 'Disconnected'),
              lastCommandResponse: onlineAgent?.lastCommandResponse || '',
              timeConnected: onlineAgent?.connectTime || null
            }
          }));
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });
    
    // Handle client disconnect
    ws.on('close', () => {
      activeConnections.delete(clientId);
    });
  });
  
  // Add a helper function to broadcast agent status updates
  // This can be called from other parts of the server when agent status changes
  const broadcastAgentStatus = (agentId: number) => {
    const status = minecraftConnector.getAgentStatus(agentId);
    const onlineAgent = minecraftConnector.getOnlineAgent(agentId);
    
    const message = JSON.stringify({
      type: 'agent_status',
      agentId,
      status: {
        connected: status.connected,
        world: status.world,
        position: status.position,
        lastAction: onlineAgent?.lastCommand || 'Idle',
        lastCommandResponse: onlineAgent?.lastCommandResponse || '',
        timeConnected: onlineAgent?.connectTime || null
      }
    });
    
    // Send to all active connections
    activeConnections.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  };

  // Add a new endpoint to get detailed agent status
  app.get("/api/agents/:id/status", isAuthenticated, async (req, res) => {
    try {
      const agentId = parseInt(req.params.id);
      const agent = await storage.getAgentById(agentId);
      
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      
      const userId = (req.user as any).id;
      const isAdmin = (req.user as any).isAdmin;
      
      // Check if user owns agent or is admin
      if (agent.userId !== userId && !isAdmin) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Get agent connection status from Minecraft connector
      const status = minecraftConnector.getAgentStatus(agentId);
      const onlineAgent = minecraftConnector.getOnlineAgent(agentId);
      
      res.json({
        id: agent.id,
        name: agent.name,
        type: agent.type,
        status: agent.status,
        connected: status.connected,
        currentWorld: status.world,
        position: status.position,
        lastCommand: onlineAgent?.lastCommand,
        lastCommandResponse: onlineAgent?.lastCommandResponse,
        connectTime: onlineAgent?.connectTime
      });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Get all connected agents (for dashboard)
  app.get("/api/agents/server/connected", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any).id;
      const isAdmin = (req.user as any).isAdmin;
      
      // Get all agents from the database that the user has access to
      const agents = isAdmin 
        ? await storage.getAllAgents()
        : await storage.getAgentsByUserId(userId);
      
      // Get their connection status
      const connectedAgents = agents
        .filter((agent: Agent) => agent.status === 'active')
        .map((agent: Agent) => {
          const status = minecraftConnector.getAgentStatus(agent.id);
          const onlineAgent = minecraftConnector.getOnlineAgent(agent.id);
          
          return {
            id: agent.id,
            name: agent.name,
            type: agent.type,
            connected: status.connected,
            world: status.world,
            position: status.position,
            lastCommand: onlineAgent?.lastCommand,
            lastCommandResponse: onlineAgent?.lastCommandResponse,
            connectTime: onlineAgent?.connectTime,
            currentActivity: onlineAgent?.lastCommand 
              ? `Executing: ${onlineAgent.lastCommand}` 
              : (status.connected ? 'Idle' : 'Not connected')
          };
        })
        .filter((agent: {connected: boolean}) => agent.connected);
      
      res.json(connectedAgents);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  return httpServer;
}
