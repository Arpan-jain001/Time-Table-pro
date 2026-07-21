const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { getFirebaseAdmin, isFirebaseReady } = require('../config/firebase');
const Notification = require('../models/Notification');
const { sendFCMNotification } = require('../utils/notificationScheduler');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '30d' });
};

const normalizeRollNumber = (rollNumber) => rollNumber?.toString().trim().toUpperCase();

const normalizeRequestedRole = (role) => {
  if (!role) return null;
  const normalizedRole = role.toString().trim().toLowerCase();
  return ['student', 'admin'].includes(normalizedRole) ? normalizedRole : null;
};

const roleLabel = (role) => role === 'admin' ? 'Admin' : 'Student';

const validateRequestedRole = (user, requestedRole, res) => {
  if (!requestedRole || user.role === requestedRole) return false;

  res.status(403).json({
    success: false,
    message: `Wrong role selected. This account is registered as ${roleLabel(user.role)}. Please switch to ${roleLabel(user.role)} login.`
  });
  return true;
};

const verifyGoogleIdToken = async (idToken) => {
  if (!idToken) {
    const error = new Error('Google ID token required');
    error.statusCode = 400;
    throw error;
  }

  if (!isFirebaseReady()) {
    const error = new Error('Google authentication is not configured on the server');
    error.statusCode = 503;
    throw error;
  }

  const firebaseAdmin = getFirebaseAdmin();
  const decoded = await firebaseAdmin.auth().verifyIdToken(idToken);

  if (!decoded.email) {
    const error = new Error('Google account email not available');
    error.statusCode = 400;
    throw error;
  }

  return decoded;
};

const buildResetEmailHtml = ({ name, resetUrl }) => `
  <div style="margin:0;padding:0;background:#f4f7fb;font-family:Inter,Arial,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 12px;background:#f4f7fb;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="background:#111827;padding:26px 28px;color:#ffffff;">
                <div style="font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:#93c5fd;">CampusFlow</div>
                <h1 style="margin:8px 0 0;font-size:26px;line-height:1.2;">Reset your password</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 28px;">
                <p style="margin:0 0 14px;font-size:16px;">Hi ${name || 'Student'},</p>
                <p style="margin:0 0 22px;font-size:15px;line-height:1.7;color:#4b5563;">We received a request to reset your Timetable Pro password. Use the secure button below. This link expires in 15 minutes.</p>
                <a href="${resetUrl}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:13px 20px;border-radius:10px;font-weight:700;font-size:14px;">Reset Password</a>
                <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">If the button does not work, copy this link:<br><span style="word-break:break-all;color:#374151;">${resetUrl}</span></p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;text-align:center;">
                Powered by CampusFlow<br>
                Developed by Arpan Jain
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
`;

const buildSectionUpdateEmailHtml = ({ name }) => `
  <div style="margin:0;padding:0;background:#f4f7fb;font-family:Inter,Arial,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 12px;background:#f4f7fb;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="background:linear-gradient(135deg,#4338ca,#6366f1);padding:28px 30px;color:#ffffff;">
                <div style="font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:#e0e7ff;">Timetable Pro</div>
                <h1 style="margin:8px 0 0;font-size:26px;line-height:1.2;">Please update your section</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 28px;">
                <p style="margin:0 0 12px;font-size:16px;">Hi ${name || 'Student'},</p>
                <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#4b5563;">
                  Your profile section needs to be updated so you continue receiving the correct timetable updates, announcements, and class alerts.
                </p>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#4b5563;">
                  Please open your profile page, select your correct section, and save the changes.
                </p>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/profile" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:13px 20px;border-radius:10px;font-weight:700;font-size:14px;">Open Profile</a>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;text-align:center;">
                Powered by Timetable Pro<br>
                Developed by Arpan Jain
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
`;

const sendResetEmail = async ({ to, name, resetUrl }) => {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured. Password reset email skipped.');
    return false;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'Timetable Pro <hello@urbantales-ecommerce.in>',
      to,
      subject: 'Reset your Timetable Pro password',
      html: buildResetEmailHtml({ name, resetUrl })
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend email failed: ${detail}`);
  }

  return true;
};

const sendSectionUpdateEmail = async ({ to, name }) => {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured. Section reminder email skipped.');
    return false;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'Timetable Pro <hello@urbantales-ecommerce.in>',
      to,
      subject: 'Please update your section on Timetable Pro',
      html: buildSectionUpdateEmailHtml({ name })
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Section reminder email failed: ${detail}`);
  }

  return true;
};

// @POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, section, year, session, universityRollNumber } = req.body;
    const rollNumber = normalizeRollNumber(universityRollNumber);

    if (!name || !email || !password || !rollNumber) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase().trim() },
        { universityRollNumber: rollNumber }
      ]
    });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email or roll number already registered' });
    }

    const user = await User.create({
      name,
      email,
      password,
      universityRollNumber: rollNumber,
      section,
      year,
      session,
      role: 'student',
      authProvider: 'local'
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token: generateToken(user._id),
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, identifier, password, role } = req.body;
    const loginId = (identifier || email || '').toString().trim();
    const requestedRole = normalizeRequestedRole(role);

    if (!loginId || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email/roll number and password' });
    }

    if (role && !requestedRole) {
      return res.status(400).json({ success: false, message: 'Invalid login role selected' });
    }

    const user = await User.findOne({
      $or: [
        { email: loginId.toLowerCase() },
        { universityRollNumber: normalizeRollNumber(loginId) }
      ]
    }).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Account not found. Kindly create your account first.'
      });
    }

    if (!user.password || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email/roll number or password' });
    }

    if (validateRequestedRole(user, requestedRole, res)) return;

    res.json({
      success: true,
      message: 'Login successful',
      token: generateToken(user._id),
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @POST /api/auth/google - Login existing user with Firebase Google auth
router.post('/google', async (req, res) => {
  try {
    const { idToken, role } = req.body;
    const requestedRole = normalizeRequestedRole(role);

    if (role && !requestedRole) {
      return res.status(400).json({ success: false, message: 'Invalid login role selected' });
    }

    const decoded = await verifyGoogleIdToken(idToken);
    const user = await User.findOne({ email: decoded.email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Account not found. Kindly create your account first.'
      });
    }

    if (validateRequestedRole(user, requestedRole, res)) return;

    if (!user.avatar && decoded.picture) {
      user.avatar = decoded.picture;
      await user.save({ validateBeforeSave: false });
    }

    res.json({
      success: true,
      message: 'Google login successful',
      token: generateToken(user._id),
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
});

// @POST /api/auth/google/register - Register new user with Firebase Google auth
router.post('/google/register', async (req, res) => {
  try {
    const { idToken, section, year, session, universityRollNumber } = req.body;
    const decoded = await verifyGoogleIdToken(idToken);
    const rollNumber = normalizeRollNumber(universityRollNumber);

    if (!rollNumber || !section) {
      return res.status(400).json({ success: false, message: 'Roll number and section are required for Google registration' });
    }

    const existingUser = await User.findOne({
      $or: [
        { email: decoded.email.toLowerCase() },
        { universityRollNumber: rollNumber }
      ]
    });

    if (existingUser) {
      const message = existingUser.email === decoded.email.toLowerCase()
        ? 'Account already exists. Please sign in with Google.'
        : 'Roll number already registered with another account';
      return res.status(400).json({ success: false, message });
    }

    const user = await User.create({
      name: decoded.name || decoded.email.split('@')[0],
      email: decoded.email,
      universityRollNumber: rollNumber,
      avatar: decoded.picture || null,
      section,
      year: year || '4th Year',
      session: session || '2026-27',
      role: 'student',
      authProvider: 'google'
    });

    res.status(201).json({
      success: true,
      message: 'Google registration successful',
      token: generateToken(user._id),
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Google registration error:', error);
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
});

// @POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { emailOrRoll } = req.body;
    const identifier = emailOrRoll?.toString().trim();

    if (!identifier) {
      return res.status(400).json({ success: false, message: 'Email or roll number required' });
    }

    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { universityRollNumber: normalizeRollNumber(identifier) }
      ]
    }).select('+passwordResetToken +passwordResetExpires');

    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      user.passwordResetToken = crypto.createHash('sha256').update(rawToken).digest('hex');
      user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
      await user.save({ validateBeforeSave: false });

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const resetUrl = `${frontendUrl.replace(/\/$/, '')}/reset-password?token=${rawToken}`;
      await sendResetEmail({ to: user.email, name: user.name, resetUrl });
    }

    res.json({
      success: true,
      message: 'If an account exists, a password reset link has been sent.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Unable to send reset email right now' });
  }
});

// @POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Valid token and 6 character password required' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() }
    }).select('+passwordResetToken +passwordResetExpires +password');

    if (!user) {
      return res.status(400).json({ success: false, message: 'Reset link is invalid or expired' });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    if (user.authProvider === 'google') user.authProvider = 'local';
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successful',
      token: generateToken(user._id),
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  try {
    res.json({ success: true, user: req.user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @PUT /api/auth/fcm-token
router.put('/fcm-token', protect, async (req, res) => {
  try {
    const { fcmToken } = req.body;

    if (!fcmToken || typeof fcmToken !== 'string') {
      return res.status(400).json({ success: false, message: 'Valid FCM token required' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { fcmToken: fcmToken.trim() } },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: 'FCM token updated', fcmTokenSaved: Boolean(user.fcmToken) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @POST /api/auth/save-fcm-token (alias for frontend convenience)
router.post('/save-fcm-token', protect, async (req, res) => {
  try {
    const { fcmToken } = req.body;
    if (!fcmToken || typeof fcmToken !== 'string') {
      return res.status(400).json({ success: false, message: 'Valid FCM token required' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { fcmToken: fcmToken.trim() } },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    console.log(`FCM token saved for user ${req.user._id}`);
    res.json({ success: true, message: 'FCM token saved successfully', fcmTokenSaved: Boolean(user.fcmToken) });
  } catch (error) {
    console.error('FCM token save error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @POST /api/auth/send-section-update-notification
router.post('/send-section-update-notification', protect, async (req, res) => {
  try {
    const { recipientEmail, recipientId, subject, message } = req.body;
    const query = { isActive: true, role: { $in: ['student', 'admin'] } };

    if (recipientEmail) {
      query.email = recipientEmail.toLowerCase();
    }
    if (recipientId) {
      query._id = recipientId;
    }

    const recipients = await User.find(query).select('name email fcmToken');

    if (!recipients.length) {
      return res.json({ success: true, sent: 0, message: 'No recipients found' });
    }

    const title = subject?.trim() || 'Please update your section';
    const body = message?.trim() || 'Please update your section in your profile page so you keep receiving the correct timetable updates.';

    await Notification.insertMany(recipients.map(recipient => ({
      userId: recipient._id,
      title,
      message: body,
      type: 'section_update_required',
      sentAt: new Date(),
      metadata: { route: '/profile' }
    })));

    const tokens = recipients.filter(recipient => recipient.fcmToken).map(recipient => recipient.fcmToken);
    if (tokens.length > 0) {
      await sendFCMNotification(tokens, title, body, {
        type: 'section_update_required',
        route: '/profile'
      });
    }

    for (const recipient of recipients) {
      if (recipient.email) {
        await sendSectionUpdateEmail({ to: recipient.email, name: recipient.name });
      }
    }

    res.json({ success: true, sent: recipients.length, message: 'Section update reminder sent' });
  } catch (error) {
    console.error('Section update notification error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @PUT /api/auth/profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, section, year, session } = req.body;
    const normalizedSection = section?.toString().trim().toUpperCase();
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, section: normalizedSection || undefined, year, session },
      { new: true }
    );
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
