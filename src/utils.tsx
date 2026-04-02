import { Html } from "@elysiajs/html";
import sanitize from "sanitize-html";
import { config } from "./globals";

export function parseEmojis(text: string) {
  // @ts-expect-error
  return text.replace(/:([a-z0-9_+-]+):/gi, (_match, name: string) => {
    const safeName = Html.escapeHtml(name); // prevent injection
    const emojis = config.emojis ?? {};

    if (safeName in emojis) {
      return <img src={emojis[safeName]} alt={safeName} class="emoji" />;
    } else {
      return `:${safeName}:`;
    }
  });
}

export const handleText = (text: string) =>
  parseEmojis(sanitize(Bun.markdown.html(text, {})));
