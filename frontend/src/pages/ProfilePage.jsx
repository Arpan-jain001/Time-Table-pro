import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { User, Mail, BookOpen, Save, LogOut, Hash } from 'lucide-react'
import { logout } from '../store/slices/authSlice'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import toast from 'react-hot-toast'
import TimetableReference from '../components/dashboard/TimetableReference'

const SESSIONS = ['2024-25', '2025-26', '2026-27']
const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year']

const FloatingOrb = ({ className }) => (
  <div className={`absolute rounded-full blur-3xl pointer-events-none ${className}`} />
)

const SectionLabel = ({ children }) => (
  <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest mb-4">{children}</p>
)

const FieldLabel = ({ children }) => (
  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">{children}</label>
)

export default function ProfilePage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user } = useSelector(s => s.auth)
  const [form, setForm] = useState({
    name: user?.name || '',
    section: user?.section || '',
    year: user?.year || '',
    session: user?.session || '2026-27',
  })
  const [saving, setSaving] = useState(false)
  const [sectionOptions, setSectionOptions] = useState([])

  useEffect(() => {
    const loadSections = async () => {
      try {
        const { data } = await api.get('/sections', { params: { session: form.session || '2026-27' } })
        const sections = Array.isArray(data?.sections)
          ? data.sections.map(section => (section?.name || '').toString().trim().toUpperCase())
          : []
        const uniqueSections = Array.from(new Set([...sections, (form.section || '').toString().trim().toUpperCase()].filter(Boolean)))
        setSectionOptions(uniqueSections)
      } catch (error) {
        console.error('Unable to load sections for profile:', error)
      }
    }

    loadSections()
  }, [form.session])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/auth/profile', form)
      toast.success('Profile updated!')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  const initials = user?.name?.charAt(0).toUpperCase() || '?'
  const isAdmin = user?.role === 'admin'

  const inputClass = `w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm transition-all duration-200 outline-none hover:border-white/20 focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-500/15`
  const selectClass = `w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white text-sm transition-all duration-200 outline-none hover:border-white/20 focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-500/15 appearance-none cursor-pointer`

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #0a0e1a 0%, #0d1224 60%, #0a0f1e 100%)' }}>

      {/* Ambient orbs */}
      <FloatingOrb className="w-[440px] h-[440px] opacity-[0.07] bg-indigo-600 -top-32 -right-32" />
      <FloatingOrb className="w-72 h-72 opacity-[0.05] bg-violet-700 bottom-10 -left-16" />

      {/* Dot grid */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(99,102,241,0.08) 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }} />

      <div className="relative z-10 p-4 lg:p-6 max-w-2xl mx-auto pb-12 overflow-y-auto h-screen space-y-4">

        {/* ── PAGE HEADER ── */}
        <div className="flex items-center gap-4 pt-2 mb-6">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}>
            <User size={20} className="text-indigo-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest">TimeTable Pro</p>
            <h1 className="text-2xl lg:text-3xl font-black text-white mt-0.5 tracking-tight">My Profile</h1>
          </div>
        </div>

        {/* ── AVATAR CARD ── */}
        <div
          className="rounded-2xl p-5 flex items-center gap-5 relative overflow-hidden"
          style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)' }}>

          {/* subtle glow behind avatar */}
          <div className="absolute -left-4 -top-4 w-32 h-32 rounded-full blur-2xl opacity-20"
            style={{ background: '#6366f1' }} />

          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-2xl flex-shrink-0 relative z-10"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              boxShadow: '0 0 24px rgba(99,102,241,0.4)'
            }}>
            {initials}
          </div>

          <div className="relative z-10 min-w-0">
            <h2 className="text-lg font-black text-white truncate">{user?.name}</h2>
            <p className="text-slate-400 text-sm mt-0.5 truncate">{user?.email}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                style={isAdmin
                  ? { background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }
                  : { background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
                {isAdmin ? '⚙️ Admin' : '🎓 Student'}
              </div>
              {user?.section && (
                <div
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                  style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399' }}>
                  <Hash size={10} />
                  {user.section}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── ACADEMIC DETAILS ── */}
        <div
          className="rounded-2xl p-5 space-y-4"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>

          <div className="flex items-center gap-2 pb-3"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <BookOpen size={15} className="text-indigo-400" />
            <SectionLabel>Academic Details</SectionLabel>
          </div>

          <div>
            <FieldLabel>Full Name</FieldLabel>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className={inputClass}
              placeholder="Your full name" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Session</FieldLabel>
              <select
                value={form.session}
                onChange={e => setForm({ ...form, session: e.target.value })}
                className={selectClass}>
                {SESSIONS.map(s => <option key={s} value={s} style={{ background: '#0d1224' }}>{s}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel>Year</FieldLabel>
              <select
                value={form.year}
                onChange={e => setForm({ ...form, year: e.target.value })}
                className={selectClass}>
                <option value="" style={{ background: '#0d1224' }}>Select Year</option>
                {YEARS.map(y => <option key={y} value={y} style={{ background: '#0d1224' }}>{y}</option>)}
              </select>
            </div>
          </div>

          <div>
            <FieldLabel>Section</FieldLabel>
            <select
              value={form.section}
              onChange={e => setForm({ ...form, section: e.target.value })}
              className={selectClass}>
              <option value="" style={{ background: '#0d1224' }}>Select section</option>
              {sectionOptions.map(section => (
                <option key={section} value={section} style={{ background: '#0d1224' }}>{section}</option>
              ))}
            </select>
          </div>

          <div className="pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                boxShadow: '0 0 20px rgba(99,102,241,0.25)'
              }}>
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save size={15} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── TIMETABLE REFERENCE ── */}
        <TimetableReference />

        {/* ── ACCOUNT ── */}
        <div
          className="rounded-2xl p-5"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>

          <div className="flex items-center gap-2 pb-3 mb-3"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <Mail size={15} className="text-indigo-400" />
            <SectionLabel>Account</SectionLabel>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-semibold">{user?.email}</p>
              <p className="text-slate-600 text-xs mt-0.5">Registered email · cannot be changed</p>
            </div>
          </div>

          <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(239,68,68,0.1)' }}>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 hover:opacity-90"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', color: '#f87171' }}>
              <LogOut size={15} />
              Sign out
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}