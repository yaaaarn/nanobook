import { Config } from "./config";
import { version } from "../package.json";
import fs from "fs";
import z from "zod";
import { dirname, join } from "path";

function loadConfigSync() {
  const text = fs.readFileSync(join(activeDirectory, "config.yaml"), {
    encoding: "utf-8",
  }); // sync read
  return Config.parse(Bun.YAML.parse(text)); // sync parse
}

type ConfigType = z.infer<typeof Config>;

export const config = new Proxy({} as ConfigType, {
  get(_, prop: string) {
    const cfg = loadConfigSync();
    return prop === "raw" ? cfg : (cfg as any)[prop];
  },
});

export { version };

export const activeDirectory =
  process.env.DIRECTORY ?? dirname(process.execPath);
