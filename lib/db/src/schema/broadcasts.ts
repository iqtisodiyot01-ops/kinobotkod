import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const broadcastsTable = pgTable("broadcasts", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  type: text("type").notNull().default("text"),
  mediaUrl: text("media_url"),
  targetFilter: text("target_filter").default("all"),
  sent: integer("sent").default(0).notNull(),
  failed: integer("failed").default(0).notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

export const insertBroadcastSchema = createInsertSchema(broadcastsTable).omit({ id: true, sentAt: true });
export type InsertBroadcast = z.infer<typeof insertBroadcastSchema>;
export type Broadcast = typeof broadcastsTable.$inferSelect;
