import { Html } from "@elysiajs/html";
import { config, version } from "../globals";

export const Body = async ({
  children,
  flash,
}: {
  children: JSX.Element[];
  flash?: { msg: string; type: "success" | "error" } | null;
}) => {
  return (
    <>
      {"<!doctype html>"}
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />
          <title safe>{config.name}</title>

          <link rel="stylesheet" href="/style.css" />
        </head>
        <body>
          <main style="max-width: 500px; width: 100%; margin: 0 auto">
            {flash != null && (
              <div class={`flash flash-${flash.type}`}>
                {Html.escapeHtml(flash.msg)}
              </div>
            )}
            {...children}
            <hr />
            <footer>
              <div style="margin-bottom: 4px; opacity:0.75;">
                <a href="/admin">administrator login</a>
              </div>
              Powered by nanobook <small safe>v{version}</small>
              <br />
              <br />
            </footer>
          </main>
        </body>
      </html>
    </>
  );
};
