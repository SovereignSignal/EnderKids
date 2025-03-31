import { agents, commands, users, type User, type InsertUser, type Agent, type InsertAgent, type Command, type InsertCommand } from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Agent operations
  createAgent(agent: InsertAgent): Promise<Agent>;
  getAgentsByUserId(userId: number): Promise<Agent[]>;
  getAgentById(id: number): Promise<Agent | undefined>;
  updateAgentStatus(id: number, status: string): Promise<Agent | undefined>;
  getAllPendingAgents(): Promise<Agent[]>;
  
  // Command operations
  createCommand(command: InsertCommand): Promise<Command>;
  getCommandsByAgentId(agentId: number): Promise<Command[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private agents: Map<number, Agent>;
  private commands: Map<number, Command>;
  private userIdCounter: number;
  private agentIdCounter: number;
  private commandIdCounter: number;

  constructor() {
    this.users = new Map();
    this.agents = new Map();
    this.commands = new Map();
    this.userIdCounter = 1;
    this.agentIdCounter = 1;
    this.commandIdCounter = 1;
    
    // Create an admin user by default
    this.createUser({
      name: "Admin",
      email: "menachem303@gmail.com",
      password: "admin123", // This would be hashed in production
      isAdmin: true
    }).then(adminUser => {
      // Create a sample pending agent for demo purposes
      this.createAgent({
        name: "BuilderBot1",
        type: "builder",
        description: "A builder agent for constructing houses and structures",
        userId: adminUser.id
      });
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const createdAt = new Date();
    // Ensure isAdmin is boolean
    const isAdmin = insertUser.isAdmin === undefined ? false : insertUser.isAdmin;
    const user: User = { ...insertUser, id, createdAt, isAdmin };
    this.users.set(id, user);
    return user;
  }

  // Agent operations
  async createAgent(insertAgent: InsertAgent): Promise<Agent> {
    const id = this.agentIdCounter++;
    const createdAt = new Date();
    // Ensure description is not undefined
    const description = insertAgent.description === undefined ? null : insertAgent.description;
    const agent: Agent = { 
      ...insertAgent, 
      id, 
      createdAt, 
      status: "pending",
      lastActive: null,
      avatarUrl: null,
      description
    };
    this.agents.set(id, agent);
    return agent;
  }

  async getAgentsByUserId(userId: number): Promise<Agent[]> {
    return Array.from(this.agents.values()).filter(
      (agent) => agent.userId === userId,
    );
  }

  async getAgentById(id: number): Promise<Agent | undefined> {
    return this.agents.get(id);
  }

  async updateAgentStatus(id: number, status: string): Promise<Agent | undefined> {
    const agent = this.agents.get(id);
    if (agent) {
      const updatedAgent = { ...agent, status };
      this.agents.set(id, updatedAgent);
      return updatedAgent;
    }
    return undefined;
  }

  async getAllPendingAgents(): Promise<Agent[]> {
    return Array.from(this.agents.values()).filter(
      (agent) => agent.status === "pending",
    );
  }

  // Command operations
  async createCommand(insertCommand: InsertCommand): Promise<Command> {
    const id = this.commandIdCounter++;
    const createdAt = new Date();
    const command: Command = { ...insertCommand, id, createdAt, response: null };
    this.commands.set(id, command);
    return command;
  }

  async getCommandsByAgentId(agentId: number): Promise<Command[]> {
    return Array.from(this.commands.values())
      .filter((command) => command.agentId === agentId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

export const storage = new MemStorage();
