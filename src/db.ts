import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import { join, dirname } from "path";

const sqlite = new Database(join(dirname(process.execPath), "nanobook.db"));
export const db = drizzle(sqlite);
