import { pgTable, serial, integer, text, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const movieRequestsTable = pgTable("movie_requests", {
  id: serial("id").primaryKey(),
  movieId: integer("movie_id"),
  telegramId: text("telegram_id"),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
});

export const dailyStatsTable = pgTable("daily_stats", {
  id: serial("id").primaryKey(),
  date: date("date").notNull().unique(),
  newUsers: integer("new_users").default(0).notNull(),
  requests: integer("requests").default(0).notNull(),
});

export const insertMovieRequestSchema = createInsertSchema(movieRequestsTable).omit({ id: true, requestedAt: true });
export type InsertMovieRequest = z.infer<typeof insertMovieRequestSchema>;
export type MovieRequest = typeof movieRequestsTable.$inferSelect;

export const insertDailyStatSchema = createInsertSchema(dailyStatsTable).omit({ id: true });
export type InsertDailyStat = z.infer<typeof insertDailyStatSchema>;
export type DailyStat = typeof dailyStatsTable.$inferSelect;
