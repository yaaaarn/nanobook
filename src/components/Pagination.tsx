import { Html } from "@elysiajs/html";

export const Pagination = ({
  page,
  totalPages,
  limit,
  base = "/",
}: {
  page: number;
  totalPages: number;
  limit: number;
  base?: string;
}) => {
  return (
    <p style="float: right;">
      {new Array(totalPages).fill(0).map((_, i) => (
        <a
          href={`${base}?page=${i + 1}&limit=${limit}`}
          class={`page-link${i + 1 === page ? " active" : ""}`}
        >
          [{i + 1}]
        </a>
      ))}
    </p>
  );
};
