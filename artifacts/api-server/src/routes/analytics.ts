import { Router, type IRouter } from "express";
import { desc, sql, gte } from "drizzle-orm";
import { db, botUsersTable, moviesTable, dailyStatsTable, movieRequestsTable } from "@workspace/db";
import { GetDailyStatsQueryParams, GetTopMoviesQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/analytics/summary", async (_req, res): Promise<void> => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(todayStart.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [
    totalUsersResult,
    totalMoviesResult,
    activeMoviesResult,
    totalRequestsResult,
    todayRequestsResult,
    todayNewUsersResult,
    weekUsersResult,
    prevWeekUsersResult,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(botUsersTable),
    db.select({ count: sql<number>`count(*)` }).from(moviesTable),
    db.select({ count: sql<number>`count(*)` }).from(moviesTable).where(sql`is_active = true`),
    db.select({ sum: sql<number>`COALESCE(sum(total_requests), 0)` }).from(botUsersTable),
    db.select({ count: sql<number>`count(*)` }).from(movieRequestsTable).where(gte(movieRequestsTable.requestedAt, todayStart)),
    db.select({ count: sql<number>`count(*)` }).from(botUsersTable).where(gte(botUsersTable.joinedAt, todayStart)),
    db.select({ count: sql<number>`count(*)` }).from(botUsersTable).where(gte(botUsersTable.joinedAt, weekAgo)),
    db.select({ count: sql<number>`count(*)` }).from(botUsersTable).where(sql`joined_at >= ${twoWeeksAgo.toISOString()} AND joined_at < ${weekAgo.toISOString()}`),
  ]);

  const totalUsers = Number(totalUsersResult[0]?.count ?? 0);
  const weekUsers = Number(weekUsersResult[0]?.count ?? 0);
  const prevWeekUsers = Number(prevWeekUsersResult[0]?.count ?? 0);
  const weeklyGrowth = prevWeekUsers > 0 ? ((weekUsers - prevWeekUsers) / prevWeekUsers) * 100 : 0;

  res.json({
    totalUsers,
    activeUsers: totalUsers,
    totalMovies: Number(totalMoviesResult[0]?.count ?? 0),
    activeMovies: Number(activeMoviesResult[0]?.count ?? 0),
    totalRequests: Number(totalRequestsResult[0]?.sum ?? 0),
    todayRequests: Number(todayRequestsResult[0]?.count ?? 0),
    todayNewUsers: Number(todayNewUsersResult[0]?.count ?? 0),
    weeklyGrowth: Math.round(weeklyGrowth * 10) / 10,
  });
});

router.get("/analytics/daily-stats", async (req, res): Promise<void> => {
  const params = GetDailyStatsQueryParams.safeParse(req.query);
  const days = params.success ? (params.data.days ?? 30) : 30;

  const stats = await db
    .select()
    .from(dailyStatsTable)
    .orderBy(desc(dailyStatsTable.date))
    .limit(days);

  res.json(stats.map(s => ({ date: s.date, newUsers: s.newUsers, requests: s.requests })).reverse());
});

router.get("/analytics/top-movies", async (req, res): Promise<void> => {
  const params = GetTopMoviesQueryParams.safeParse(req.query);
  const limit = params.success ? (params.data.limit ?? 10) : 10;

  const movies = await db
    .select({ id: moviesTable.id, title: moviesTable.title, views: moviesTable.views, category: moviesTable.category })
    .from(moviesTable)
    .orderBy(desc(moviesTable.views))
    .limit(limit);

  res.json(movies);
});

export default router;
