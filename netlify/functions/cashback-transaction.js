import { neon } from '@netlify/neon';

export default async (req, res) => {
  const { userId, amount } = req.body;
  const sql = neon();
  try {
    // Exemplo: Adiciona cashback ao usuário e registra transação
    await sql`UPDATE users SET cashback = cashback + ${amount} WHERE id = ${userId}`;
    const [transaction] = await sql`INSERT INTO transactions (user_id, amount, type) VALUES (${userId}, ${amount}, 'cashback') RETURNING id, user_id, amount, type`;
    return res.status(201).json(transaction);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
