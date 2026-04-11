import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const botSettingsTable = pgTable("bot_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const botCommandsTable = pgTable("bot_commands", {
  id: serial("id").primaryKey(),
  command: text("command").notNull().unique(),
  description: text("description").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
});

export const insertBotSettingSchema = createInsertSchema(botSettingsTable).omit({ id: true, updatedAt: true });
export type InsertBotSetting = z.infer<typeof insertBotSettingSchema>;
export type BotSetting = typeof botSettingsTable.$inferSelect;

export const insertBotCommandSchema = createInsertSchema(botCommandsTable).omit({ id: true });
export type InsertBotCommand = z.infer<typeof insertBotCommandSchema>;
export type BotCommand = typeof botCommandsTable.$inferSelect;
