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
      sameSite: 'lax', // Changed from 'strict' to 'lax' to allow redirects
      path: '/',
    });
    
    console.log('Setting auth cookie:', cookie); // Debug log
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
    console.log('Token decoded:', decoded);
    
    if (!decoded) return null;
    
    try {
      // The token tells us the role - we trust this information
      const role = decoded.role;
      
      if (role === 'parent') {
        const parent = await getParentByEmail(decoded.email);
        if (parent) {
          // Attach the role to the returned user object
          return { ...parent, role: 'parent' };
        }
      } else if (role === 'staff') {
        const staff = await getStaffByEmail(decoded.email);
        if (staff) {
          // Attach the role to the returned user object
          return { ...staff, role: 'staff' };
        }
      }
    } catch (error) {
      console.error('Error in getCurrentUser:', error);
    }
    
    return null;
  }
  
  export function getAuthToken(req: NextApiRequest): string | null {
    // Try to get from cookies first
    const cookies = req.cookies;
    console.log('GetAuthToken - cookies:', cookies); // Debug log
    
    if (cookies && cookies[TOKEN_NAME]) {
      return cookies[TOKEN_NAME];
    }
    
    // Then try authorization header
    const authHeader = req.headers.authorization;
    console.log('GetAuthToken - auth header:', authHeader); // Debug log
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    return null;
  }
