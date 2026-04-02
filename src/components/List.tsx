import { Html } from "@elysiajs/html";
import { Message, AdminMessage } from "./Messages";
import { Pagination } from "./Pagination";
import { getMessages } from "../db/messages";

export const List = async ({
  query,
  admin,
}: {
  query: Record<string, string>;
  admin?: boolean;
}) => {
  const { page, limit, messages, totalPages } = await getMessages(query);

  return (
    <>
      <Pagination page={page} totalPages={totalPages} limit={limit} />
      {messages.length > 0 ? (
        <>
          <p>
            Page {page} of {totalPages} ({messages.length} messages)
          </p>
          <ul class="messages">
            {messages.map((msg) => (
              <>{admin ? <AdminMessage msg={msg} /> : <Message msg={msg} />}</>
            ))}
          </ul>
        </>
      ) : (
        <p>No messages yet.</p>
      )}
    </>
  );
};
