import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, categoriesTable, moviesTable } from "@workspace/db";
import { CreateCategoryBody, DeleteCategoryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/categories", async (_req, res): Promise<void> => {
  const categories = await db
    .select({
      id: categoriesTable.id,
      name: categoriesTable.name,
      nameUz: categoriesTable.nameUz,
      movieCount: sql<number>`(SELECT COUNT(*) FROM movies WHERE movies.category = categories.name)`,
    })
    .from(categoriesTable)
    .orderBy(categoriesTable.name);

  res.json(categories);
});

router.post("/categories", async (req, res): Promise<void> => {
  const parsed = CreateCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [category] = await db.insert(categoriesTable).values(parsed.data).returning();
  res.status(201).json({ ...category, movieCount: 0 });
});

router.delete("/categories/:id", async (req, res): Promise<void> => {
  const params = DeleteCategoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [category] = await db.delete(categoriesTable).where(eq(categoriesTable.id, params.data.id)).returning();
  if (!category) {
    res.status(404).json({ error: "Category not found" });
    return;
  }
  res.json({ success: true, message: "Category deleted" });
});

export default router;
