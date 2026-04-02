import { Html } from "@elysiajs/html";
import Elysia from "elysia";
import { ip } from "elysia-ip";
import { rateLimit } from "elysia-rate-limit";

import sanitize from "sanitize-html";

import z from "zod";

import { config } from "../globals";
import { NAME_MAX, MESSAGE_MAX, EXTRA_FIELD_MAX } from "../consts";

import { consumeFlash, setFlash } from "../utils/flash";

import { Body } from "../components/Body";
import { List } from "../components/List";
import { db } from "../db";
import { messagesTable } from "../db/schema";

export const user = new Elysia()
  .get("/", async ({ query, cookie }) => {
    const flash = consumeFlash(cookie);

    const safeFields = config.extraFields
      ? Object.fromEntries(
          Object.entries(config.extraFields).map(([key, field]) => [
            key,
            { ...field, label: sanitize(field.label) },
          ]),
        )
      : undefined;

    return (
      <Body flash={flash}>
        <header>{Bun.markdown.html(config.header) as "safe"}</header>

        <form
          action="/messages/new"
          method="post"
          class="box form"
          style="flex-direction: column;"
        >
          <div>
            <label for="name">Name:</label>
            <br />
            <input
              type="text"
              id="name"
              name="name"
              placeholder="Anonymous"
              maxlength={String(NAME_MAX)}
            />
          </div>

          <div>
            <label for="message">Message*:</label>
            <br />
            <textarea
              name="message"
              id="message"
              placeholder="Say something... markdown is supported!"
              required
              rows="8"
              maxlength={String(MESSAGE_MAX)}
            />
          </div>

          {config.emojis !== null && (
            <details>
              <summary>Emoji picker</summary>

              <div class="emojis">
                {Object.entries(config.emojis ?? {}).map(([name, url]) => (
                  <button
                    onclick={`event.preventDefault();document.querySelector('#message').value += ':${name.replaceAll('"', '\\"')}:';`}
                  >
                    <img src={url} alt={name} class="emoji" />
                  </button>
                ))}
              </div>
            </details>
          )}

          {safeFields &&
            Object.entries(safeFields).map(([key, safeField]) => (
              <div>
                <label for={key}>
                  {safeField.label}
                  {safeField.required ? "*" : ""}:
                </label>
                <br />
                {safeField.type === "input" ? (
                  <input
                    type="text"
                    name={key}
                    id={key}
                    required={safeField.required}
                    maxlength={String(EXTRA_FIELD_MAX)}
                    placeholder={`${safeField.required ? "Required" : "Optional"}${safeField.private ? ", only the guestbook admin will see this." : ""}`}
                  />
                ) : (
                  <textarea
                    name={key}
                    id={key}
                    required={safeField.required}
                    maxlength={String(EXTRA_FIELD_MAX)}
                    placeholder={`${safeField.required ? "Required" : "Optional"}${safeField.private ? ", only the guestbook admin will see this." : ""}`}
                  ></textarea>
                )}
              </div>
            ))}

          <button type="submit">Post</button>
        </form>

        <List query={query} />
      </Body>
    );
  })
  .use(
    rateLimit({
      duration: 60_000,
      max: 5,
      scoping: "scoped",
      generator: (req, server) => server?.requestIP(req)?.address ?? "unknown",
      errorResponse: "Too many requests. Please wait a moment.",
    }),
  )
  // only here for typings
  .use(ip())
  .post(
    "/messages/new",

    async ({ body, ip, cookie, redirect }) => {
      const { name, message } = body;

      const msg: typeof messagesTable.$inferInsert = {
        name: name?.slice(0, NAME_MAX) ?? "",
        content: message.slice(0, MESSAGE_MAX),
        ipAddress: ip,
        extraFields: {},
        createdAt: new Date(),
      };

      Object.entries(config.extraFields ?? {}).forEach(([key]) => {
        const val = body[key as keyof typeof body];
        msg.extraFields![key] =
          typeof val === "string" ? val.slice(0, EXTRA_FIELD_MAX) : "";
      });

      await db.insert(messagesTable).values(msg);
      setFlash(cookie, "Message posted!");
      return redirect("/");
    },

    {
      body: z.object({
        name: z.string().max(NAME_MAX).optional().default(""),
        message: z.string().min(1).max(MESSAGE_MAX),
        ...Object.fromEntries(
          Object.entries(config.extraFields ?? {}).map(([key, field]) => [
            key,
            field.required
              ? z.string().min(1).max(EXTRA_FIELD_MAX)
              : z.string().max(EXTRA_FIELD_MAX).optional(),
          ]),
        ),
      }),
    },
  );
