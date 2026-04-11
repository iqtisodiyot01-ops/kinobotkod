import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, botSettingsTable, botCommandsTable } from "@workspace/db";
import { UpdateBotSettingsBody, UpdateBotCommandsBody } from "@workspace/api-zod";

const router: IRouter = Router();

const DEFAULT_SETTINGS = {
  welcomeMessage: "Xush kelibsiz! Kino qidirish uchun nom yozing.",
  searchPrompt: "Qidirayotgan kinongiz nomini yozing:",
  notFoundMessage: "Kechirasiz, bu kino topilmadi.",
  requireChannelJoin: "false",
  channelUsername: "",
  referralEnabled: "true",
  referralBonus: "0",
  maintenanceMode: "false",
};

async function ensureDefaults() {
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    const existing = await db.select().from(botSettingsTable).where(eq(botSettingsTable.key, key));
    if (existing.length === 0) {
      await db.insert(botSettingsTable).values({ key, value });
    }
  }
}

router.get("/bot/settings", async (_req, res): Promise<void> => {
  await ensureDefaults();
  const settings = await db.select().from(botSettingsTable);
  const map: Record<string, string> = {};
  for (const s of settings) {
    map[s.key] = s.value;
  }
  res.json({
    welcomeMessage: map.welcomeMessage ?? DEFAULT_SETTINGS.welcomeMessage,
    searchPrompt: map.searchPrompt ?? DEFAULT_SETTINGS.searchPrompt,
    notFoundMessage: map.notFoundMessage ?? DEFAULT_SETTINGS.notFoundMessage,
    requireChannelJoin: map.requireChannelJoin === "true",
    channelUsername: map.channelUsername ?? "",
    referralEnabled: map.referralEnabled !== "false",
    referralBonus: parseInt(map.referralBonus ?? "0", 10),
    maintenanceMode: map.maintenanceMode === "true",
  });
});

router.put("/bot/settings", async (req, res): Promise<void> => {
  const parsed = UpdateBotSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, string> = {};
  if (parsed.data.welcomeMessage !== undefined) updates.welcomeMessage = parsed.data.welcomeMessage;
  if (parsed.data.searchPrompt !== undefined) updates.searchPrompt = parsed.data.searchPrompt;
  if (parsed.data.notFoundMessage !== undefined) updates.notFoundMessage = parsed.data.notFoundMessage;
  if (parsed.data.requireChannelJoin !== undefined) updates.requireChannelJoin = String(parsed.data.requireChannelJoin);
  if (parsed.data.channelUsername !== undefined) updates.channelUsername = parsed.data.channelUsername;
  if (parsed.data.referralEnabled !== undefined) updates.referralEnabled = String(parsed.data.referralEnabled);
  if (parsed.data.referralBonus !== undefined) updates.referralBonus = String(parsed.data.referralBonus);
  if (parsed.data.maintenanceMode !== undefined) updates.maintenanceMode = String(parsed.data.maintenanceMode);

  for (const [key, value] of Object.entries(updates)) {
    const existing = await db.select().from(botSettingsTable).where(eq(botSettingsTable.key, key));
    if (existing.length > 0) {
      await db.update(botSettingsTable).set({ value, updatedAt: new Date() }).where(eq(botSettingsTable.key, key));
    } else {
      await db.insert(botSettingsTable).values({ key, value });
    }
  }

  // Return updated settings
  const settings = await db.select().from(botSettingsTable);
  const map: Record<string, string> = {};
  for (const s of settings) map[s.key] = s.value;

  res.json({
    welcomeMessage: map.welcomeMessage ?? DEFAULT_SETTINGS.welcomeMessage,
    searchPrompt: map.searchPrompt ?? DEFAULT_SETTINGS.searchPrompt,
    notFoundMessage: map.notFoundMessage ?? DEFAULT_SETTINGS.notFoundMessage,
    requireChannelJoin: map.requireChannelJoin === "true",
    channelUsername: map.channelUsername ?? "",
    referralEnabled: map.referralEnabled !== "false",
    referralBonus: parseInt(map.referralBonus ?? "0", 10),
    maintenanceMode: map.maintenanceMode === "true",
  });
});

const DEFAULT_COMMANDS = [
  { command: "start", description: "Botni boshlash", enabled: true },
  { command: "search", description: "Kino qidirish", enabled: true },
  { command: "top", description: "Top kinolar", enabled: true },
  { command: "referral", description: "Referral havolasi", enabled: true },
  { command: "help", description: "Yordam", enabled: true },
];

async function ensureDefaultCommands() {
  const existing = await db.select().from(botCommandsTable);
  if (existing.length === 0) {
    await db.insert(botCommandsTable).values(DEFAULT_COMMANDS);
  }
}

router.get("/bot/commands", async (_req, res): Promise<void> => {
  await ensureDefaultCommands();
  const commands = await db.select().from(botCommandsTable).orderBy(botCommandsTable.id);
  res.json(commands);
});

router.put("/bot/commands", async (req, res): Promise<void> => {
  const parsed = UpdateBotCommandsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  for (const cmd of parsed.data.commands) {
    const existing = await db.select().from(botCommandsTable).where(eq(botCommandsTable.command, cmd.command));
    if (existing.length > 0) {
      await db.update(botCommandsTable).set({ description: cmd.description, enabled: cmd.enabled }).where(eq(botCommandsTable.command, cmd.command));
    } else {
      await db.insert(botCommandsTable).values(cmd);
    }
  }

  const commands = await db.select().from(botCommandsTable).orderBy(botCommandsTable.id);
  res.json(commands);
});

router.get("/bot/status", async (_req, res): Promise<void> => {
  res.json({
    running: true,
    uptime: process.uptime(),
    lastActivity: new Date().toISOString(),
    pendingUpdates: 0,
  });
});

export default router;
