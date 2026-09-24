export function normalizeListResponse(data) {
  if (Array.isArray(data)) {
    return { items: data, pagination: { page: 1, page_size: data.length || 0, total: data.length || 0, total_pages: 1 }, isPaginated: false };
  }
  const items = data?.items || data?.rows || data?.announcements || [];
  const raw = data?.pagination || {};
  const total = Number(raw.total ?? data?.total ?? items.length ?? 0) || 0;
  const pageSize = Number(raw.page_size ?? raw.limit ?? items.length ?? 0) || items.length || 0;
  const page = Number(raw.page ?? data?.page ?? 1) || 1;
  const totalPages = Number(raw.total_pages ?? (pageSize > 0 ? Math.ceil(total / pageSize) : 1)) || 1;
  return { items, pagination: { page, page_size: pageSize, total, total_pages: totalPages }, isPaginated: Boolean(data?.pagination || data?.items), raw: data };
}

export function formatInventoryError(err, factories = []) {
  const base = String(err?.message || 'Failed to update inventory').trim();
  const factoryId = err?.factory_id;
  const available = err?.available_qty;
  const requested = err?.requested_qty;
  if (!factoryId && available == null && requested == null) return base;
  const factoryName = factories.find((f) => String(f?.id) === String(factoryId))?.name || factoryId || 'selected factory';
  const lines = [base];
  if (factoryName) lines.push(`Factory: ${factoryName}`);
  if (available != null) lines.push(`Available: ${available}`);
  if (requested != null) lines.push(`Required: ${requested}`);
  return lines.join('\n');
}
