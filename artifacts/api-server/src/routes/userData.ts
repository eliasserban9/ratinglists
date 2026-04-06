import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { userDataTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

function requireAuth(req: any, res: any, next: any) {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.userId = userId;
  next();
}

router.get("/user-data", requireAuth, async (req: any, res) => {
  try {
    const [row] = await db
      .select()
      .from(userDataTable)
      .where(eq(userDataTable.userId, req.userId));
    if (!row) {
      return res.json({ lists: [], categories: [], standaloneItems: [], trash: [] });
    }
    res.json(row.data);
  } catch {
    res.status(500).json({ error: "Failed to load data" });
  }
});

router.put("/user-data", requireAuth, async (req: any, res) => {
  try {
    await db
      .insert(userDataTable)
      .values({ userId: req.userId, data: req.body, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: userDataTable.userId,
        set: { data: req.body, updatedAt: new Date() },
      });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to save data" });
  }
});

export default router;
