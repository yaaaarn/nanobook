import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import { join, dirname } from "path";
import { activeDirectory } from "./globals";

const sqlite = new Database(join(activeDirectory, "nanobook.db"));
export const db = drizzle(sqlite);
