import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { BookOpen, Plus, Pencil, Trash2, X, Save, Filter, Clock, Sparkles, Layers, CalendarDays } from 'lucide-react'
import { fetchAllTimetable } from '../../store/slices/timetableSlice'
import api from '../../services/api'
import toast from 'react-hot-toast'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const TYPES = ['Theory', 'Lab', 'Lunch', 'Free']
const TIME_SLOTS = [
  { label: '08:00 AM - 09:00 AM', start: '08:00 AM', end: '09:00 AM' },
  { label: '09:00 AM - 10:00 AM', start: '09:00 AM', end: '10:00 AM' },
  { label: '10:00 AM - 11:00 AM', start: '10:00 AM', end: '11:00 AM' },
  { label: '11:00 AM - 12:00 PM', start: '11:00 AM', end: '12:00 PM' },
  { label: '12:00 PM - 01:00 PM', start: '12:00 PM', end: '01:00 PM' },
  { label: '01:00 PM - 02:00 PM', start: '01:00 PM', end: '02:00 PM' },
  { label: '02:00 PM - 03:00 PM', start: '02:00 PM', end: '03:00 PM' },
  { label: '03:00 PM - 04:00 PM', start: '03:00 PM', end: '04:00 PM' },
]

const EMPTY = { session: '2026-27', year: '4th Year', section: '', day: 'Monday', subjectName: '', subjectCode: '', facultyName: '', room: '', block: '', startTime: '08:00 AM', endTime: '09:00 AM', reminderBeforeMinutes: 10, type: 'Theory' }
const HOURS = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'))
const MINUTES = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, '0'))

const parseTimeParts = (value = '08:00 AM') => {
  const match = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return { hour: '08', minute: '00', period: 'AM' }
  return {
    hour: String(Number(match[1]) || 12).padStart(2, '0'),
    minute: match[2],
    period: match[3].toUpperCase()
  }
}

const buildTime = ({ hour, minute, period }) => `${hour}:${minute} ${period}`

const FloatingOrb = ({ className }) => (
  <div className={`absolute rounded-full blur-3xl opacity-20 pointer-events-none ${className}`} />
)

function TimePicker({ label, value, onChange }) {
  const parts = parseTimeParts(value)
  const update = (key, nextValue) => onChange(buildTime({ ...parts, [key]: nextValue }))

  const selectClass = "bg-white/[0.04] border border-white/10 rounded-lg px-2 py-2 text-white text-sm font-mono outline-none focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-500/15 hover:border-white/20 transition-all duration-200"

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">{label}</label>
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
        <select value={parts.hour} onChange={e => update('hour', e.target.value)} className={selectClass}>
          {HOURS.map(hour => <option key={hour} value={hour} className="bg-slate-900">{hour}</option>)}
        </select>
        <select value={parts.minute} onChange={e => update('minute', e.target.value)} className={selectClass}>
          {MINUTES.map(minute => <option key={minute} value={minute} className="bg-slate-900">{minute}</option>)}
        </select>
        <select value={parts.period} onChange={e => update('period', e.target.value)} className={selectClass}>
          <option value="AM" className="bg-slate-900">AM</option>
          <option value="PM" className="bg-slate-900">PM</option>
        </select>
      </div>
    </div>
  )
}

const inputClass = "w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm transition-all duration-200 outline-none hover:border-white/20 focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-500/15"
const labelClass = "block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide"

const TYPE_BADGE = {
  Theory: 'bg-indigo-500/15 text-indigo-300 border-indigo-400/30',
  Lab: 'bg-cyan-500/15 text-cyan-300 border-cyan-400/30',
  Lunch: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
  Free: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
}

export default function AdminTimetable() {
  const dispatch = useDispatch()
  const { allEntries } = useSelector(s => s.timetable)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState({ section: '', day: '', session: '2026-27' })
  const [sections, setSections] = useState([])
  const [selectedSlots, setSelectedSlots] = useState([])
  const [selectedSections, setSelectedSections] = useState([])

  useEffect(() => {
    dispatch(fetchAllTimetable({ session: '2026-27' }))
    fetchSections()
  }, [dispatch])

  const fetchSections = async () => {
    try {
      const { data } = await api.get('/sections', { params: { session: '2026-27' } })
      setSections(data.sections || [])
    } catch (err) {
      console.error('Failed to fetch sections:', err)
    }
  }

  const applyFilter = () => {
    dispatch(fetchAllTimetable({ ...filter }))
  }

  const openAdd = (slot = null) => {
    const defaults = {
      ...EMPTY,
      section: filter.section || '',
      day: filter.day || 'Monday',
      startTime: slot?.start || EMPTY.startTime,
      endTime: slot?.end || EMPTY.endTime,
    }
    setForm(defaults)
    setSelectedSlots(slot ? [slot] : [])
    if (filter.section) {
      setSelectedSections([filter.section])
    } else {
      setSelectedSections([])
    }
    setModal('add')
  }

  const openEdit = (entry) => { setForm({ ...entry, reminderBeforeMinutes: entry.reminderBeforeMinutes ?? 10 }); setSelectedSlots([]); setSelectedSections([]); setModal('edit') }
  const closeModal = () => { setModal(null); setForm(EMPTY); setSelectedSlots([]); setSelectedSections([]) }

  const handleSectionToggle = (sectionName) => {
    setSelectedSections(prev =>
      prev.includes(sectionName)
        ? prev.filter(s => s !== sectionName)
        : [...prev, sectionName]
    )
  }

  const selectAllSections = () => {
    setSelectedSections(prev =>
      prev.length === sections.length ? [] : sections.map(s => s.name)
    )
  }

  const handleSlotToggle = (slot) => {
    setSelectedSlots((prev) => {
      const exists = prev.some(item => item.start === slot.start && item.end === slot.end)
      return exists ? prev.filter(item => !(item.start === slot.start && item.end === slot.end)) : [...prev, slot]
    })
  }

  const toggleAllSlots = () => {
    setSelectedSlots(prev => (prev.length === TIME_SLOTS.length ? [] : [...TIME_SLOTS]))
  }

  const handleCustomTimeChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setSelectedSlots([])
  }

  const handleSave = async () => {
    if (!form.subjectName || !form.day) return toast.error('Please fill required fields')

    if (modal === 'add' && selectedSections.length === 0) {
      return toast.error('Please select at least one section')
    }

    setSaving(true)
    try {
      if (modal === 'edit') {
        const dataToSend = {
          ...form,
          year: '4th Year',
          session: '2026-27'
        }
        await api.put(`/timetable/${form._id}`, dataToSend)
        toast.success('Entry updated')
      } else {
        const slotsToSave = selectedSlots.length > 0 ? selectedSlots : [{ start: form.startTime, end: form.endTime }]

        const entriesToCreate = []
        for (const section of selectedSections) {
          for (const slot of slotsToSave) {
            entriesToCreate.push({
              ...form,
              section: section,
              year: '4th Year',
              session: '2026-27',
              startTime: slot.start,
              endTime: slot.end,
            })
          }
        }

        await Promise.all(
          entriesToCreate.map(entry => api.post('/timetable', entry))
        )

        const totalCreated = entriesToCreate.length
        toast.success(totalCreated === 1 ? 'Entry created' : `${totalCreated} entries created for ${selectedSections.length} section(s)`)
      }

      closeModal()
      dispatch(fetchAllTimetable({ session: '2026-27' }))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    const action = window.confirm(
      'Choose delete type:\n\n' +
      'OK = Permanent Delete (cannot undo)\n' +
      'Cancel = Archive/Soft Delete (can be restored)\n\n' +
      'Do you want PERMANENT DELETE?'
    )
    
    try {
      if (action) {
        // Permanent delete
        await api.delete(`/timetable/${id}/permanent`)
        toast.success('Entry permanently deleted')
      } else {
        // Soft delete (archive)
        await api.delete(`/timetable/${id}`)
        toast.success('Entry archived')
      }
      dispatch(fetchAllTimetable({ session: '2026-27' }))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete')
    }
  }

  const handleCancel = async (id) => {
    const reason = prompt('Cancellation reason:')
    if (reason === null) return
    try {
      await api.post(`/timetable/${id}/cancel`, { reason })
      toast.success('Class cancelled')
      dispatch(fetchAllTimetable({ session: '2026-27' }))
    } catch { toast.error('Failed') }
  }

  const filtered = allEntries.filter(e =>
    (!filter.section || e.section === filter.section) &&
    (!filter.day || e.day === filter.day)
  )

  const sectionList = [...new Set(allEntries.map(e => e.section))].sort()

  return (
    <div className="min-h-screen relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0a0e1a 0%, #0d1224 50%, #0a0f1e 100%)' }}>

      {/* Background orbs */}
      <FloatingOrb className="w-96 h-96 bg-indigo-600 -top-32 -left-32" />
      <FloatingOrb className="w-80 h-80 bg-violet-700 top-1/3 -right-40" />
      <FloatingOrb className="w-64 h-64 bg-cyan-600 bottom-0 left-1/4" />

      {/* Dot grid */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(99,102,241,0.12) 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }} />

      <div className="relative z-10 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}>
              <BookOpen size={20} className="text-indigo-300" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-indigo-300 mb-1"
                style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}>
                <Sparkles size={10} />
                Session 2026-27
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">Timetable Management</h1>
              <p className="text-slate-400 text-sm">{filtered.length} entries · {sectionList.length} sections</p>
            </div>
          </div>
          <button onClick={() => openAdd()}
            className="flex items-center gap-2 whitespace-nowrap px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', boxShadow: '0 0 30px rgba(99,102,241,0.3)' }}>
            <Plus size={16} />
            Add Entry
          </button>
        </div>

        {/* Quick Time Slot Entry */}
        <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-white font-semibold flex items-center gap-2">
                <Clock size={15} className="text-indigo-400" />
                Quick Time Slot Entry
              </h2>
              <p className="text-slate-400 text-sm mt-0.5">Click any time slot or use the form below to add entries to multiple sections</p>
            </div>
            <button onClick={() => openAdd()}
              className="px-4 py-2 rounded-xl text-sm font-medium text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)' }}>
              Open add form
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {TIME_SLOTS.map(slot => (
              <button
                key={slot.label}
                type="button"
                onClick={() => openAdd(slot)}
                className="rounded-xl p-3 text-left transition-all duration-200 group"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'; e.currentTarget.style.background = 'rgba(99,102,241,0.08)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
              >
                <div className="text-xs uppercase tracking-wider font-semibold text-indigo-300 group-hover:text-indigo-200">{slot.label}</div>
                <p className="mt-1 text-xs text-slate-500 group-hover:text-slate-300">Click to open form</p>
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <CalendarDays size={13} className="text-indigo-400" />
              <span className="text-xs text-slate-400 font-medium">Session:</span>
              <span className="text-sm font-semibold text-slate-200">2026-27</span>
            </div>

            <select value={filter.section} onChange={e => setFilter({ ...filter, section: e.target.value })}
              className="bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none hover:border-white/20 focus:border-indigo-400/60 transition-all duration-200">
              <option value="" className="bg-slate-900">All Sections</option>
              {sectionList.map(s => <option key={s} value={s} className="bg-slate-900">{s}</option>)}
            </select>

            <select value={filter.day} onChange={e => setFilter({ ...filter, day: e.target.value })}
              className="bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none hover:border-white/20 focus:border-indigo-400/60 transition-all duration-200">
              <option value="" className="bg-slate-900">All Days</option>
              {DAYS.map(d => <option key={d} value={d} className="bg-slate-900">{d}</option>)}
            </select>

            <button onClick={applyFilter}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <Filter size={14} />
              Apply Filter
            </button>

            {(filter.section || filter.day) && (
              <button onClick={() => setFilter({ section: '', day: '', session: '2026-27' })}
                className="px-3 py-2 text-xs rounded-xl text-slate-400 hover:text-white transition-colors duration-200"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {['Section', 'Day', 'Subject', 'Code', 'Faculty', 'Room', 'Time', 'Reminder', 'Type', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan="10" className="text-center text-slate-500 py-12">No entries found</td></tr>
                ) : filtered.map(entry => (
                  <tr key={entry._id}
                    className={`transition-colors duration-150 hover:bg-white/[0.02] ${entry.isCancelled ? 'opacity-50' : ''}`}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-400/30">{entry.section}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{entry.day}</td>
                    <td className="px-4 py-3">
                      <p className="text-white font-medium text-sm">{entry.subjectName}</p>
                      {entry.isCancelled && <p className="text-red-400 text-xs mt-0.5">Cancelled</p>}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{entry.subjectCode}</td>
                    <td className="px-4 py-3 text-slate-400 text-sm">{entry.facultyName || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">
                      {entry.block ? `${entry.block}-${entry.room}` : entry.room || '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400 whitespace-nowrap">{entry.startTime}–{entry.endTime}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400 whitespace-nowrap">{entry.reminderBeforeMinutes ?? 10} min</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${TYPE_BADGE[entry.type] || TYPE_BADGE.Theory}`}>
                        {entry.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(entry)}
                          className="p-1.5 rounded-lg hover:bg-indigo-500/15 text-slate-500 hover:text-indigo-300 transition-colors duration-150">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => handleCancel(entry._id)}
                          className="p-1.5 rounded-lg hover:bg-amber-500/15 text-slate-500 hover:text-amber-300 transition-colors duration-150 text-xs">
                          ✕
                        </button>
                        <button onClick={() => handleDelete(entry._id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/15 text-slate-500 hover:text-red-300 transition-colors duration-150">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        {modal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="w-full max-w-2xl my-8 rounded-3xl p-6 animate-slide-up"
              style={{ background: 'rgba(10,14,28,0.96)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    {modal === 'add' ? <><Plus size={17} className="text-indigo-400" /> Add New Timetable Entry</> : <><Pencil size={15} className="text-indigo-400" /> Edit Timetable Entry</>}
                  </h2>
                  {modal === 'add' && (
                    <p className="text-xs text-slate-400 mt-1">Select sections and time slots to create entries in bulk</p>
                  )}
                </div>
                <button onClick={closeModal} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors duration-150">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                {/* Session & Year - Locked */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Session</label>
                    <div className="w-full bg-white/[0.03] border border-white/6 rounded-xl px-4 py-3 text-slate-500 text-sm cursor-not-allowed flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                      2026-27
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Year</label>
                    <div className="w-full bg-white/[0.03] border border-white/6 rounded-xl px-4 py-3 text-slate-500 text-sm cursor-not-allowed flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
                      4th Year
                    </div>
                  </div>
                </div>

                {/* Multi-Section Selection */}
                {modal === 'add' && (
                  <div className="rounded-2xl p-4" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300 mb-1 uppercase tracking-wide">
                          <Layers size={12} />
                          Select Sections *
                        </label>
                        <p className="text-xs text-slate-400">Pick one or more sections to add this entry</p>
                      </div>
                      <button
                        type="button"
                        onClick={selectAllSections}
                        className="px-2.5 py-1 text-xs rounded-lg text-indigo-200 transition-colors duration-150"
                        style={{ background: 'rgba(99,102,241,0.2)' }}>
                        {selectedSections.length === sections.length ? 'Clear all' : 'Select all'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
                      {sections.map(section => {
                        const active = selectedSections.includes(section.name)
                        return (
                          <button
                            key={section._id}
                            type="button"
                            onClick={() => handleSectionToggle(section.name)}
                            className={`p-2.5 rounded-xl border text-left text-sm font-medium transition-all duration-150 ${
                              active
                                ? 'bg-indigo-500/25 border-indigo-400/60 text-indigo-100'
                                : 'border-white/10 bg-white/[0.02] text-slate-400 hover:border-indigo-400/40 hover:bg-white/5'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] flex-shrink-0 ${
                                active ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-500'
                              }`}>
                                {active && '✓'}
                              </span>
                              {section.name}
                            </div>
                          </button>
                        )
                      })}
                    </div>

                    {selectedSections.length > 0 && (
                      <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(99,102,241,0.2)' }}>
                        <p className="text-xs text-indigo-200">
                          ✓ Selected: <span className="font-semibold">{selectedSections.length} section(s)</span>
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Single Section View for Edit Mode */}
                {modal === 'edit' && (
                  <div>
                    <label className={labelClass}>Section (Edit only)</label>
                    <div className="w-full bg-white/[0.03] border border-white/6 rounded-xl px-4 py-3 text-slate-400 text-sm cursor-not-allowed">
                      {form.section}
                    </div>
                  </div>
                )}

                {/* Day Selection */}
                <div>
                  <label className={labelClass}>Day *</label>
                  <select value={form.day} onChange={e => setForm({ ...form, day: e.target.value })}
                    className={inputClass}>
                    {DAYS.map(d => <option key={d} value={d} className="bg-slate-900">{d}</option>)}
                  </select>
                </div>

                {/* Time Slot Selection */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
                    <Clock size={12} />
                    Time Slot(s) *
                  </label>
                  <div className="mb-3 rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Clock size={13} className="text-indigo-300" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-indigo-300">Custom Time</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <TimePicker
                        label="Start Time"
                        value={form.startTime}
                        onChange={value => handleCustomTimeChange('startTime', value)}
                      />
                      <TimePicker
                        label="End Time"
                        value={form.endTime}
                        onChange={value => handleCustomTimeChange('endTime', value)}
                      />
                    </div>
                    {selectedSlots.length > 0 && modal === 'add' && (
                      <p className="text-xs text-slate-500 mt-2">Changing custom time clears selected preset slots.</p>
                    )}
                  </div>
                  {modal === 'add' && (
                    <div className="flex items-center gap-2 mb-3 text-xs">
                      <button type="button" onClick={toggleAllSlots}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium text-white transition-colors duration-150"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)' }}>
                        {selectedSlots.length === TIME_SLOTS.length ? 'Clear all' : 'Select all'}
                      </button>
                      <span className="text-slate-400">
                        {selectedSlots.length > 0 ? (
                          <span className="text-indigo-300 font-semibold">{selectedSlots.length} slot(s) selected</span>
                        ) : (
                          <span>Single slot mode (one entry)</span>
                        )}
                      </span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                    {TIME_SLOTS.map(slot => {
                      const active = selectedSlots.some(item => item.start === slot.start && item.end === slot.end)
                      return (
                        <button
                          key={slot.label}
                          type="button"
                          onClick={() => modal === 'add' && handleSlotToggle(slot)}
                          disabled={modal === 'edit'}
                          className={`p-2.5 text-sm rounded-xl border text-left transition-all duration-150 ${
                            active
                              ? 'bg-indigo-500/20 border-indigo-400/60 text-indigo-100'
                              : 'border-white/10 bg-white/[0.02] text-slate-400 hover:border-indigo-400/40 hover:text-slate-300'
                          } ${modal === 'edit' ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          <div className="font-semibold text-xs uppercase tracking-wide">{slot.label}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{active ? '✓ Selected' : 'Click to add'}</div>
                        </button>
                      )
                    })}
                  </div>
                  {modal === 'add' && (
                    <p className="text-xs text-slate-500 mt-2">Select multiple slots to save the same entry across different times</p>
                  )}
                </div>

                {/* Subject Name */}
                <div>
                  <label className={labelClass}>Subject Name *</label>
                  <input value={form.subjectName} onChange={e => setForm({ ...form, subjectName: e.target.value })}
                    className={inputClass} placeholder="e.g. Java Programming" />
                </div>

                {/* Subject Code & Faculty */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Subject Code</label>
                    <input value={form.subjectCode} onChange={e => setForm({ ...form, subjectCode: e.target.value })}
                      className={`${inputClass} font-mono uppercase tracking-widest`} placeholder="PCS-301" />
                  </div>
                  <div>
                    <label className={labelClass}>Faculty</label>
                    <input value={form.facultyName} onChange={e => setForm({ ...form, facultyName: e.target.value })}
                      className={inputClass} placeholder="Prof. Name" />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Reminder Before Class (minutes)</label>
                  <input
                    type="number"
                    min="0"
                    max="1440"
                    value={form.reminderBeforeMinutes ?? 10}
                    onChange={e => setForm({ ...form, reminderBeforeMinutes: Number(e.target.value) })}
                    className={inputClass}
                  />
                </div>

                {/* Room & Block */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Room</label>
                    <input value={form.room} onChange={e => setForm({ ...form, room: e.target.value })}
                      className={`${inputClass} font-mono`} placeholder="304" />
                  </div>
                  <div>
                    <label className={labelClass}>Block</label>
                    <input value={form.block} onChange={e => setForm({ ...form, block: e.target.value })}
                      className={`${inputClass} font-mono`} placeholder="AB1" />
                  </div>
                </div>

                {/* Type Selection */}
                <div>
                  <label className={labelClass}>Type</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                    className={inputClass}>
                    {TYPES.map(t => <option key={t} value={t} className="bg-slate-900">{t}</option>)}
                  </select>
                </div>

                {/* Actions */}
                <div className="space-y-3 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  {/* Summary for Add Mode */}
                  {modal === 'add' && selectedSections.length > 0 && (
                    <div className="rounded-xl p-3 text-xs text-slate-300 space-y-1" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <p className="font-semibold text-slate-200">Creating:</p>
                      <p>• <span className="font-mono">{selectedSections.length}</span> section(s) × <span className="font-mono">{selectedSlots.length > 0 ? selectedSlots.length : 1}</span> time slot(s) = <span className="text-indigo-300 font-semibold">{selectedSections.length * (selectedSlots.length > 0 ? selectedSlots.length : 1)} total entries</span></p>
                      <p className="text-slate-400">Day: <span className="font-semibold text-slate-300">{form.day}</span></p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button onClick={handleSave} disabled={saving || (modal === 'add' && selectedSections.length === 0)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', boxShadow: '0 0 30px rgba(99,102,241,0.3)' }}>
                      <Save size={15} />
                      {saving ? 'Saving...' : modal === 'add' ? `Create ${selectedSections.length * (selectedSlots.length > 0 ? selectedSlots.length : 1)} Entries` : 'Update'}
                    </button>
                    <button onClick={closeModal}
                      className="px-5 py-3 rounded-xl text-sm font-medium text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}