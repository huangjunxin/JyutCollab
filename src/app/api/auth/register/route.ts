import { NextRequest, NextResponse } from 'next/server';
import { registerUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, username, display_name, location, native_dialect } = body;

    if (!email || !password || !username) {
      return NextResponse.json(
        { error: '邮箱、密码和用户名是必需的' },
        { status: 400 }
      );
    }

    const result = await registerUser({
      email,
      password,
      username,
      display_name,
      location,
      native_dialect,
    });

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      user: result.user,
      token: result.token,
    });
  } catch (error) {
    console.error('Register API error:', error);
    return NextResponse.json(
      { error: '注册时发生错误' },
      { status: 500 }
    );
  }
} 