import { neon } from '@netlify/neon';
import bcrypt from 'bcryptjs';

export default async (req, res) => {
  try {
    const {
      email,
      password,
      nome,
      name,
      username,
      phone,
      type,
      status,
      invitationCode,
      securityQuestion,
      securityAnswer
    } = req.body;
    const sql = neon();
    if (!email || !password || !(nome || name || username)) {
      return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
    }
    const [existing] = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existing) {
      return res.status(409).json({ error: 'E-mail já cadastrado' });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const userNome = nome || name || username;
    const [user] = await sql`
      INSERT INTO users (email, password_hash, nome, username, phone, type, status, invitation_code, security_question, security_answer)
      VALUES (${email}, ${password_hash}, ${userNome}, ${username}, ${phone}, ${type || 'client'}, ${status || 'active'}, ${invitationCode}, ${securityQuestion}, ${securityAnswer})
      RETURNING id, email, nome, username, phone, type, status, invitation_code
    `;
    return res.status(201).json(user);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Erro interno.' });
  }
};
