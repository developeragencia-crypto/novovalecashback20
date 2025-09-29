import { neon } from '@netlify/neon';

export default async (req, res) => {
  const { phone } = req.body;
  const sql = neon();
  if (!phone) {
    return res.status(400).json({ error: 'Telefone não informado.' });
  }
  try {
    const [user] = await sql`SELECT id FROM users WHERE phone = ${phone}`;
    return res.status(200).json({ exists: !!user });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
