import { Request, Response, NextFunction } from 'express';
import { checkSubscriptionLimits } from '../services/subscription';

export async function checkSubscriptionAccess(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const limits = await checkSubscriptionLimits(userId);
  req.subscriptionLimits = limits;

  next();
}
