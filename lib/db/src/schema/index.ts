import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const userDataTable = pgTable("user_data", {
  userId: text("user_id").primaryKey(),
  data: jsonb("data").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
