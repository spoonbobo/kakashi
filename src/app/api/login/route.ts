import { NextResponse } from 'next/server';
import { Pool } from 'pg';
// import bcrypt from 'bcryptjs';

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: parseInt(process.env.PGPORT || '5432', 10),
});

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    const res = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = res.rows[0];

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isPasswordValid = password === user.password;

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    return NextResponse.json({ message: 'Login successful' });
  } catch (error) {
    console.error('Error during login:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}