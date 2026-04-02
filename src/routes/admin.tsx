import Elysia from "elysia";

import z from "zod";

import { Html } from "@elysiajs/html";

import { Body } from "../components/Body";
import { Pagination } from "../components/Pagination";
import { AdminMessage } from "../components/Messages";

import { getMessages } from "../db/messages";

import { MESSAGE_MAX } from "../consts";

import { consumeFlash, setFlash } from "../utils/flash";
import { isAuthenticated } from "../services/auth";

import { db } from "../db";
import { messagesTable } from "../db/schema";
import { eq, not } from "drizzle-orm";
import { List } from "../components/List";

export const admin = new Elysia({ prefix: "/admin" })
  .derive(async ({ cookie, redirect }) => {
    if (!(await isAuthenticated(cookie))) {
      throw redirect("/login");
    }
    return {};
  })
  .get("/", async ({ query, cookie }) => {
    const flash = consumeFlash(cookie);

    const { page, limit, messages, totalPages } = await getMessages(
      query,
      true,
    );

    return (
      <Body flash={flash}>
        <header>
          <h1 style="margin-bottom: 0;">dashboard</h1>
          <p>
            <a href="/">back to guestbook</a> | <a href="/logout">logout</a>
          </p>
        </header>

        <h2>messages</h2>

        <List query={query} admin={true} />
      </Body>
    );
  })
  .post(
    "/messages/:id/reply",
    async ({ params, body, cookie, redirect }) => {
      const { id } = params;

      await db
        .update(messagesTable)
        .set({
          reply: {
            content: body.content,
            createdAt: Date.now(),
          },
        })
        .where(eq(messagesTable.id, id));

      setFlash(cookie, "Reply saved.");
      return redirect("/admin");
    },
    {
      body: z.object({
        content: z.string().min(1).max(MESSAGE_MAX),
      }),
      params: z.object({
        id: z.string().transform((id) => Number(id)),
      }),
    },
  )
  .post(
    "/messages/:id/reply/delete",
    async ({ params, cookie, redirect }) => {
      const { id } = params;

      await db
        .update(messagesTable)
        .set({
          reply: null,
        })
        .where(eq(messagesTable.id, id));

      setFlash(cookie, "Reply deleted.");
      return redirect("/admin");
    },
    {
      params: z.object({
        id: z.string().transform((id) => Number(id)),
      }),
    },
  )
  .post(
    "/messages/:id",
    async ({ params, body, cookie, redirect }) => {
      const { id } = params;

      await db
        .update(messagesTable)
        .set({
          content: body.content,
        })
        .where(eq(messagesTable.id, id));

      setFlash(cookie, "Message updated.");
      return redirect("/admin");
    },
    {
      body: z.object({
        content: z.string().min(1).max(MESSAGE_MAX),
      }),
      params: z.object({
        id: z.string().transform((id) => Number(id)),
      }),
    },
  )
  .post(
    "/messages/:id/delete",
    async ({ params, cookie, redirect }) => {
      const { id } = params;

      await db.delete(messagesTable).where(eq(messagesTable.id, id));

      setFlash(cookie, "Message deleted.");
      return redirect("/admin");
    },
    {
      params: z.object({
        id: z.string().transform((id) => Number(id)),
      }),
    },
  )

  .post(
    "/messages/:id/hide",
    async ({ params, cookie, redirect }) => {
      const { id } = params;

      await db
        .update(messagesTable)
        .set({
          hidden: not(messagesTable.hidden),
        })
        .where(eq(messagesTable.id, id));

      setFlash(cookie, "Toggled message visibility.");
      return redirect("/admin");
    },
    {
      params: z.object({
        id: z.string().transform((id) => Number(id)),
      }),
    },
  );
