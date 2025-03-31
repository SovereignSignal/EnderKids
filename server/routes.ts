import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { insertUserSchema, insertAgentSchema, insertCommandSchema } from "@shared/schema";
import { createId } from "@paralleldrive/cuid2";
import { z } from "zod";
import MemoryStore from "memorystore";

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
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info.message || "Invalid credentials" });
      }
      req.login(user, (err) => {
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

  app.patch("/api/agents/:id/status", isAdmin, async (req, res) => {
    try {
      const agentId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status || !["pending", "active", "inactive"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const agent = await storage.updateAgentStatus(agentId, status);
      
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
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
      
      // Check if agent exists
      const agent = await storage.getAgentById(parseInt(agentId));
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
        agentId: parseInt(agentId),
        userId,
        command
      });
      
      const createdCommand = await storage.createCommand(commandData);

      // This is where we'd connect to the Minecraft API/library
      // For now, we'll just simulate a response
      let response;
      
      if (command.toLowerCase().includes("build")) {
        response = "Building at the current location...";
      } else if (command.toLowerCase().includes("mine")) {
        response = "Mining for resources...";
      } else if (command.toLowerCase().includes("come") || command.toLowerCase().includes("follow")) {
        response = "Coming to your location!";
      } else if (command.toLowerCase().includes("stop")) {
        response = "Stopping current action.";
      } else {
        response = "Command received. Processing...";
      }
      
      // Update the command with a response
      createdCommand.response = response;
      
      // In a real app, we'd save this update to storage
      
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

  return httpServer;
}
