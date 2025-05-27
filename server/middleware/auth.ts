import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// TODO: Move this to a secure environment variable and ensure it's the same as in routes.ts
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-and-long-jwt-key"; 

interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    username: string;
  };
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token == null) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      console.error("JWT verification error:", err.message);
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Unauthorized: Token expired' });
      }
      return res.status(403).json({ message: 'Forbidden: Invalid token' });
    }

    // Attach user payload to request object
    // The payload should contain userId and username as set during token signing
    req.user = user as { userId: number; username: string }; 
    next();
  });
};
