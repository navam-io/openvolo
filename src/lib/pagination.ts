const DEFAULT_PAGE_SIZE = 25;

export function parsePaginationParams(params: {
  page?: string;
  pageSize?: string;
}): { page: number; pageSize: number } {
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const pageSize = DEFAULT_PAGE_SIZE;
  return { page, pageSize };
}

export { DEFAULT_PAGE_SIZE };
