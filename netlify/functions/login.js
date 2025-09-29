import { neon } from '@netlify/neon';
import bcrypt from 'bcryptjs';

export default async (req, res) => {
  const { email, password } = req.body;
  const sql = neon();
  try {
    const [user] = await sql`SELECT * FROM users WHERE email = ${email}`;
    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Senha incorreta' });
    }
    // Aqui você pode gerar token/jwt ou sessão
    return res.status(200).json({ id: user.id, email: user.email, nome: user.nome });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
