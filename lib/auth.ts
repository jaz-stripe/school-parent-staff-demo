// lib/auth.ts
import { getParentByEmailAndAccount, getStaffByEmailAndAccount } from './parentStudent';
import { verify } from 'jsonwebtoken';
import { serialize } from 'cookie';
import { NextApiRequest, NextApiResponse } from 'next';
import { getDb } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const TOKEN_NAME = 'school_auth_token';

const PARENT_TOKEN_NAME = 'school_parent_auth';
const STAFF_TOKEN_NAME = 'school_staff_auth';

export async function authenticateParent(email: string, password: string, accountId: number) {
  const parent = await getParentByEmailAndAccount(email, accountId);
  
  if (!parent || parent.password !== password) {
    return null;
  }
  
  return {
    id: parent.id,
    firstName: parent.firstName,
    lastName: parent.lastName,
    email: parent.email,
    emoji: parent.emoji,
    role: 'parent',
    accountId: parent.accountId
  };
}

export async function authenticateStaff(email: string, password: string, accountId: number) {
  const staff = await getStaffByEmailAndAccount(email, accountId);
  
  if (!staff || staff.password !== password) {
    return null;
  }
  
  return {
    id: staff.id,
    firstName: staff.firstName,
    lastName: staff.lastName,
    email: staff.email,
    emoji: staff.emoji,
    role: 'staff',
    accountId: staff.accountId
  };
}

export function generateToken(user: any) {
  const jwt = require('jsonwebtoken');
  
  // Include accountId in the token
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      accountId: user.accountId
    },
    JWT_SECRET,
    { expiresIn: '1d' }
  );
}

export function setAuthCookie(res: NextApiResponse, token: string, role: 'parent' | 'staff') {
  const tokenName = role === 'parent' ? PARENT_TOKEN_NAME : STAFF_TOKEN_NAME;
  
  const cookie = serialize(tokenName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    maxAge: 60 * 60 * 24, // 1 day
    sameSite: 'lax',
    path: '/',
  });
  
  res.setHeader('Set-Cookie', cookie);
}

export function removeAuthCookie(res: NextApiResponse, role: 'parent' | 'staff') {
  const tokenName = role === 'parent' ? PARENT_TOKEN_NAME : STAFF_TOKEN_NAME;
  
  const cookie = serialize(tokenName, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    maxAge: -1,
    sameSite: 'lax',
    path: '/',
  });
  
  res.setHeader('Set-Cookie', cookie);
}

export function verifyToken(token: string) {
  try {
    return verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export async function getCurrentUser(req: NextApiRequest, role?: 'parent' | 'staff') {
  const token = getAuthToken(req, role);
  
  if (!token) return null;
  
  const decoded: any = verifyToken(token);
  
  if (!decoded) return null;
  
  // If a role was specified, verify that the token matches that role
  if (role && decoded.role !== role) return null;
  
  const db = await getDb();
  
  if (decoded.role === 'parent') {
    return await db.get(`
      SELECT p.*, a.accountId as stripeAccountId, a.name as accountName, a.logo as accountLogo 
      FROM parent p
      JOIN account a ON p.accountId = a.id
      WHERE p.id = ? AND p.accountId = ?
    `, [decoded.id, decoded.accountId]);
} else if (decoded.role === 'staff') {
  return await db.get(`
    SELECT s.*, a.accountId as stripeAccountId, a.name as accountName, a.logo as accountLogo 
    FROM staff s
    JOIN account a ON s.accountId = a.id
    WHERE s.id = ? AND s.accountId = ?
  `, [decoded.id, decoded.accountId]);
}

return null;
}

export function getAuthToken(req: NextApiRequest, role?: 'parent' | 'staff'): string | null {
const cookies = req.cookies;

// If role is specified, only check that specific cookie
if (role === 'parent' && cookies[PARENT_TOKEN_NAME]) {
  return cookies[PARENT_TOKEN_NAME];
}

if (role === 'staff' && cookies[STAFF_TOKEN_NAME]) {
  return cookies[STAFF_TOKEN_NAME];
}

// If no role is specified, check both (for backward compatibility)
if (!role) {
  if (cookies[PARENT_TOKEN_NAME]) {
    return cookies[PARENT_TOKEN_NAME];
  }
  
  if (cookies[STAFF_TOKEN_NAME]) {
    return cookies[STAFF_TOKEN_NAME];
  }
}

// Then try authorization header
const authHeader = req.headers.authorization;
if (authHeader && authHeader.startsWith('Bearer ')) {
  return authHeader.substring(7);
}

return null;
}
