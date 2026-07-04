import { Router } from 'express';
import { getAdminAuth } from '../firebase-admin.js';
import { ROLES, isAdmin } from '../middleware/auth.js';

const router = Router();

const ADMIN_UID = process.env.ADMIN_UID || '';

// Verify token + return user info with roles
router.post('/verify', async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ error: 'Missing idToken' });

  try {
    const auth = getAdminAuth();
    const decoded = await auth.verifyIdToken(idToken);
    const uid = decoded.uid;
    const admin = uid === ADMIN_UID;

    res.json({
      uid,
      email: decoded.email || '',
      name: decoded.name || decoded.email?.split('@')[0] || 'User',
      role: admin ? ROLES.ADMIN : ROLES.EDITOR,
      isAdmin: admin,
    });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token', code: 'UNAUTHORIZED' });
  }
});

// Get current user info (from already-verified token via middleware)
router.get('/me', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  res.json({
    ...req.user,
    isAdmin: isAdmin(req.user.uid),
  });
});

// Check if user has admin access
router.get('/check-admin', (req, res) => {
  const uid = req.query.uid || '';
  res.json({ isAdmin: isAdmin(uid) });
});

export default router;
