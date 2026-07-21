const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Section = require('../models/Section');
const Timetable = require('../models/Timetable');
const { protect, adminOnly } = require('../middleware/auth');

const buildBroadcastEmailHtml = ({ subject, message, senderName }) => `
  <div style="margin:0;padding:0;background:#f4f7fb;font-family:Inter,Arial,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 12px;background:#f4f7fb;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="background:linear-gradient(135deg,#4338ca,#6366f1);padding:28px 30px;color:#ffffff;">
                <div style="font-size:13px;letter-spacing:1.5px;text-transform:uppercase;color:#e0e7ff;">Timetable Pro</div>
                <h1 style="margin:8px 0 0;font-size:26px;line-height:1.2;">${subject}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 28px;">
                <p style="margin:0 0 12px;font-size:16px;">Hello,</p>
                <div style="font-size:15px;line-height:1.8;color:#4b5563;white-space:pre-wrap;">${message}</div>
                <p style="margin:24px 0 0;font-size:14px;line-height:1.7;color:#6b7280;">Regards,<br/>${senderName || 'Admin Team'}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;background:#f9fafb;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;text-align:center;">
                Powered by Timetable Pro<br/>
                Developed by Arpan Jain
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
`;

const sendBroadcastEmail = async ({ to, subject, message, senderName }) => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY not configured. Email broadcast skipped.');
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
      subject,
      html: buildBroadcastEmailHtml({ subject, message, senderName })
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Broadcast email failed: ${detail}`);
  }

  return true;
};

// @GET /api/admin/stats
router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    const [totalStudents, totalSections, totalSubjects, totalEntries] = await Promise.all([
      User.countDocuments({ role: 'student', isActive: true }),
      Section.countDocuments({ isActive: true }),
      Timetable.distinct('subjectCode', { isActive: true }).then(r => r.length),
      Timetable.countDocuments({ isActive: true })
    ]);

    res.json({
      success: true,
      stats: { totalStudents, totalSections, totalSubjects, totalEntries }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @GET /api/admin/students
router.get('/students', protect, adminOnly, async (req, res) => {
  try {
    const students = await User.find({ role: 'student', isActive: true }).sort({ createdAt: -1 });
    res.json({ success: true, students });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @POST /api/admin/broadcast-email
router.post('/broadcast-email', protect, adminOnly, async (req, res) => {
  try {
    const { subject, message } = req.body;
    const senderName = req.user?.name || 'Admin Team';

    if (!subject || !message) {
      return res.status(400).json({ success: false, message: 'Subject and message are required' });
    }

    const recipients = await User.find({ isActive: true }).select('name email role');
    const emails = recipients
      .map((recipient) => recipient.email)
      .filter(Boolean);

    if (!emails.length) {
      return res.json({ success: true, sent: 0, message: 'No active recipients found' });
    }

    let sent = 0;
    const errors = [];

    for (const email of emails) {
      try {
        await sendBroadcastEmail({
          to: email,
          subject,
          message,
          senderName
        });
        sent += 1;
      } catch (error) {
        errors.push(error.message);
      }
    }

    res.json({
      success: true,
      sent,
      totalRecipients: emails.length,
      message: `Broadcast email sent to ${sent} of ${emails.length} recipients`,
      errors: errors.slice(0, 5)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @POST /api/admin/send-section-update-notification
router.post('/send-section-update-notification', protect, adminOnly, async (req, res) => {
  try {
    const { subject, message } = req.body;
    const senderName = req.user?.name || 'Admin Team';
    const finalSubject = subject?.trim() || 'Please update your section';
    const finalMessage = message?.trim() || 'Please update your section in your profile page so you continue receiving the correct timetable updates.';

    const recipients = await User.find({ isActive: true }).select('name email role');
    const emails = recipients
      .map((recipient) => recipient.email)
      .filter(Boolean);

    if (!emails.length) {
      return res.json({ success: true, sent: 0, message: 'No active recipients found' });
    }

    let sent = 0;
    const errors = [];

    for (const email of emails) {
      try {
        await sendBroadcastEmail({
          to: email,
          subject: finalSubject,
          message: finalMessage,
          senderName
        });
        sent += 1;
      } catch (error) {
        errors.push(error.message);
      }
    }

    res.json({
      success: true,
      sent,
      totalRecipients: emails.length,
      message: `Section reminder sent to ${sent} of ${emails.length} recipients`,
      errors: errors.slice(0, 5)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/create-admin', protect, adminOnly, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const admin = await User.create({
      name,
      email,
      password,
      role: 'admin'
    });

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      admin: admin.toJSON()
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/update-admin/:id', protect, adminOnly, async (req, res) => {
  try {
    const { name, email } = req.body;

    const admin = await User.findByIdAndUpdate(
      req.params.id,
      { name, email },
      { new: true }
    );

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    res.json({ success: true, admin });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.delete('/delete-admin/:id', protect, adminOnly, async (req, res) => {
  try {
    const admin = await User.findByIdAndDelete(req.params.id);

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    res.json({ success: true, message: 'Admin deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.get('/admins', protect, adminOnly, async (req, res) => {
  try {
    const admins = await User.find({ role: 'admin' }).sort({ createdAt: -1 });
    res.json({ success: true, admins });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin login (create default admin if not exists)
router.post('/setup', async (req, res) => {
  try {
    const existing = await User.findOne({ role: 'admin' });
    if (existing) {
      return res.json({ success: false, message: 'Admin already exists' });
    }
    const admin = await User.create({
      name: 'Admin',
      email: process.env.ADMIN_EMAIL || 'admin@college.edu',
      password: process.env.ADMIN_PASSWORD || 'admin123',
      role: 'admin'
    });
    res.json({ success: true, message: 'Admin created', email: admin.email });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
