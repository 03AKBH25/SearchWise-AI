import express from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';

const router = express.Router();

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login', session: false }),
  (req, res) => {
    const token = signToken(req.user._id);
    
    res.cookie('jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.redirect(`${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/dashboard`);
  }
);

router.get('/me', async (req, res) => {
  const token = req.cookies.jwt;
  if (!token) return res.status(401).json({ message: 'Not authenticated' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await import('../models/User.js').then(m => m.default.findById(decoded.id));
    
    if (!user) return res.status(401).json({ message: 'User not found' });
    
    res.json({ user });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('jwt');
  res.json({ message: 'Logged out' });
});

export default router;
