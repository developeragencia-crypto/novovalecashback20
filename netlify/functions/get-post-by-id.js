import { neon } from '@netlify/neon';

export default async (req, res) => {
  const postId = req.query.id || req.body.id;
  const sql = neon(); // Usa NETLIFY_DATABASE_URL automaticamente
  try {
    const [post] = await sql`SELECT * FROM posts WHERE id = ${postId}`;
    if (!post) {
      return res.status(404).json({ error: 'Post não encontrado' });
    }
    return res.status(200).json(post);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
