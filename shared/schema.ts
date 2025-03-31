import { pgTable, text, serial, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  name: true,
  email: true,
  password: true,
  isAdmin: true,
});

// Agent status enum
export const agentStatusEnum = pgEnum("agent_status", ["pending", "active", "inactive"]);

// Agent type enum
export const agentTypeEnum = pgEnum("agent_type", ["builder", "miner", "farmer", "explorer"]);

// Agent schema
export const agents = pgTable("agents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull().default("pending"),
  description: text("description"),
  userId: integer("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastActive: timestamp("last_active"),
  avatarUrl: text("avatar_url"),
});

export const insertAgentSchema = createInsertSchema(agents).pick({
  name: true,
  type: true,
  description: true,
  userId: true,
});

// Command schema
export const commands = pgTable("commands", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").notNull().references(() => agents.id),
  userId: integer("user_id").notNull().references(() => users.id),
  command: text("command").notNull(),
  response: text("response"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCommandSchema = createInsertSchema(commands).pick({
  agentId: true,
  userId: true,
  command: true,
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = z.infer<typeof insertAgentSchema>;

export type Command = typeof commands.$inferSelect;
export type InsertCommand = z.infer<typeof insertCommandSchema>;
