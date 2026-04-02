import Elysia from "elysia";
import { html } from "@elysiajs/html";
import { staticPlugin } from "@elysiajs/static";

import { admin } from "./routes/admin";
import { auth } from "./routes/auth";
import { user } from "./routes/user";

import { logger } from "@tqman/nice-logger";
import { ip } from "elysia-ip";

import { migrate } from "drizzle-orm/bun-sqlite/migrator";

import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import { dirname, join } from "path";
import { config } from "./globals";

const [, , mode] = process.argv;

const sqlite = new Database("nanobook.db");
const db = drizzle(sqlite);
migrate(db, { migrationsFolder: "./drizzle" });

new Elysia()
  .use(logger())
  .use(ip())
  .use(
    staticPlugin({
      prefix: "/",
      directive: "no-cache",
      assets: join(dirname(process.execPath), "public"),
    }),
  )
  .use(html())
  .use(auth)
  .use(user)
  .use(admin)
  .listen(process.env.PORT ?? 3000);

console.log("nanobook is ready!");
