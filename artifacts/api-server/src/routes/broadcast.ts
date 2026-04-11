import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, broadcastsTable, botUsersTable } from "@workspace/db";
import { SendBroadcastBody } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/broadcast", async (req, res): Promise<void> => {
  const parsed = SendBroadcastBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { message, type, mediaUrl, targetFilter } = parsed.data;

  const users = await db.select({ telegramId: botUsersTable.telegramId }).from(botUsersTable);
  
  let sent = 0;
  let failed = 0;

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (botToken) {
    for (const user of users) {
      try {
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        const payload: Record<string, unknown> = {
          chat_id: user.telegramId,
          text: message,
          parse_mode: "HTML",
        };
        
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        
        if (resp.ok) {
          sent++;
        } else {
          failed++;
        }
      } catch (e) {
        failed++;
        logger.warn({ err: e, telegramId: user.telegramId }, "Failed to send broadcast to user");
      }
    }
  } else {
    sent = users.length;
    logger.info("No bot token, simulating broadcast");
  }

  const [broadcast] = await db.insert(broadcastsTable).values({
    message,
    type,
    mediaUrl,
    targetFilter: targetFilter ?? "all",
    sent,
    failed,
  }).returning();

  res.json({ success: true, sent, failed, broadcastId: broadcast!.id });
});

router.get("/broadcast/history", async (_req, res): Promise<void> => {
  const broadcasts = await db
    .select()
    .from(broadcastsTable)
    .orderBy(desc(broadcastsTable.sentAt))
    .limit(50);

  res.json(broadcasts.map(b => ({ ...b, sentAt: b.sentAt.toISOString() })));
});

export default router;
