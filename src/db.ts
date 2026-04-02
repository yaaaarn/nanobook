import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";

const sqlite = new Database("nanobook.db");
export const db = drizzle(sqlite);
