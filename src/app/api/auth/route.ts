import { NextResponse } from 'next/server';
import db from '@/lib/db';
import jwt from 'jsonwebtoken';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    const users = await db('users').where({ username }).select('*');

    const user = users[0];

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isPasswordValid = password === user.password;

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET!,
      { 
        expiresIn: '1h',
        algorithm: 'HS256'
      }
    );

    return NextResponse.json({ 
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username
      }
    });
  } catch (error) {
    console.error('Error during login:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}