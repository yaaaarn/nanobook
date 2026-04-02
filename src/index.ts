import Elysia from "elysia";
import { html } from "@elysiajs/html";
import { staticPlugin } from "@elysiajs/static";

import { admin } from "./routes/admin";
import { auth } from "./routes/auth";
import { user } from "./routes/user";

import { logger } from "@tqman/nice-logger";
import { ip } from "elysia-ip";

import { migrate } from "drizzle-orm/bun-sqlite/migrator";

import { db } from "./db";

import { join, dirname } from "path";
import { activeDirectory } from "./globals";

migrate(db, { migrationsFolder: join(activeDirectory, "drizzle") });

new Elysia()
  .use(logger())
  .use(ip())
  .use(
    staticPlugin({
      prefix: "/",
      directive: "no-cache",
      assets: join(activeDirectory, "public"),
    }),
  )
  .use(html())
  .use(auth)
  .use(user)
  .use(admin)
  .listen(process.env.PORT ?? 3000);

console.log("nanobook is ready!");
