import { PAGE_LIMIT } from "../consts";

import { db } from "../db";

import { messagesTable } from "./schema";

import { desc, eq } from "drizzle-orm";

export async function getMessages(
  query: Record<string, string>,
  includeHidden = false,
) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(PAGE_LIMIT, Math.max(1, Number(query.limit) || 10));

  const messagesQuery = db
    .select()
    .from(messagesTable)
    .orderBy(desc(messagesTable.createdAt));
  const messages = await (includeHidden
    ? messagesQuery.where(eq(messagesTable.hidden, false))
    : messagesQuery);

  return {
    page,
    limit,
    messages,
    totalPages: Math.ceil(messages.length / limit),
  };
}
