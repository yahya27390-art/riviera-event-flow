export async function readAll(client, table, { sort = 'created_at', ascending = false, criteria = {} } = {}) {
  const records = [];
  const pageSize = 250;
  for (let offset = 0; ; offset += pageSize) {
    let query = client.from(table).select('*').order(sort, { ascending });
    if (sort !== 'id') query = query.order('id', { ascending: true });
    for (const [key, value] of Object.entries(criteria)) query = query.eq(key, value);
    const { data, error } = await query.range(offset, offset + pageSize - 1);
    if (error) throw error;
    records.push(...(data || []));
    if (!data || data.length < pageSize) return records;
  }
}
