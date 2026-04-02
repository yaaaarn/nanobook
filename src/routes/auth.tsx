import { html, Html } from "@elysiajs/html";
import Elysia from "elysia";
import z from "zod";

import { verifyPassword, signToken } from "../services/auth";

import { Body } from "../components/Body";
import { config } from "../globals";
import { consumeFlash, setFlash } from "../utils/flash";

export const auth = new Elysia()
  .use(html())
  .get("/login", ({ cookie, html }) => {
    const flash = consumeFlash(cookie);
    return html(
      <Body flash={flash}>
        <header>
          <h1>login</h1>
        </header>
        <form method="post" action="/login" class="box form">
          <label for="username">Username:</label>
          <input name="username" placeholder="Username" required />

          <label for="password">Password:</label>
          <input
            name="password"
            type="password"
            placeholder="Password"
            required
          />

          <button type="submit">Login</button>
        </form>
      </Body>,
    );
  })
  .post(
    "/login",
    async ({ body, cookie, redirect }) => {
      const { username, password } = body;

      if (
        username === config.admin.username &&
        (await verifyPassword(password, config.admin.password))
      ) {
        const token = await signToken(username);

        cookie.auth?.set({
          value: token,
          httpOnly: true,
          sameSite: "strict",
          path: "/",
          maxAge: 60 * 60 * 8,
        });

        return redirect("/admin");
      }

      setFlash(cookie, "Invalid username or password.", "error");
      return redirect("/login");
    },
    {
      body: z.object({
        username: z.string(),
        password: z.string(),
      }),
    },
  )
  .get("/logout", ({ cookie, redirect }) => {
    cookie.auth?.remove();
    return redirect("/");
  });
