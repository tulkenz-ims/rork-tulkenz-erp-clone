// api/schema.js
// Vercel Serverless — Returns full Supabase public schema via RPC
// Requires migration_055_schema_rpc.sql to be run in Supabase first
// Cached in-process for 10 minutes

const { createClient } = require('@supabase/supabase-js');

let cachedSchema = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

async function fetchSchema() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase env vars not set');

  const sb = createClient(url, key);
  const { data, error } = await sb.rpc('get_public_schema');
  if (error) throw new Error(`Schema RPC failed: ${error.message}`);
  return data; // already { table_name: [{ name, type, nullable }] }
}

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
    if (table) return res.status(200).json({ table, columns: schema[table] || [] });
    return res.status(200).json({ schema });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports.getSchema = getSchema;
