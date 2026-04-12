import { Router, type IRouter } from "express";
import { eq, like, and, desc, sql } from "drizzle-orm";
import { db, botUsersTable } from "@workspace/db";
import { ListUsersQueryParams, GetUserParams, DeleteUserParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/users", async (req, res): Promise<void> => {
  const params = ListUsersQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const { page = 1, limit = 20, search, blocked } = params.data;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (search) conditions.push(like(botUsersTable.firstName, `%${search}%`));
  if (blocked !== undefined) conditions.push(eq(botUsersTable.isBlocked, blocked));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [users, countResult] = await Promise.all([
    db.select().from(botUsersTable).where(whereClause).orderBy(desc(botUsersTable.joinedAt)).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(botUsersTable).where(whereClause),
  ]);

  const total = Number(countResult[0]?.count ?? 0);
  res.json({
    users: users.map(u => ({ ...u, joinedAt: u.joinedAt.toISOString() })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

router.get("/users/:id", async (req, res): Promise<void> => {
  const params = GetUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [user] = await db.select().from(botUsersTable).where(eq(botUsersTable.id, params.data.id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ ...user, joinedAt: user.joinedAt.toISOString() });
});

router.delete("/users/:id", async (req, res): Promise<void> => {
  const params = DeleteUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [user] = await db.delete(botUsersTable).where(eq(botUsersTable.id, params.data.id)).returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ success: true, message: "User deleted" });
});

router.post("/users/:id/toggle-block", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [existing] = await db.select().from(botUsersTable).where(eq(botUsersTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const [user] = await db
    .update(botUsersTable)
    .set({ isBlocked: !existing.isBlocked })
    .where(eq(botUsersTable.id, id))
    .returning();
  res.json({ ...user!, joinedAt: user!.joinedAt.toISOString() });
});

export default router;
