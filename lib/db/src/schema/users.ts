import { pgTable, serial, text, integer, boolean, timestamp, bigint } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const botUsersTable = pgTable("bot_users", {
  id: serial("id").primaryKey(),
  telegramId: bigint("telegram_id", { mode: "string" }).unique().notNull(),
  username: text("username"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  isBlocked: boolean("is_blocked").default(false).notNull(),
  referralCode: text("referral_code").unique(),
  referredBy: text("referred_by"),
  totalRequests: integer("total_requests").default(0).notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  lastActiveAt: timestamp("last_active_at").defaultNow(),
});

export const insertBotUserSchema = createInsertSchema(botUsersTable).omit({ id: true, joinedAt: true });
export type InsertBotUser = z.infer<typeof insertBotUserSchema>;
export type BotUser = typeof botUsersTable.$inferSelect;
