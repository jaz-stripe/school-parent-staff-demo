// lib/auth.ts
import { getParentByEmail, getStaffByEmail } from './parentStudent';
import { verify } from 'jsonwebtoken';
import { serialize } from 'cookie';
import { NextApiRequest, NextApiResponse } from 'next';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const TOKEN_NAME = 'school_auth_token';

const PARENT_TOKEN_NAME = 'school_parent_auth';
const STAFF_TOKEN_NAME = 'school_staff_auth';

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

// Update the setAuthCookie function to use different cookie names based on role
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

// Update the removeAuthCookie function to remove the correct cookie
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

// Update getCurrentUser to specify the role when getting the token
export async function getCurrentUser(req: NextApiRequest, role?: 'parent' | 'staff') {
    const token = getAuthToken(req, role);
    
    if (!token) return null;
    
    const decoded: any = verifyToken(token);
    
    if (!decoded) return null;
    
    // If a role was specified, verify that the token matches that role
    if (role && decoded.role !== role) return null;
    
    if (decoded.role === 'parent') {
      return await getParentByEmail(decoded.email);
    } else if (decoded.role === 'staff') {
      return await getStaffByEmail(decoded.email);
    }
    
    return null;
  }

// export async function getCurrentUser(req: NextApiRequest) {
//     const token = getAuthToken(req);
    
//     if (!token) return null;
    
//     const decoded: any = verifyToken(token);
//     console.log('Token decoded:', decoded);
    
//     if (!decoded) return null;
    
//     try {
//       // The token tells us the role - we trust this information
//       const role = decoded.role;
      
//       if (role === 'parent') {
//         const parent = await getParentByEmail(decoded.email);
//         if (parent) {
//           // Attach the role to the returned user object
//           return { ...parent, role: 'parent' };
//         }
//       } else if (role === 'staff') {
//         const staff = await getStaffByEmail(decoded.email);
//         if (staff) {
//           // Attach the role to the returned user object
//           return { ...staff, role: 'staff' };
//         }
//       }
//     } catch (error) {
//       console.error('Error in getCurrentUser:', error);
//     }
    
//     return null;
//   }
  
// Update the getAuthToken function to check both cookie types
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
