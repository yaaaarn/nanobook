import "reflect-metadata";
import { DataSource } from "typeorm";
import { Message } from "./models";

import Elysia, { Cookie } from "elysia";
import { ip } from "elysia-ip";
import { html, Html } from "@elysiajs/html";
import { rateLimit } from "elysia-rate-limit";
import { csrf } from "elysia-csrf";

import { z } from "zod";

import sanitizeHtml from "sanitize-html";
import * as bcrypt from "bcryptjs";

import { Config } from "./types";

import { version } from "../package.json";
import { jwtVerify, SignJWT } from "jose";

const AppDataSource = new DataSource({
  type: "sqlite",
  database: "nanobook.db",
  entities: [Message],
  synchronize: true,
  logging: false,
});

try {
  await AppDataSource.initialize();
} catch (error) {
  console.error(error);
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "change-me-in-production",
);
const JWT_ALG = "HS256";
const JWT_EXPIRY = "8h";

async function signToken(username: string): Promise<string> {
  return new SignJWT({ sub: username })
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(JWT_SECRET);
}

async function verifyToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  if (stored.startsWith("$2")) {
    return bcrypt.compare(plain, stored);
  }

  console.warn(
    "[nanobook] WARNING: admin password is stored in plaintext. Hash it with bcrypt.",
  );
  return plain === stored;
}

const MAX_LIMIT = 100;

async function getMessages(
  query: Record<string, string>,
  includeHidden = false,
) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(query.limit) || 10));

  const where = includeHidden ? {} : { hidden: false };

  const [messages, total] = await AppDataSource.getRepository(
    Message,
  ).findAndCount({
    where,
    order: { createdAt: "DESC" },
    skip: (page - 1) * limit,
    take: limit,
  });
  return { page, limit, messages, totalPages: Math.ceil(total / limit) };
}

const config = await Config.parseAsync(
  Bun.YAML.parse(await Bun.file("config.yaml").text()),
);

function setFlash(
  cookie: Record<string, Cookie<unknown>>,
  msg: string,
  type: "success" | "error" = "success",
) {
  cookie.flash?.set({
    value: JSON.stringify({ msg, type }),
    httpOnly: false,
    sameSite: "strict",
    path: "/",
    maxAge: 10,
  });
}

function consumeFlash(
  cookie: Record<string, Cookie<unknown>>,
): { msg: string; type: "success" | "error" } | null {
  const raw = cookie.flash?.value;
  if (typeof raw !== "string" || !raw) return null;
  cookie.flash?.remove();
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const Body = ({
  children,
  flash,
}: {
  children: JSX.Element[];
  flash?: { msg: string; type: "success" | "error" } | null;
}) => {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title safe>{config.name}</title>
      </head>
      <body>
        <main style="width: 500px; margin: 0 auto">
          {flash != null && (
            <div class={`flash flash-${flash.type}`}>
              {Html.escapeHtml(flash.msg)}
            </div>
          )}
          {...children}
          <hr />
          <footer>
            Powered by nanobook <small safe>v{version}</small>
            <br />
          </footer>
        </main>
      </body>
      <style>{`
        * {
          box-sizing: border-box;
        }

        html {
          background: #95d3b7;
          color: #36572f;
          font-family: sans-serif;
          -webkit-font-smoothing: none;
        }

        .message {
          background: #fff;
          color: #624732;
          border: 1px solid #ffc0cb;
          padding: 0 8px;
        }

        .message.hidden-msg {
          opacity: 0.5;
          border-style: dashed;
        }

        .field {
          padding-left: 8px;
          border-left: 2px solid #ffc0cb;
        }

        .reply {
          background: #ffc0cb;
          color: #624732;
          border: 1px solid black;
          padding: 4px;
          margin-bottom: 8px;
        }

        .messages {
          list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.75rem;
        }

        .page-link {
          color: #624732;
        }

        .page-link.active {
          font-weight: bold;
        }

        hr {
          color: #36572f;
          border: 0.5px solid currentColor;
        }

        input, textarea {
          width: 100%;
          resize: vertical;
          border-width: 1px;
          border-style: inset;
        }

        .box {
          background: #fff;
          color: #624732;
          border: 1px solid #ffc0cb;
          padding: 8px;
        }

        header {
          margin-bottom: 1.5em;
        }

        p {
          margin: 0.5em 0;
        }

        .flash {
          padding: 8px 12px;
          margin-bottom: 1em;
          border-radius: 2px;
          font-weight: bold;
        }

        .flash-success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        .flash-error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }

        .honeypot {
          display: none !important;
          visibility: hidden;
        }

        .admin-actions {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }
      `}</style>
    </html>
  );
};

const NAME_MAX = 100;
const MESSAGE_MAX = 5000;
const EXTRA_FIELD_MAX = 1000;

const MessageElement = ({
  msg,
  dash = false,
}: {
  msg: Message;
  dash?: boolean;
}) => {
  const safeMessage = {
    name: sanitizeHtml(msg.name),
    content: sanitizeHtml(Bun.markdown.html(msg.content)),
    createdAt: new Date(msg.createdAt).toUTCString(),
    extraFields: msg.extraFields
      ? Object.fromEntries(
          Object.entries(msg.extraFields).map(([key, field]) => [
            key,
            { ...config.extraFields?.[key], label: sanitizeHtml(field) },
          ]),
        )
      : undefined,
  };

  return (
    <li class={`message${msg.hidden ? " hidden-msg" : ""}`}>
      <p>
        <strong>{safeMessage.name || "Anonymous"}</strong>{" "}
        <small safe>{new Date(msg.createdAt).toUTCString()}</small>
        {dash && (
          <>
            <small>
              <code style="float: right;">
                {Html.escapeHtml(msg.ipAddress)}
              </code>
            </small>
            {msg.hidden && (
              <small style="float: right; margin-right: 4px; color: #999;">
                {" "}
                [hidden]{" "}
              </small>
            )}
          </>
        )}
      </p>
      {Object.entries(msg.extraFields)
        .filter(([_key, _field]) => {
          return dash || config.extraFields?.[_key]?.private === false;
        })
        .map(([_key, field]) =>
          field == null || field.length == 0 ? (
            <></>
          ) : (
            <p class="field">
              <strong>
                {Html.escapeHtml(config.extraFields?.[_key]?.label)}
              </strong>
              <br />
              <span>{Html.escapeHtml(field)}</span>
            </p>
          ),
        )}
      {sanitizeHtml(Bun.markdown.html(msg.content)) as "safe"}
      {dash ? (
        <>
          <details>
            <summary>Reply</summary>
            <form action={`/admin/messages/${msg.id}/reply`} method="post">
              <textarea name="content" required>
                {msg.reply?.content as "safe"}
              </textarea>
              <br />
              <button type="submit">Reply</button>
              <button
                type="submit"
                formaction={`/admin/messages/${msg.id}/reply/delete`}
              >
                Delete reply
              </button>
            </form>
          </details>
          <p>
            <div class="admin-actions">
              <form action={`/admin/messages/${msg.id}/delete`} method="post">
                <button type="submit">Delete</button>
              </form>
              <form action={`/admin/messages/${msg.id}/hide`} method="post">
                <button type="submit">{msg.hidden ? "Unhide" : "Hide"}</button>
              </form>
            </div>
          </p>
        </>
      ) : (
        msg.reply != null && (
          <div class="reply">
            <strong>
              Replied at {new Date(msg.reply.createdAt).toUTCString() as "safe"}
            </strong>
            <p>
              {sanitizeHtml(Bun.markdown.html(msg.reply?.content)) as "safe"}
            </p>
          </div>
        )
      )}
    </li>
  );
};

const Pagination = ({
  page,
  totalPages,
  limit,
  base = "/",
}: {
  page: number;
  totalPages: number;
  limit: number;
  base?: string;
}) => {
  return (
    <p style="float: right;">
      {new Array(totalPages).fill(0).map((_, i) => (
        <a
          href={`${base}?page=${i + 1}&limit=${limit}`}
          class={`page-link${i + 1 === page ? " active" : ""}`}
        >
          [{i + 1}]
        </a>
      ))}
    </p>
  );
};

async function isAuthenticated(
  cookie: Record<string, Cookie<unknown>>,
): Promise<boolean> {
  const token = cookie.auth?.value;
  if (typeof token !== "string" || !token) return false;
  return verifyToken(token);
}

const admin = new Elysia({ prefix: "/admin" })
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

        <Pagination
          page={page}
          totalPages={totalPages}
          limit={limit}
          base="/admin"
        />
        <h2>messages</h2>

        <ul class="messages">
          {messages.map((msg) => (
            <MessageElement msg={msg} dash={true} />
          ))}
        </ul>
      </Body>
    );
  })
  .post(
    "/messages/:id/reply",
    async ({ params, body, cookie, redirect }) => {
      const { id } = params;
      const msg = await AppDataSource.getRepository(Message).findOneBy({ id });
      if (!msg) return new Response("Not found", { status: 404 });
      msg.reply = {
        content: body.content,
        createdAt: new Date().toISOString(),
      };
      await AppDataSource.getRepository(Message).save(msg);
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
      const msg = await AppDataSource.getRepository(Message).findOneBy({ id });
      if (!msg) return new Response("Not found", { status: 404 });
      msg.reply = null;
      await AppDataSource.getRepository(Message).save(msg);
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
      const msg = await AppDataSource.getRepository(Message).findOneBy({ id });
      if (!msg) return new Response("Not found", { status: 404 });
      msg.content = body.content;
      await AppDataSource.getRepository(Message).save(msg);
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
      const msg = await AppDataSource.getRepository(Message).findOneBy({ id });
      if (!msg) return new Response("Not found", { status: 404 });
      await AppDataSource.getRepository(Message).delete(msg.id);
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
      const msg = await AppDataSource.getRepository(Message).findOneBy({ id });
      if (!msg) return new Response("Not found", { status: 404 });
      msg.hidden = !msg.hidden;
      await AppDataSource.getRepository(Message).save(msg);
      setFlash(cookie, msg.hidden ? "Message hidden." : "Message unhidden.");
      return redirect("/admin");
    },
    {
      params: z.object({
        id: z.string().transform((id) => Number(id)),
      }),
    },
  );

new Elysia()
  .use(ip())
  .use(html())
  .use(csrf())
  .use(
    rateLimit({
      duration: 60_000,
      max: 5,
      scoping: "scoped",
      generator: (req, server) => server?.requestIP(req)?.address ?? "unknown",
      errorResponse: "Too many messages. Please wait a moment.",
    }),
  )
  .use(admin)
  .get("/login", ({ cookie }) => {
    const flash = consumeFlash(cookie);
    return (
      <Body flash={flash}>
        <h1>Login</h1>
        <form method="post" action="/login" class="box">
          <label for="username">Username:</label>
          <input name="username" placeholder="Username" required />

          <label for="password">Password:</label>
          <input
            name="password"
            type="password"
            placeholder="Password"
            required
          />

          <button type="submit">Login</button>
        </form>
      </Body>
    );
  })
  .post(
    "/login",
    async ({ body, cookie, redirect }) => {
      const { username, password } = body;

      if (
        username === config.admin.username &&
        (await verifyPassword(password, config.admin.password))
      ) {
        const token = await signToken(username);

        cookie.auth?.set({
          value: token,
          httpOnly: true,
          sameSite: "strict",
          path: "/",
          maxAge: 60 * 60 * 8,
        });

        return redirect("/admin");
      }

      setFlash(cookie, "Invalid username or password.", "error");
      return redirect("/login");
    },
    {
      body: z.object({
        username: z.string(),
        password: z.string(),
      }),
    },
  )
  .get("/logout", ({ cookie, redirect }) => {
    cookie.auth?.remove();
    return redirect("/");
  })
  .get("/", async ({ query, cookie }) => {
    const flash = consumeFlash(cookie);
    const { page, limit, messages, totalPages } = await getMessages(query);

    const safeFields = config.extraFields
      ? Object.fromEntries(
          Object.entries(config.extraFields).map(([key, field]) => [
            key,
            { ...field, label: sanitizeHtml(field.label) },
          ]),
        )
      : undefined;

    return (
      <Body flash={flash}>
        <header>
          <span style="float: right;">
            <a href="/admin">admin</a>
          </span>
          <h1 safe style="margin-bottom: 0;">
            {config.name}
          </h1>
          <p>{sanitizeHtml(Bun.markdown.html(config.description)) as "safe"}</p>
        </header>

        <form
          action="/messages/new"
          method="post"
          class="box"
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
                  />
                ) : (
                  <textarea
                    name={key}
                    id={key}
                    required={safeField.required}
                    maxlength={String(EXTRA_FIELD_MAX)}
                  ></textarea>
                )}
              </div>
            ))}

          {/* Honeypot — bots fill this, humans don't see it */}
          <div class="honeypot" aria-hidden="true">
            <label for="website">Website:</label>
            <input
              type="text"
              id="website"
              name="website"
              tabindex={-1}
              autocomplete="off"
            />
          </div>

          <button type="submit">Post</button>
        </form>

        <Pagination page={page} totalPages={totalPages} limit={limit} />
        {messages.length > 0 ? (
          <>
            <p>
              Page {page} of {totalPages} ({messages.length} messages)
            </p>
            <ul class="messages">
              {messages.map((msg) => (
                <MessageElement msg={msg} />
              ))}
            </ul>
          </>
        ) : (
          <p>No messages yet.</p>
        )}
      </Body>
    );
  })
  .post(
    "/messages/new",
    async ({ body, ip, cookie, redirect }) => {
      const { name, message } = body;

      if ((body as any).website) {
        return redirect("/");
      }

      const msg = new Message();
      msg.name = name?.slice(0, NAME_MAX) ?? "";
      msg.content = message.slice(0, MESSAGE_MAX);
      msg.createdAt = new Date().toISOString();
      msg.ipAddress = ip;
      msg.hidden = false;

      msg.extraFields = {};
      Object.entries(config.extraFields ?? {}).forEach(([key]) => {
        const val = body[key as keyof typeof body];
        msg.extraFields[key] =
          typeof val === "string" ? val.slice(0, EXTRA_FIELD_MAX) : "";
      });

      msg.reply = null;

      await AppDataSource.getRepository(Message).save(msg);
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
  )
  .listen(3000);
