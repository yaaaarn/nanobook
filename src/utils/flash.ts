import type { Cookie } from "elysia";
import z from "zod";

export function setFlash(
  cookie: Record<string, Cookie<unknown>>,
  msg: string,
  type: "success" | "error" = "success",
) {
  cookie.flash?.set({
    value: JSON.stringify({ msg, type }),
    httpOnly: false,
    sameSite: "strict",
    path: "/",
    maxAge: 10,
  });
}

const FlashMessageSchema = z.object({
  msg: z.string(),
  type: z.enum(["success", "error"]),
});

type FlashMessage = z.infer<typeof FlashMessageSchema>;

export function consumeFlash(
  cookie: Record<string, Cookie<unknown>>,
): FlashMessage | null {
  const raw = cookie.flash?.value;

  const result = FlashMessageSchema.safeParse(raw);
  if (!result.success) return null;

  cookie.flash?.remove();
  return result.data;
}
