// lib/auth.ts
import { getParentByEmail, getStaffByEmail } from './parentStudent';
import { verify } from 'jsonwebtoken';
import { serialize } from 'cookie';
import { NextApiRequest, NextApiResponse } from 'next';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const TOKEN_NAME = 'school_auth_token';

export async function authenticateParent(email: string, password: string) {
  const parent = await getParentByEmail(email);
  
  if (!parent || parent.password !== password) {
    return null;
  }
  
  return {
    id: parent.id,
    firstName: parent.firstName,
    lastName: parent.lastName,
    email: parent.email,
    emoji: parent.emoji,
    role: 'parent'
  };
}

export async function authenticateStaff(email: string, password: string) {
  const staff = await getStaffByEmail(email);
  
  if (!staff || staff.password !== password) {
    return null;
  }
  
  return {
    id: staff.id,
    firstName: staff.firstName,
    lastName: staff.lastName,
    email: staff.email,
    emoji: staff.emoji,
    role: 'staff'
  };
}

export function generateToken(user: any) {
  const jwt = require('jsonwebtoken');
  
  // Create token that expires in 1 day
  return jwt.sign(
    { 
      id: user.id,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '1d' }
  );
}

export function setAuthCookie(res: NextApiResponse, token: string) {
  const cookie = serialize(TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    maxAge: 60 * 60 * 24, // 1 day
    sameSite: 'strict',
    path: '/'
  });
  
  res.setHeader('Set-Cookie', cookie);
}

export function removeAuthCookie(res: NextApiResponse) {
  const cookie = serialize(TOKEN_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    maxAge: -1,
    sameSite: 'strict',
    path: '/'
  });
  
  res.setHeader('Set-Cookie', cookie);
}

export function getAuthToken(req: NextApiRequest): string | null {
  // Try to get from cookies first
  const cookies = req.cookies;
  if (cookies && cookies[TOKEN_NAME]) {
    return cookies[TOKEN_NAME];
  }
  
  // Then try authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return null;
}

export function verifyToken(token: string) {
  try {
    return verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export async function getCurrentUser(req: NextApiRequest) {
  const token = getAuthToken(req);
  if (!token) return null;
  
  const decoded: any = verifyToken(token);
  if (!decoded) return null;
  
  if (decoded.role === 'parent') {
    return await getParentByEmail(decoded.email);
  } else if (decoded.role === 'staff') {
    return await getStaffByEmail(decoded.email);
  }
  
  return null;
}
