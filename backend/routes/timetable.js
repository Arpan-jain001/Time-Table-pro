const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');
const Timetable = require('../models/Timetable');
const Section = require('../models/Section');
const Holiday = require('../models/Holiday');
const ReferenceFile = require('../models/ReferenceFile');
const { protect, adminOnly } = require('../middleware/auth');
const { 
  sendTimetableUpdateNotification,
  sendClassCancelledNotification,
  sendRoomChangedNotification
} = require('../utils/notificationScheduler');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const normalizeHeader = (value) => value?.toString().toLowerCase().replace(/[^a-z0-9]/g, '') || '';

const getCell = (row, aliases, fallback = '') => {
  const normalizedAliases = aliases.map(normalizeHeader);
  const key = Object.keys(row).find(column => normalizedAliases.includes(normalizeHeader(column)));
  return key ? row[key] : fallback;
};

const toWorkbookPreview = (buffer) => {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  return workbook.SheetNames.map(sheetName => {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      defval: '',
      header: 1,
      blankrows: false
    });

    return {
      sheetName,
      headers: rows[0] || [],
      rows: rows.slice(1, 101),
      totalRows: Math.max(rows.length - 1, 0)
    };
  });
};

const getReferenceBuffer = (refFile) => {
  if (refFile?.fileData?.length) return refFile.fileData;

  if (refFile?.storedFileName) {
    const filePath = path.join(__dirname, '../public/reference-files', refFile.storedFileName);
    if (fs.existsSync(filePath)) return fs.readFileSync(filePath);
  }

  return null;
};

// Parse section ranges like "3A,3B,3C" or "3A-3F"
const parseSections = (sectionStr) => {
  if (!sectionStr) return [];
  sectionStr = sectionStr.toString().trim();
  
  const sections = [];
  
  if (sectionStr.includes('-') && !sectionStr.includes(',')) {
    const parts = sectionStr.split('-');
    if (parts.length === 2) {
      const prefix = parts[0].replace(/[A-Z]$/i, '');
      const startChar = parts[0].replace(prefix, '').toUpperCase();
      const endChar = parts[1].replace(prefix, '').toUpperCase();
      const startCode = startChar.charCodeAt(0);
      const endCode = endChar.charCodeAt(0);
      for (let i = startCode; i <= endCode; i++) {
        sections.push(prefix + String.fromCharCode(i));
      }
      return sections;
    }
  }
  
  return sectionStr.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
};

// Convert time format
const normalizeTime = (timeVal) => {
  if (!timeVal) return '';
  if (typeof timeVal === 'number') {
    const totalMinutes = Math.round(timeVal * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h = hours % 12 || 12;
    return `${String(h).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
  }
  return timeVal.toString().trim();
};

const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const clean = timeStr.toString().trim().toUpperCase();
  const match = clean.match(/(\d+):(\d+)\s*(AM|PM)/);
  if (!match) return 0;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3];

  if (ampm === 'PM' && hours !== 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;

  return hours * 60 + minutes;
};

const sortByStartTime = (entries) => (
  entries.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
);

const normalizeTimetablePayload = (payload) => {
  const reminderBeforeMinutes = Number(payload.reminderBeforeMinutes ?? payload.reminderBefore ?? payload.reminderMinutes ?? 10);

  return {
    ...payload,
    reminderBeforeMinutes: Number.isFinite(reminderBeforeMinutes) ? reminderBeforeMinutes : 10,
    batch: payload.batch || payload.section || ''
  };
};

// @GET /api/timetable - Get timetable for logged-in student
router.get('/', protect, async (req, res) => {
  try {
    const { date, week } = req.query;
    const user = req.user;

    if (!user.section || !user.session) {
      return res.status(400).json({ success: false, message: 'Please update your profile with section and session' });
    }

    const targetDate = date ? moment.tz(date, 'Asia/Kolkata') : moment.tz('Asia/Kolkata');
    const selectedDate = targetDate.format('YYYY-MM-DD');
    const today = moment.tz('Asia/Kolkata').format('YYYY-MM-DD');
    const showRealtimeStatus = selectedDate === today;
    const dayName = targetDate.format('dddd');

    // Check holiday
    const holiday = await Holiday.findOne({ date: selectedDate, isActive: true });
    if (holiday) {
      return res.json({
        success: true,
        holiday: holiday.reason,
        timetable: [],
        date: selectedDate,
        day: dayName,
        showRealtimeStatus
      });
    }

    // Get timetable (optimized with field selection and lean)
    const timetable = await Timetable.find({
      section: user.section.toUpperCase(),
      session: user.session,
      day: dayName,
      isActive: true,
      type: { $ne: 'Free' }
    })
    .select('subjectName subjectCode facultyName room block startTime endTime reminderBeforeMinutes type isCancelled cancellationReason roomChanged oldRoom')
    .lean();
    sortByStartTime(timetable);

    res.json({
      success: true,
      timetable,
      date: selectedDate,
      day: dayName,
      showRealtimeStatus,
      section: user.section,
      session: user.session
    });
  } catch (error) {
    console.error('Timetable fetch error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @GET /api/timetable/week - Get weekly timetable
router.get('/week', protect, async (req, res) => {
  try {
    const user = req.user;
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const timetable = await Timetable.find({
      section: user.section.toUpperCase(),
      session: user.session,
      day: { $in: days },
      isActive: true,
      type: { $ne: 'Free' }
    })
    .select('day subjectName subjectCode facultyName room block startTime endTime reminderBeforeMinutes type isCancelled')
    .sort({ day: 1 })
    .lean();

    const grouped = {};
    days.forEach(d => { grouped[d] = []; });
    timetable.forEach(entry => {
      if (grouped[entry.day]) grouped[entry.day].push(entry);
    });
    Object.values(grouped).forEach(sortByStartTime);

    res.json({ success: true, timetable: grouped });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @GET /api/timetable/all - Admin: get all timetable entries
router.get('/all', protect, adminOnly, async (req, res) => {
  try {
    const { section, session, year, day } = req.query;
    const query = {};
    if (section) query.section = section;
    if (session) query.session = session;
    if (year) query.year = year;
    if (day) query.day = day;

    const timetable = await Timetable.find(query)
    .select('section session day year subjectName subjectCode facultyName room block startTime endTime reminderBeforeMinutes type isActive isCancelled')
    .sort({ section: 1, day: 1 })
    .lean();
    timetable.sort((a, b) => (
      (a.section || '').localeCompare(b.section || '') ||
      (a.day || '').localeCompare(b.day || '') ||
      timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    ));
    res.json({ success: true, timetable });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @POST /api/timetable/upload - Admin: upload Excel
router.post('/upload', protect, adminOnly, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: false });
    const results = { created: 0, updated: 0, errors: [], sections: new Set() };

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      for (const row of rows) {
        try {
          const sectionStr = getCell(row, ['Section', 'Class', 'Batch', 'Group']);
          const sectionsArr = parseSections(sectionStr);

          if (!sectionsArr.length) continue;

          const day = getCell(row, ['Day', 'Weekday']);
          const subjectName = getCell(row, ['Subject', 'SubjectName', 'Subject Name', 'Course', 'CourseName']);
          const subjectCode = getCell(row, ['Code', 'SubjectCode', 'Subject Code', 'CourseCode']);
          const facultyName = getCell(row, ['Faculty', 'FacultyName', 'Faculty Name', 'Teacher', 'Professor']);
          const room = getCell(row, ['Room', 'RoomNo', 'Room No', 'Classroom']);
          const block = getCell(row, ['Block', 'Building']);
          const startTime = normalizeTime(getCell(row, ['StartTime', 'Start Time', 'From', 'Begin']));
          const endTime = normalizeTime(getCell(row, ['EndTime', 'End Time', 'To', 'Finish']));
          const reminderBeforeMinutes = Number(getCell(row, ['ReminderBeforeMinutes', 'Reminder Minutes', 'ReminderBefore', 'Reminder'], 10));
          const type = getCell(row, ['Type', 'ClassType', 'Class Type'], 'Theory');
          const session = getCell(row, ['Session', 'AcademicSession'], req.body.session || '2026-27');
          const year = getCell(row, ['Year', 'AcademicYear'], req.body.year || '4th Year');

          if (!day || !subjectName || !startTime || !endTime) continue;

          for (const section of sectionsArr) {
            results.sections.add(section);

            // Auto-create section if not exists with proper session and year
            await Section.findOneAndUpdate(
              { name: section.toUpperCase(), session: session.toString() },
              { 
                name: section.toUpperCase(), 
                session: session.toString(), 
                year: year.toString(), 
                isActive: true 
              },
              { upsert: true, new: true }
            );

            // Upsert timetable entry
            const filter = { section: section.toUpperCase(), day, startTime, session: session.toString() };
            const update = { 
              section: section.toUpperCase(), 
              day, 
              subjectName, 
              subjectCode, 
              facultyName, 
              room, 
              block, 
              startTime, 
              endTime, 
              reminderBeforeMinutes: Number.isFinite(reminderBeforeMinutes) ? reminderBeforeMinutes : 10,
              type, 
              session: session.toString(), 
              year: year.toString(), 
              isActive: true 
            };

            const existing = await Timetable.findOne(filter);
            if (existing) {
              await Timetable.findOneAndUpdate(filter, update);
              results.updated++;
            } else {
              await Timetable.create(update);
              results.created++;
            }
          }
        } catch (rowErr) {
          results.errors.push(rowErr.message);
        }
      }
    }

    // Save reference file metadata
    {
      const publicDir = path.join(__dirname, '../public/reference-files');
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }

      const timestamp = Date.now();
      const fileExtension = path.extname(req.file.originalname);
      const fileName = `timetable-reference-${timestamp}${fileExtension}`;
      const filePath = path.join(publicDir, fileName);

      // Archive previous references
      const referenceSession = req.body.session || '2026-27';
      const referenceYear = req.body.year || '4th Year';
      await ReferenceFile.updateMany(
        { session: referenceSession, status: 'active' },
        { status: 'archived', isActive: false }
      );

      // Save reference metadata to database
      await ReferenceFile.create({
        fileName: req.file.originalname,
        storedFileName: fileName,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        fileData: Buffer.from(req.file.buffer),
        uploadedBy: req.user.name || 'Admin',
        session: referenceSession,
        year: referenceYear,
        status: 'active',
        isActive: true,
        description: `Official timetable reference uploaded for ${referenceSession} (${referenceYear})`
      });

      console.log('✅ Reference file saved:', fileName);
    }
    // Notify all students about timetable update
    sendTimetableUpdateNotification();

    res.json({
      success: true,
      message: `Processed: ${results.created} created, ${results.updated} updated`,
      sections: [...results.sections],
      created: results.created,
      updated: results.updated,
      errors: results.errors
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @POST /api/timetable - Admin: manual entry
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { section, day, startTime, session, year } = req.body;
    
    // Ensure year is set for 2026-27 session
    const finalYear = year || '4th Year';
    const finalSession = session || '2026-27';
    
    // Auto-create section
    if (section && finalSession) {
      await Section.findOneAndUpdate(
        { name: section.toUpperCase(), session: finalSession },
        { name: section.toUpperCase(), session: finalSession, year: finalYear, isActive: true },
        { upsert: true, new: true }
      );
    }

    const existing = await Timetable.findOne({ section: section?.toUpperCase(), day, startTime, session: finalSession });
    if (existing) {
      const updated = await Timetable.findByIdAndUpdate(existing._id, normalizeTimetablePayload({ ...req.body, year: finalYear, session: finalSession }), { new: true });
      return res.json({ success: true, timetable: updated, message: 'Updated existing entry' });
    }

    const timetable = await Timetable.create({ 
      ...normalizeTimetablePayload(req.body), 
      section: section?.toUpperCase(),
      year: finalYear,
      session: finalSession
    });
    res.status(201).json({ success: true, timetable });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @PUT /api/timetable/:id - Admin: edit entry
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const original = await Timetable.findById(req.params.id);
    if (!original) return res.status(404).json({ success: false, message: 'Not found' });

    // Ensure year is set for updates
    const updateData = {
      ...normalizeTimetablePayload(req.body),
      year: req.body.year || original.year || '4th Year',
      session: req.body.session || original.session || '2026-27'
    };

    const updated = await Timetable.findByIdAndUpdate(req.params.id, updateData, { new: true });

    // Handle room change notification
    if (req.body.room && req.body.room !== original.room) {
      updated.roomChanged = true;
      updated.oldRoom = original.room;
      await updated.save();
      
      // Send room change notification
      await sendRoomChangedNotification(updated, original.room, req.body.room);
    }

    res.json({ success: true, timetable: updated, message: 'Entry updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @DELETE /api/timetable/:id - Admin: soft delete entry (sets isActive: false)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const entry = await Timetable.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Timetable entry not found' });
    }
    
    res.json({ success: true, message: 'Entry archived', timetable: entry });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @DELETE /api/timetable/:id/permanent - Admin: permanently delete entry
router.delete('/:id/permanent', protect, adminOnly, async (req, res) => {
  try {
    const entry = await Timetable.findByIdAndDelete(req.params.id);
    
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Timetable entry not found' });
    }
    
    res.json({ success: true, message: 'Entry permanently deleted', deletedEntry: entry });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @POST /api/timetable/:id/cancel - Admin: cancel class
router.post('/:id/cancel', protect, adminOnly, async (req, res) => {
  try {
    const { reason } = req.body;
    const entry = await Timetable.findByIdAndUpdate(
      req.params.id,
      { isCancelled: true, cancellationReason: reason || 'Cancelled by admin' },
      { new: true }
    );
    
    // Send cancellation notification
    if (entry) {
      await sendClassCancelledNotification(entry, reason);
    }
    
    res.json({ success: true, timetable: entry, message: 'Class cancelled and notifications sent' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @GET /api/timetable/reference/info - Get current reference file info (student/admin accessible)
router.get('/reference/info', async (req, res) => {
  try {
    const refFile = await ReferenceFile.findOne({ 
      session: '2026-27',
      status: 'active', 
      isActive: true 
    }).sort({ uploadDate: -1 }).lean();

    if (!refFile) {
      return res.json({ success: true, refFile: null, message: 'No reference file uploaded yet' });
    }

    res.json({
      success: true,
      refFile: {
        _id: refFile._id,
        fileName: refFile.fileName,
        fileSize: (refFile.fileSize / 1024).toFixed(1) + ' KB',
        uploadedBy: refFile.uploadedBy,
        uploadDate: refFile.uploadDate,
        session: refFile.session,
        year: refFile.year,
        description: refFile.description,
        previewUrl: `/timetable/reference/${refFile._id}/preview`,
        downloadUrl: `/timetable/reference/${refFile._id}/download`
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @GET /api/timetable/reference/history - Get all reference files (admin only)
router.get('/reference/history', protect, adminOnly, async (req, res) => {
  try {
    const refFiles = await ReferenceFile.find({ session: '2026-27', isActive: true })
      .sort({ uploadDate: -1 })
      .lean();

    res.json({
      success: true,
      refFiles: refFiles.map(rf => ({
        _id: rf._id,
        fileName: rf.fileName,
        fileSize: (rf.fileSize / 1024).toFixed(1) + ' KB',
        uploadedBy: rf.uploadedBy,
        uploadDate: rf.uploadDate,
        status: rf.status,
        description: rf.description
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @GET /api/timetable/reference/:id/preview - Preview uploaded Excel as JSON (MUST come after /reference/history)
router.get('/reference/:id/preview', protect, async (req, res) => {
  try {
    const refFile = await ReferenceFile.findOne({
      _id: req.params.id,
      isActive: true
    }).select('+fileData');

    const fileBuffer = getReferenceBuffer(refFile);

    if (!refFile || !fileBuffer) {
      return res.status(404).json({ success: false, message: 'Reference file not found' });
    }

    res.json({
      success: true,
      fileName: refFile.fileName,
      sheets: toWorkbookPreview(fileBuffer)
    });
  } catch (error) {
    console.error('Reference preview error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @GET /api/timetable/reference/:id/download - Download uploaded Excel (MUST come after /reference/history)
router.get('/reference/:id/download', protect, async (req, res) => {
  try {
    const refFile = await ReferenceFile.findOne({
      _id: req.params.id,
      isActive: true
    }).select('+fileData');

    const fileBuffer = getReferenceBuffer(refFile);

    if (!refFile || !fileBuffer) {
      return res.status(404).json({ success: false, message: 'Reference file not found' });
    }

    res.setHeader('Content-Type', refFile.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(refFile.fileName || 'timetable-reference.xlsx')}"`);
    res.send(fileBuffer);
  } catch (error) {
    console.error('Reference download error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
