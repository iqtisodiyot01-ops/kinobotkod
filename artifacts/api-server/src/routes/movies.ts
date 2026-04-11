import { Router, type IRouter } from "express";
import { eq, like, and, desc, sql } from "drizzle-orm";
import { db, moviesTable } from "@workspace/db";
import {
  ListMoviesQueryParams,
  CreateMovieBody,
  GetMovieParams,
  UpdateMovieParams,
  UpdateMovieBody,
  DeleteMovieParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/movies", async (req, res): Promise<void> => {
  const params = ListMoviesQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { page = 1, limit = 20, search, category, language } = params.data;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (search) conditions.push(like(moviesTable.title, `%${search}%`));
  if (category) conditions.push(eq(moviesTable.category, category));
  if (language) conditions.push(eq(moviesTable.language, language));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [movies, countResult] = await Promise.all([
    db.select().from(moviesTable).where(whereClause).orderBy(desc(moviesTable.createdAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(moviesTable).where(whereClause),
  ]);

  const total = Number(countResult[0]?.count ?? 0);
  res.json({
    movies: movies.map(m => ({ ...m, createdAt: m.createdAt.toISOString() })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

router.post("/movies", async (req, res): Promise<void> => {
  const parsed = CreateMovieBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [movie] = await db.insert(moviesTable).values(parsed.data).returning();
  res.status(201).json({ ...movie, createdAt: movie!.createdAt.toISOString() });
});

router.get("/movies/:id", async (req, res): Promise<void> => {
  const params = GetMovieParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [movie] = await db.select().from(moviesTable).where(eq(moviesTable.id, params.data.id));
  if (!movie) {
    res.status(404).json({ error: "Movie not found" });
    return;
  }
  res.json({ ...movie, createdAt: movie.createdAt.toISOString() });
});

router.put("/movies/:id", async (req, res): Promise<void> => {
  const params = UpdateMovieParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateMovieBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [movie] = await db
    .update(moviesTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(moviesTable.id, params.data.id))
    .returning();
  if (!movie) {
    res.status(404).json({ error: "Movie not found" });
    return;
  }
  res.json({ ...movie, createdAt: movie.createdAt.toISOString() });
});

router.delete("/movies/:id", async (req, res): Promise<void> => {
  const params = DeleteMovieParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [movie] = await db.delete(moviesTable).where(eq(moviesTable.id, params.data.id)).returning();
  if (!movie) {
    res.status(404).json({ error: "Movie not found" });
    return;
  }
  res.json({ success: true, message: "Movie deleted" });
});

router.post("/movies/:id/toggle-active", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [existing] = await db.select().from(moviesTable).where(eq(moviesTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Movie not found" });
    return;
  }
  const [movie] = await db
    .update(moviesTable)
    .set({ isActive: !existing.isActive, updatedAt: new Date() })
    .where(eq(moviesTable.id, id))
    .returning();
  res.json({ ...movie!, createdAt: movie!.createdAt.toISOString() });
});

export default router;
