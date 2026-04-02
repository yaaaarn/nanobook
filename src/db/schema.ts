import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const messagesTable = sqliteTable("messages", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  content: text("content").notNull(),
  createdAt: integer({ mode: "timestamp_ms" }).default(new Date()).notNull(),
  ipAddress: text("ip_address").notNull(),
  hidden: integer({ mode: "boolean" }).default(false).notNull(),
  extraFields: text({ mode: "json" })
    .$type<Record<string, string>>()
    .default({})
    .notNull(),
  reply: text({ mode: "json" }).$type<{ content: string; createdAt: number }>(),
});
