import { Html } from "@elysiajs/html";

import { config } from "../globals";
import { handleText } from "../utils";
import type { messagesTable } from "../db/schema";

function renderExtraFields(
  msg: typeof messagesTable.$inferSelect,
  dash: boolean,
) {
  return Object.entries(msg.extraFields ?? {})
    .filter(([key]) => {
      return dash || config.extraFields?.[key]?.private === false;
    })
    .map(([key, field]) =>
      !field ? null : (
        <p class="field">
          <strong safe>{config.extraFields?.[key]?.label}</strong>
          <br />
          <span>{Html.escapeHtml(field)}</span>
        </p>
      ),
    );
}

export const Message = ({
  msg,
}: {
  msg: typeof messagesTable.$inferSelect;
}) => {
  return (
    <li class={`message${msg.hidden ? " hidden-msg" : ""}`}>
      <p>
        <strong safe>{msg.name || "Anonymous"}</strong>
        <small style="float: right;" safe>
          {new Date(msg.createdAt).toUTCString()}
        </small>
      </p>

      {renderExtraFields(msg, false) as unknown as "safe"}

      {handleText(msg.content) as "safe"}

      {msg.reply != null && (
        <div class="reply">
          <strong>
            Replied at {new Date(msg.reply.createdAt).toUTCString() as "safe"}
          </strong>
          <p>{handleText(msg.reply.content) as "safe"}</p>
        </div>
      )}
    </li>
  );
};

export const AdminMessage = ({
  msg,
}: {
  msg: typeof messagesTable.$inferSelect;
}) => {
  return (
    <li class={`message${msg.hidden ? " hidden-msg" : ""}`}>
      <p>
        <strong safe>{msg.name || "Anonymous"}</strong>
        <small style="float: right;" safe>
          {new Date(msg.createdAt).toUTCString()}
        </small>
      </p>

      {renderExtraFields(msg, true) as unknown as "safe"}

      {handleText(msg.content) as "safe"}

      <details>
        <summary>Reply</summary>
        <form action={`/admin/messages/${msg.id}/reply`} method="post">
          <textarea name="content" required>
            {msg.reply?.content as "safe"}
          </textarea>
          <br />
          <button type="submit">Reply</button>
          <button
            type="submit"
            formaction={`/admin/messages/${msg.id}/reply/delete`}
          >
            Delete reply
          </button>
        </form>
      </details>

      <div class="admin-actions">
        <form
          action={`/admin/messages/${msg.id}/delete`}
          method="post"
          onsubmit="return confirm('Are you sure?');"
        >
          <button type="submit">Delete</button>
        </form>

        <form action={`/admin/messages/${msg.id}/hide`} method="post">
          <button type="submit">{msg.hidden ? "Unhide" : "Hide"}</button>
        </form>

        <div style="flex:1;"></div>

        {msg.hidden && <small style="color: #999;">[hidden]</small>}

        <small>
          <code safe>{msg.ipAddress}</code>
        </small>
      </div>
    </li>
  );
};
