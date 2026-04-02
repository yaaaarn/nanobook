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

await Promise.all(
  targets.map((target) => {
    console.log("Building", target);
    const outfile = `nanobook-${target.replace(/^bun-/, "")}`;

    return Bun.build({
      ...baseBuildOptions,
      compile: {
        outfile,
        target,
      },
    });
  }),
);

console.log("All builds completed!");
