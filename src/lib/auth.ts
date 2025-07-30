import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from './database';
import { Tables } from './database';
import crypto from 'crypto';

export interface User {
  id: string;
  email: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  location?: string;
  native_dialect?: string;
  role: 'contributor' | 'moderator' | 'admin';
  bio?: string;
  contribution_count: number;
  review_count: number;
  email_verified: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  display_name?: string;
  location?: string;
  native_dialect?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const MAX_LOGIN_ATTEMPTS = 5;
const ACCOUNT_LOCK_TIME = 30 * 60 * 1000; // 30分钟

// 密码哈希
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

// 验证密码
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// 生成 JWT Token
export function generateToken(userId: string): string {
  return jwt.sign(
    { userId, type: 'access' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// 验证 JWT Token
export function verifyToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; type: string };
    if (decoded.type === 'access') {
      return { userId: decoded.userId };
    }
    return null;
  } catch (error) {
    return null;
  }
}

// 生成随机令牌
export function generateRandomToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// 创建用户会话
async function createSession(userId: string, token: string, userAgent?: string, ipAddress?: string) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7天

  await supabase
    .from('user_sessions')
    .insert([{
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
      user_agent: userAgent,
      ip_address: ipAddress,
    }]);
}

// 验证会话
async function validateSession(token: string): Promise<boolean> {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  
  const { data, error } = await supabase
    .from('user_sessions')
    .select('expires_at')
    .eq('token_hash', tokenHash)
    .gt('expires_at', new Date().toISOString())
    .single();

  return !error && !!data;
}

// 清除会话
async function clearSession(token: string) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  
  await supabase
    .from('user_sessions')
    .delete()
    .eq('token_hash', tokenHash);
}

// 检查账户是否被锁定
async function isAccountLocked(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from(Tables.USERS)
    .select('account_locked_until')
    .eq('id', userId)
    .single();

  if (error || !data?.account_locked_until) {
    return false;
  }

  return new Date(data.account_locked_until) > new Date();
}

// 增加登录尝试次数
async function incrementLoginAttempts(userId: string) {
  const { data, error } = await supabase
    .from(Tables.USERS)
    .select('login_attempts')
    .eq('id', userId)
    .single();

  if (error) return;

  const attempts = (data?.login_attempts || 0) + 1;
  const updateData: { login_attempts: number; account_locked_until?: string } = { login_attempts: attempts };

  // 如果达到最大尝试次数，锁定账户
  if (attempts >= MAX_LOGIN_ATTEMPTS) {
    updateData.account_locked_until = new Date(Date.now() + ACCOUNT_LOCK_TIME).toISOString();
  }

  await supabase
    .from(Tables.USERS)
    .update(updateData)
    .eq('id', userId);
}

// 重置登录尝试次数
async function resetLoginAttempts(userId: string) {
  await supabase
    .from(Tables.USERS)
    .update({
      login_attempts: 0,
      account_locked_until: null,
      last_login_at: new Date().toISOString(),
    })
    .eq('id', userId);
}

// 用户注册
export async function registerUser(data: RegisterData): Promise<{ user?: User; error?: string; token?: string }> {
  try {
    // 检查用户名和邮箱是否已存在
    const { data: existingUser } = await supabase
      .from(Tables.USERS)
      .select('id, username, email')
      .or(`username.eq.${data.username},email.eq.${data.email}`)
      .single();

    if (existingUser) {
      if (existingUser.username === data.username) {
        return { error: '用户名已存在' };
      }
      if (existingUser.email === data.email) {
        return { error: '邮箱已被注册' };
      }
    }

    // 哈希密码
    const passwordHash = await hashPassword(data.password);
    const verificationToken = generateRandomToken();

    // 创建用户
    const { data: newUser, error } = await supabase
      .from(Tables.USERS)
      .insert([
        {
          email: data.email,
          username: data.username,
          password_hash: passwordHash,
          display_name: data.display_name || data.username,
          location: data.location || '',
          native_dialect: data.native_dialect || '',
          role: 'contributor',
          email_verification_token: verificationToken,
          email_verification_expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24小时过期
        }
      ])
      .select(`
        id, email, username, display_name, avatar_url, location, native_dialect,
        role, bio, contribution_count, review_count, email_verified, 
        last_login_at, created_at, updated_at, is_active
      `)
      .single();

    if (error) {
      console.error('Registration error:', error);
      return { error: '注册失败，请稍后重试' };
    }

    // 生成访问令牌
    const token = generateToken(newUser.id);
    
    // 创建会话
    await createSession(newUser.id, token);
    
    return { 
      user: newUser as User, 
      token,
    };
  } catch (err: unknown) {
    console.error('Registration error:', err);
    return { error: '注册时发生错误' };
  }
}

// 用户登录
export async function loginUser(data: LoginData): Promise<{ user?: User; error?: string; token?: string }> {
  try {
    // 查找用户（包含密码哈希）
    const { data: user, error } = await supabase
      .from(Tables.USERS)
      .select('*')
      .eq('email', data.email)
      .eq('is_active', true)
      .single();

    if (error || !user) {
      return { error: '邮箱或密码错误' };
    }

    // 检查账户是否被锁定
    if (await isAccountLocked(user.id)) {
      return { error: '账户已被锁定，请稍后再试' };
    }

    // 验证密码
    const isPasswordValid = await verifyPassword(data.password, user.password_hash);
    if (!isPasswordValid) {
      // 增加登录尝试次数
      await incrementLoginAttempts(user.id);
      return { error: '邮箱或密码错误' };
    }

    // 重置登录尝试次数并更新最后登录时间
    await resetLoginAttempts(user.id);

    // 生成访问令牌
    const token = generateToken(user.id);
    
    // 创建会话
    await createSession(user.id, token);
    
    // 返回用户信息（不包含敏感信息）
    const { password_hash, email_verification_token, password_reset_token, login_attempts, account_locked_until, ...userInfo } = user;
    
    return { 
      user: userInfo as User, 
      token 
    };
  } catch (err: unknown) {
    console.error('Login error:', err);
    return { error: '登录时发生错误' };
  }
}

// 获取用户信息
export async function getUserById(userId: string): Promise<User | null> {
  try {
    const { data: user, error } = await supabase
      .from(Tables.USERS)
      .select(`
        id, email, username, display_name, avatar_url, location, native_dialect,
        role, bio, contribution_count, review_count, email_verified, 
        last_login_at, created_at, updated_at, is_active
      `)
      .eq('id', userId)
      .eq('is_active', true)
      .single();

    if (error || !user) {
      return null;
    }

    return user as User;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

// 更新用户信息
export async function updateUser(userId: string, data: Partial<User>): Promise<{ user?: User; error?: string }> {
  try {
    // 过滤掉不允许更新的字段
    const {
      id,
      email,
      contribution_count,
      review_count,
      email_verified,
      last_login_at,
      created_at,
      updated_at,
      ...updateData
    } = data;

    const { data: updatedUser, error } = await supabase
      .from(Tables.USERS)
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select(`
        id, email, username, display_name, avatar_url, location, native_dialect,
        role, bio, contribution_count, review_count, email_verified, 
        last_login_at, created_at, updated_at, is_active
      `)
      .single();

    if (error) {
      return { error: '更新用户信息失败' };
    }

    return { user: updatedUser as User };
  } catch (err: unknown) {
    console.error('User update error:', err);
    return { error: '更新时发生错误' };
  }
}

// 验证邮箱
export async function verifyEmail(token: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: user, error } = await supabase
      .from(Tables.USERS)
      .select('id, email_verification_expires')
      .eq('email_verification_token', token)
      .eq('email_verified', false)
      .single();

    if (error || !user) {
      return { success: false, error: '验证链接无效或已过期' };
    }

    // 检查是否过期
    if (user.email_verification_expires && new Date(user.email_verification_expires) < new Date()) {
      return { success: false, error: '验证链接已过期' };
    }

    // 更新用户验证状态
    const { error: updateError } = await supabase
      .from(Tables.USERS)
      .update({
        email_verified: true,
        email_verification_token: null,
        email_verification_expires: null,
      })
      .eq('id', user.id);

    if (updateError) {
      return { success: false, error: '验证失败，请稍后重试' };
    }

    return { success: true };
  } catch (err: unknown) {
    console.error('Email verification error:', err);
    return { success: false, error: '验证时发生错误' };
  }
}

// 请求密码重置
export async function requestPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: user, error } = await supabase
      .from(Tables.USERS)
      .select('id')
      .eq('email', email)
      .eq('is_active', true)
      .single();

    if (error || !user) {
      // 即使邮箱不存在也返回成功，避免泄露用户信息
      return { success: true };
    }

    const resetToken = generateRandomToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24小时后过期

    // 更新重置令牌
    const { error: updateError } = await supabase
      .from(Tables.USERS)
      .update({
        password_reset_token: resetToken,
        password_reset_expires: expiresAt.toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      return { success: false, error: '请求重置失败，请稍后重试' };
    }

    // TODO: 发送重置邮件
    console.log(`Password reset token for ${email}: ${resetToken}`);

    return { success: true };
  } catch (err: unknown) {
    console.error('Password reset request error:', err);
    return { success: false, error: '请求时发生错误' };
  }
}

// 重置密码
export async function resetPassword(token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: user, error } = await supabase
      .from(Tables.USERS)
      .select('id, password_reset_expires')
      .eq('password_reset_token', token)
      .single();

    if (error || !user) {
      return { success: false, error: '重置链接无效或已过期' };
    }

    // 检查是否过期
    if (user.password_reset_expires && new Date(user.password_reset_expires) < new Date()) {
      return { success: false, error: '重置链接已过期' };
    }

    // 哈希新密码
    const passwordHash = await hashPassword(newPassword);

    // 更新密码并清除重置令牌
    const { error: updateError } = await supabase
      .from(Tables.USERS)
      .update({
        password_hash: passwordHash,
        password_reset_token: null,
        password_reset_expires: null,
        login_attempts: 0,
        account_locked_until: null,
      })
      .eq('id', user.id);

    if (updateError) {
      return { success: false, error: '密码重置失败，请稍后重试' };
    }

    return { success: true };
  } catch (err: unknown) {
    console.error('Password reset error:', err);
    return { success: false, error: '重置时发生错误' };
  }
}

// 登出（清除会话）
export async function logout(token: string): Promise<void> {
  try {
    await clearSession(token);
  } catch (error) {
    console.error('Logout error:', error);
  }
}

// 更改密码
export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 获取当前密码哈希
    const { data: user, error } = await supabase
      .from(Tables.USERS)
      .select('password_hash')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return { success: false, error: '用户不存在' };
    }

    // 验证当前密码
    const isCurrentPasswordValid = await verifyPassword(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      return { success: false, error: '当前密码错误' };
    }

    // 哈希新密码
    const newPasswordHash = await hashPassword(newPassword);

    // 更新密码
    const { error: updateError } = await supabase
      .from(Tables.USERS)
      .update({
        password_hash: newPasswordHash,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      return { success: false, error: '密码更新失败' };
    }

    return { success: true };
  } catch (err: unknown) {
    console.error('Change password error:', err);
    return { success: false, error: '更改密码时发生错误' };
  }
}

// 更新用户贡献计数
export async function updateUserContributionCount(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 获取用户的总贡献数
    const { data: expressions, error: expressionsError } = await supabase
      .from(Tables.EXPRESSIONS)
      .select('id')
      .eq('contributor_id', userId);

    if (expressionsError) {
      console.error('Error fetching user expressions:', expressionsError);
      return { success: false, error: '获取用户贡献数据失败' };
    }

    const contributionCount = expressions?.length || 0;

    // 更新用户的贡献计数
    const { error: updateError } = await supabase
      .from(Tables.USERS)
      .update({ 
        contribution_count: contributionCount,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating user contribution count:', updateError);
      return { success: false, error: '更新贡献计数失败' };
    }

    return { success: true };
  } catch (err: unknown) {
    console.error('Update contribution count error:', err);
    return { success: false, error: '更新贡献计数时发生错误' };
  }
}

// 更新用户审核计数
export async function updateUserReviewCount(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 获取用户的总审核数
    const { data: expressions, error: expressionsError } = await supabase
      .from(Tables.EXPRESSIONS)
      .select('id')
      .eq('reviewer_id', userId)
      .not('reviewed_at', 'is', null);

    if (expressionsError) {
      console.error('Error fetching user reviews:', expressionsError);
      return { success: false, error: '获取用户审核数据失败' };
    }

    const reviewCount = expressions?.length || 0;

    // 更新用户的审核计数
    const { error: updateError } = await supabase
      .from(Tables.USERS)
      .update({ 
        review_count: reviewCount,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating user review count:', updateError);
      return { success: false, error: '更新审核计数失败' };
    }

    return { success: true };
  } catch (err: unknown) {
    console.error('Update review count error:', err);
    return { success: false, error: '更新审核计数时发生错误' };
  }
}

// 同步用户统计信息（同时更新贡献和审核计数）
export async function syncUserStats(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const [contributionResult, reviewResult] = await Promise.all([
      updateUserContributionCount(userId),
      updateUserReviewCount(userId)
    ]);

    if (!contributionResult.success) {
      return contributionResult;
    }

    if (!reviewResult.success) {
      return reviewResult;
    }

    return { success: true };
  } catch (err: unknown) {
    console.error('Sync user stats error:', err);
    return { success: false, error: '同步用户统计信息时发生错误' };
  }
}
