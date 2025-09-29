import { neon } from '@netlify/neon';

export default async (req, res) => {
  const { email } = req.body;
  const sql = neon();
  if (!email) {
    return res.status(400).json({ error: 'E-mail não informado.' });
  }
  try {
    const [user] = await sql`SELECT id FROM users WHERE email = ${email}`;
    return res.status(200).json({ exists: !!user });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
