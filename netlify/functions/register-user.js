import { neon } from '@netlify/neon';
import bcrypt from 'bcryptjs';

export default async (req, res) => {
  const { email, password, nome } = req.body;
  const sql = neon();
  try {
    const [existing] = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existing) {
      return res.status(409).json({ error: 'E-mail já cadastrado' });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const [user] = await sql`INSERT INTO users (email, password_hash, nome) VALUES (${email}, ${password_hash}, ${nome}) RETURNING id, email, nome`;
    return res.status(201).json(user);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
