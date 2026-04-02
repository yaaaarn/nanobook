import { z } from "zod";

export const Config = z.object({
  name: z.string(),
  header: z.string(),

  admin: z.object({
    username: z.string(),
    password: z.string(),
  }),

  extraFields: z
    .record(
      z.string(),
      z.object({
        type: z.enum(["input", "textarea"]),
        required: z.boolean(),
        label: z.string(),
        private: z.boolean().default(false),
      }),
    )
    .optional(),

  emojis: z.record(z.string(), z.string()).optional(),
});
