import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Users, BookOpen, GraduationCap, LayoutGrid, TrendingUp, Activity,
  Upload, CalendarDays, School, PartyPopper, UserPlus, ShieldCheck,
  ArrowUpRight, Sparkles, Mail, Send, Eye
} from 'lucide-react'
import api from '../../services/api'

const FloatingOrb = ({ className }) => (
  <div className={`absolute rounded-full blur-3xl opacity-20 pointer-events-none ${className}`} />
)

const StatCard = ({ label, value, icon: Icon, gradient, loading, trend }) => (
  <div className="relative overflow-hidden rounded-2xl p-5 group transition-all duration-300 hover:-translate-y-0.5"
    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
    <div className="flex items-start justify-between mb-4">
      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
        <Icon size={20} className="text-white" />
      </div>
      {trend && (
        <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-0.5 bg-emerald-500/10 px-2 py-1 rounded-full">
          <ArrowUpRight size={12} />
          {trend}
        </span>
      )}
    </div>
    {loading ? (
      <div className="h-8 w-16 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
    ) : (
      <p className="text-3xl font-black text-white tracking-tight tabular-nums">{value}</p>
    )}
    <p className="text-slate-400 text-sm mt-1 font-medium">{label}</p>

    {/* corner glow */}
    <div className={`absolute -bottom-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-15 blur-2xl transition-opacity duration-500`} />
  </div>
)

const ActionCard = ({ to, label, desc, icon: Icon, accent }) => (
  <Link to={to}
    className="relative overflow-hidden rounded-2xl p-5 flex items-start gap-4 transition-all duration-300 hover:-translate-y-0.5 group"
    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border transition-colors duration-300 ${accent}`}>
      <Icon size={18} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-white font-semibold text-sm">{label}</p>
      <p className="text-slate-500 text-xs mt-1 leading-relaxed">{desc}</p>
    </div>
    <ArrowUpRight size={15} className="text-slate-600 group-hover:text-indigo-400 transition-colors duration-300 flex-shrink-0 mt-0.5" />
  </Link>
)

export default function AdminDashboard() {
  const [stats, setStats] = useState({ totalStudents: 0, totalSections: 0, totalSubjects: 0, totalEntries: 0 })
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(new Date())
  const [broadcastSubject, setBroadcastSubject] = useState('Important update from Timetable Pro')
  const [broadcastMessage, setBroadcastMessage] = useState('Hello team,\n\nPlease check the latest timetable updates and keep your profile section updated for accurate notifications.\n\nThank you.')
  const [sendingBroadcast, setSendingBroadcast] = useState(false)
  const [sectionReminderSubject, setSectionReminderSubject] = useState('Please update your section')
  const [sectionReminderMessage, setSectionReminderMessage] = useState('Hello,\n\nPlease update your section in your profile page so you continue receiving the correct timetable updates and class alerts.\n\nThank you.')
  const [sendingSectionReminder, setSendingSectionReminder] = useState(false)

  useEffect(() => {
    api.get('/admin/stats')
      .then(({ data }) => setStats(data.stats))
      .catch(() => {})
      .finally(() => setLoading(false))

    const tick = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(tick)
  }, [])

  const statCards = [
    { label: 'Total Students', value: stats.totalStudents, icon: Users, gradient: 'from-indigo-500 to-indigo-600' },
    { label: 'Active Sections', value: stats.totalSections, icon: GraduationCap, gradient: 'from-cyan-500 to-cyan-600' },
    { label: 'Subjects Offered', value: stats.totalSubjects, icon: BookOpen, gradient: 'from-emerald-500 to-emerald-600' },
    { label: 'Timetable Entries', value: stats.totalEntries, icon: LayoutGrid, gradient: 'from-violet-500 to-violet-600' },
  ]

  const primaryActions = [
    { to: '/admin/upload', label: 'Upload Timetable Excel', desc: 'Bulk import from spreadsheet', icon: Upload, accent: 'bg-indigo-500/10 border-indigo-400/20 text-indigo-300 group-hover:bg-indigo-500/20 group-hover:border-indigo-400/40' },
    { to: '/admin/timetable', label: 'Manage Timetable', desc: 'Add, edit, or delete entries', icon: CalendarDays, accent: 'bg-cyan-500/10 border-cyan-400/20 text-cyan-300 group-hover:bg-cyan-500/20 group-hover:border-cyan-400/40' },
    { to: '/admin/sections', label: 'Manage Sections', desc: 'Create and manage sections', icon: School, accent: 'bg-emerald-500/10 border-emerald-400/20 text-emerald-300 group-hover:bg-emerald-500/20 group-hover:border-emerald-400/40' },
    { to: '/admin/holidays', label: 'Add Holiday', desc: 'Schedule holidays & breaks', icon: PartyPopper, accent: 'bg-amber-500/10 border-amber-400/20 text-amber-300 group-hover:bg-amber-500/20 group-hover:border-amber-400/40' },
    { to: '/admin/students', label: 'View Students', desc: 'Browse registered students', icon: Users, accent: 'bg-violet-500/10 border-violet-400/20 text-violet-300 group-hover:bg-violet-500/20 group-hover:border-violet-400/40' },
  ]

  const adminActions = [
    { to: '/admin/add-admin', label: 'Add Admin', desc: 'Create new admin user', icon: UserPlus, accent: 'bg-pink-500/10 border-pink-400/20 text-pink-300 group-hover:bg-pink-500/20 group-hover:border-pink-400/40' },
    { to: '/admin/admins', label: 'Manage Admins', desc: 'View & delete admins', icon: ShieldCheck, accent: 'bg-slate-500/10 border-slate-400/20 text-slate-300 group-hover:bg-slate-500/20 group-hover:border-slate-400/40' },
  ]

  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

  const handleBroadcastSend = async () => {
    if (!broadcastSubject.trim() || !broadcastMessage.trim()) {
      toast.error('Please add both subject and message before sending')
      return
    }

    setSendingBroadcast(true)
    try {
      const { data } = await api.post('/admin/broadcast-email', {
        subject: broadcastSubject.trim(),
        message: broadcastMessage.trim()
      })
      toast.success(data.message || 'Broadcast email sent successfully')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send broadcast email')
    } finally {
      setSendingBroadcast(false)
    }
  }

  const handleSectionReminderSend = async () => {
    if (!sectionReminderSubject.trim() || !sectionReminderMessage.trim()) {
      toast.error('Please add both subject and message before sending')
      return
    }

    setSendingSectionReminder(true)
    try {
      const { data } = await api.post('/admin/send-section-update-notification', {
        subject: sectionReminderSubject.trim(),
        message: sectionReminderMessage.trim()
      })
      toast.success(data.message || 'Section reminder sent successfully')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send section reminder')
    } finally {
      setSendingSectionReminder(false)
    }
  }

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

      <div className="relative z-10 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-indigo-300 mb-3"
              style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}>
              <Sparkles size={12} />
              Admin Console · 2025–26
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Admin Dashboard</h1>
            <p className="text-slate-400 text-sm mt-1">Manage your institution's timetable system</p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-white text-sm font-semibold">{dateStr}</p>
            <p className="text-slate-500 text-xs mt-0.5 tabular-nums">{timeStr}</p>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(card => <StatCard key={card.label} {...card} loading={loading} />)}
        </div>

        {/* Quick Actions */}
        <div className="rounded-2xl p-6"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Activity size={16} className="text-indigo-400" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {primaryActions.map(a => <ActionCard key={a.to} {...a} />)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            {adminActions.map(a => <ActionCard key={a.to} {...a} />)}
          </div>
        </div>

        {/* Broadcast Mail */}
        <div className="rounded-2xl p-5"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Mail size={16} className="text-indigo-400" />
                Broadcast Email
              </h2>
              <p className="text-slate-400 text-sm mt-1">Send an announcement email to all active users and admins.</p>
            </div>
            <button
              onClick={handleBroadcastSend}
              disabled={sendingBroadcast}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sendingBroadcast ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Send size={15} />}
              {sendingBroadcast ? 'Sending…' : 'Send to all'}
            </button>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-3">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">Subject</label>
                <input
                  value={broadcastSubject}
                  onChange={(e) => setBroadcastSubject(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2.5 text-sm text-white outline-none ring-0"
                  placeholder="Enter email subject"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">Message</label>
                <textarea
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  rows={8}
                  className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2.5 text-sm text-white outline-none ring-0"
                  placeholder="Write your email message here"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-indigo-500/20 bg-slate-950/70 p-4">
              <div className="flex items-center gap-2 text-indigo-300">
                <Eye size={15} />
                <span className="text-sm font-semibold">Preview</span>
              </div>
              <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-indigo-300">Subject</p>
                <p className="mt-1 text-sm font-semibold text-white">{broadcastSubject || 'Your subject here'}</p>
                <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.25em] text-indigo-300">Message</p>
                <div className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-300">
                  {broadcastMessage || 'Your message preview will appear here.'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section Reminder Mail */}
        <div className="rounded-2xl p-5"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Mail size={16} className="text-amber-400" />
                Section Update Reminder
              </h2>
              <p className="text-slate-400 text-sm mt-1">Preview and send the section update reminder to all active users and admins.</p>
            </div>
            <button
              onClick={handleSectionReminderSend}
              disabled={sendingSectionReminder}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sendingSectionReminder ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Send size={15} />}
              {sendingSectionReminder ? 'Sending…' : 'Send reminder'}
            </button>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-3">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">Subject</label>
                <input
                  value={sectionReminderSubject}
                  onChange={(e) => setSectionReminderSubject(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2.5 text-sm text-white outline-none ring-0"
                  placeholder="Enter reminder subject"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">Message</label>
                <textarea
                  value={sectionReminderMessage}
                  onChange={(e) => setSectionReminderMessage(e.target.value)}
                  rows={7}
                  className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2.5 text-sm text-white outline-none ring-0"
                  placeholder="Write your reminder message here"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-amber-500/20 bg-slate-950/70 p-4">
              <div className="flex items-center gap-2 text-amber-300">
                <Eye size={15} />
                <span className="text-sm font-semibold">Preview</span>
              </div>
              <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-300">Subject</p>
                <p className="mt-1 text-sm font-semibold text-white">{sectionReminderSubject || 'Your subject here'}</p>
                <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-300">Message</p>
                <div className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-300">
                  {sectionReminderMessage || 'Your reminder preview will appear here.'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="rounded-2xl p-5"
          style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)' }}>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}>
              <TrendingUp size={16} className="text-indigo-300" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Getting started</p>
              <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
                1. Go to <span className="text-indigo-300 font-semibold">Sections</span> to create sections, or they'll be auto-created on Excel upload.<br />
                2. Use <span className="text-indigo-300 font-semibold">Upload Excel</span> to bulk-import your timetable sheet.<br />
                3. Students will instantly see their schedule after logging in with their section.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}