import { neon } from '@netlify/neon';

export default async (req, res) => {
  const sql = neon();
  try {
    const users = await sql`SELECT id, email, nome FROM users ORDER BY id DESC`;
    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
