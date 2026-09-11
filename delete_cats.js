const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.upckmqaxdgixuovrmutm:JHqTGxqcRKzWlkMW@aws-0-eu-central-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

const query = `
  DELETE FROM categories WHERE name NOT IN ('Poultry', 'Fish & Seafood', 'Processed Meat');
`;

client.connect()
  .then(() => client.query(query))
  .then((res) => console.log('Deleted ' + res.rowCount + ' unused categories'))
  .catch(e => console.error('Error:', e))
  .finally(() => client.end());
