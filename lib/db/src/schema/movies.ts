import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const moviesTable = pgTable("movies", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  titleUz: text("title_uz"),
  description: text("description"),
  year: integer("year"),
  language: text("language").default("uz"),
  category: text("category"),
  fileId: text("file_id").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  duration: integer("duration"),
  views: integer("views").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMovieSchema = createInsertSchema(moviesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMovie = z.infer<typeof insertMovieSchema>;
export type Movie = typeof moviesTable.$inferSelect;
