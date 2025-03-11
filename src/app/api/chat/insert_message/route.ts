import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: parseInt(process.env.PGPORT || '5432'),
});
  
// export default async (req: NextApiRequest, res: NextApiResponse) => {
//     if (req.method === 'POST') {
//       const { sessionId, message } = req.body;
//       try {
//         await pool.query(
//           'INSERT INTO messages (session_id, timestamp, role, value) VALUES ($1, $2, $3, $4)',
//           [sessionId, message.timestamp, message.sender, message.text]
//         );
//         res.status(200).json({ success: true });
//       } catch (error) {
//         console.error('Error inserting message:', error);
//         res.status(500).json({ error: 'Internal Server Error' });
//       }
//     } else {
//       res.setHeader('Allow', ['POST']);
//       res.status(405).end(`Method ${req.method} Not Allowed`);
//     }
//   };

export async function POST(request: Request) {
    try {
        const { sessionId, message } = await request.json();
        await pool.query(
            'INSERT INTO messages (session_id, timestamp, role, value) VALUES ($1, $2, $3, $4)',
            [sessionId, message.timestamp, message.sender, message.text]
        );
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error('Error inserting message:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}