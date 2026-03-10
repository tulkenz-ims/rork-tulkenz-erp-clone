// api/schema.js
// Vercel Serverless — Returns full Supabase public schema (table + column list)
// Used by ai-assist.js to inject exact column names into Claude's prompt
// Cached in-process for 10 minutes so it doesn't hammer the DB on every AI call

const { createClient } = require('@supabase/supabase-js');

let cachedSchema = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

async function fetchSchema() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase env vars not set');

  const sb = createClient(url, key);

  const { data, error } = await sb
    .from('information_schema.columns')
    .select('table_name, column_name, data_type, is_nullable, column_default')
    .eq('table_schema', 'public')
    .order('table_name')
    .order('ordinal_position');

  if (error) throw error;

  // Group by table
  const schema = {};
  for (const row of data) {
    if (!schema[row.table_name]) schema[row.table_name] = [];
    schema[row.table_name].push({
      name: row.column_name,
      type: row.data_type,
      nullable: row.is_nullable === 'YES',
    });
  }

  return schema;
}

// Exported for use by ai-assist.js directly (not just as HTTP endpoint)
async function getSchema() {
  const now = Date.now();
  if (cachedSchema && now < cacheExpiry) return cachedSchema;
  cachedSchema = await fetchSchema();
  cacheExpiry = now + CACHE_TTL_MS;
  return cachedSchema;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const schema = await getSchema();
    const table = req.query?.table;
    if (table) {
      return res.status(200).json({ table, columns: schema[table] || [] });
    }
    return res.status(200).json({ schema });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports.getSchema = getSchema;
