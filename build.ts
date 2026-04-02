import { mkdir, cp, rm } from "fs/promises";
import { join } from "path";
import { execSync } from "child_process";

const targets: Bun.Build.CompileTarget[] = [
  "bun-darwin-x64",
  "bun-darwin-x64-baseline",
  "bun-darwin-arm64",

  "bun-linux-x64",
  "bun-linux-x64-baseline",
  "bun-linux-arm64",

  "bun-linux-x64-musl",
  "bun-linux-x64-baseline-musl",
  "bun-linux-arm64-musl",

  "bun-windows-x64",
  "bun-windows-x64-baseline",
  "bun-windows-arm64",
];

const baseBuildOptions = {
  entrypoints: ["./src/index.ts"],
  minify: true,
  sourcemap: false,
  bytecode: true,
  outdir: "dist",
};

console.log("Generating Drizzle client...");
execSync(
  "bunx drizzle-kit generate --dialect sqlite --schema ./src/db/schema.ts",
  {
    stdio: "inherit",
  },
);
console.log("Drizzle client generated!");

await Promise.all(
  targets.map(async (target) => {
    console.log("Building", target);

    const outfile = `nanobook-${target.replace(/^bun-/, "")}`;

    // build the binary
    const build = await Bun.build({
      ...baseBuildOptions,
      compile: {
        outfile,
        target,
      },
    });

    const path = build.outputs[0]!.path;

    // temporary staging dir
    const stagingDir = join("dist", `${outfile}-bundle`);
    await mkdir(stagingDir, { recursive: true });

    // copy the binary
    await cp(path, join(stagingDir, outfile));

    // copy the public folder
    await cp("./public", join(stagingDir, "public"), {
      recursive: true,
    });

    // copy the config file
    await cp("./config.example.yaml", join(stagingDir, "config.yaml"));

    // copy the drizzle metadata
    await cp("./drizzle", join(stagingDir, "drizzle"), { recursive: true });

    // create tar.gz
    const tarFile = join("dist", `${outfile}.tar.gz`);

    await Bun.spawn(["tar", "-czf", tarFile, "-C", stagingDir, "."]).exited;

    await rm(stagingDir, { recursive: true });
    await rm(path);

    console.log("Packaged", tarFile);
  }),
);

console.log("All builds and packaging completed!");
