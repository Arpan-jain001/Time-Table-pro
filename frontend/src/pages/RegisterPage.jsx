import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Check, ChevronDown, Eye, EyeOff, GraduationCap, Hash, Lock, Mail, Search, User, Sparkles, ArrowRight, Shield, Zap, BookOpen } from 'lucide-react'
import { googleRegisterUser, registerUser } from '../store/slices/authSlice'
import { signInWithGoogle } from '../services/firebaseAuth'
import api from '../services/api'
import toast from 'react-hot-toast'

const FloatingOrb = ({ className }) => (
  <div className={`absolute rounded-full blur-3xl opacity-20 pointer-events-none ${className}`} />
)

const FeatureItem = ({ icon: Icon, title, desc }) => (
  <div className="flex items-start gap-3 group">
    <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-500/20 group-hover:border-indigo-400/30 transition-all duration-300">
      <Icon size={16} className="text-indigo-300" />
    </div>
    <div>
      <p className="text-white text-sm font-semibold">{title}</p>
      <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{desc}</p>
    </div>
  </div>
)

export default function RegisterPage() {
  const dispatch = useDispatch()
  const { loading } = useSelector(s => s.auth)
  const [form, setForm] = useState({
    name: '',
    email: '',
    universityRollNumber: '',
    password: '',
    section: '',
    year: '4th Year',
    session: '2026-27'
  })
  const [showPass, setShowPass] = useState(false)
  const [sections, setSections] = useState([])
  const [sectionSearch, setSectionSearch] = useState('')
  const [sectionOpen, setSectionOpen] = useState(false)
  const [loadingSections, setLoadingSections] = useState(true)
  const [focusedField, setFocusedField] = useState(null)

  useEffect(() => {
    const fetchSections = async () => {
      setLoadingSections(true)
      try {
        const { data } = await api.get('/sections', { params: { session: '2026-27' } })
        setSections(Array.isArray(data?.sections) ? data.sections : [])
      } catch (error) {
        console.error('Failed to fetch sections for registration:', error)
        setSections([])
      } finally {
        setLoadingSections(false)
      }
    }
    fetchSections()
  }, [])

  const filteredSections = sections.filter(s =>
    (s?.name || '').toLowerCase().includes(sectionSearch.toLowerCase())
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    dispatch(registerUser(form))
  }

  const handleGoogleSignup = async () => {
    if (!form.universityRollNumber || !form.section) {
      toast.error('Select section and enter roll number before Google signup')
      return
    }
    try {
      const idToken = await signInWithGoogle()
      await dispatch(googleRegisterUser({
        idToken,
        universityRollNumber: form.universityRollNumber,
        section: form.section,
        session: form.session,
        year: form.year
      }))
    } catch (error) {
      toast.error(error.message || 'Google signup failed')
    }
  }

  const inputClass = (field) =>
    `w-full bg-white/[0.04] border ${focusedField === field ? 'border-indigo-400/60 ring-2 ring-indigo-500/15' : 'border-white/10'} rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 text-sm transition-all duration-200 outline-none hover:border-white/20`

  return (
    <div className="min-h-screen flex items-center justify-center p-4 overflow-hidden relative"
      style={{ background: 'linear-gradient(135deg, #0a0e1a 0%, #0d1224 50%, #0a0f1e 100%)' }}>

      {/* Background orbs */}
      <FloatingOrb className="w-96 h-96 bg-indigo-600 -top-32 -left-32" />
      <FloatingOrb className="w-80 h-80 bg-violet-700 top-1/2 -right-40" />
      <FloatingOrb className="w-64 h-64 bg-cyan-600 bottom-0 left-1/3" />

      {/* Dot grid */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(99,102,241,0.12) 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }} />

      <div className="w-full max-w-5xl grid lg:grid-cols-[1fr_420px] gap-0 items-stretch my-6 relative z-10">

        {/* ── LEFT PANEL ── */}
        <section className="hidden lg:flex flex-col justify-between rounded-l-3xl overflow-hidden p-10 relative"
          style={{ background: 'linear-gradient(145deg, rgba(99,102,241,0.12) 0%, rgba(15,17,35,0.95) 60%)', border: '1px solid rgba(255,255,255,0.06)', borderRight: 'none' }}>

          {/* Top badge */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-indigo-300 mb-8"
              style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}>
              <Sparkles size={12} />
              2026–27 Academic Batch
            </div>

            <h2 className="text-4xl font-black text-white leading-tight tracking-tight">
              Your roll number.<br />
              <span style={{ background: 'linear-gradient(90deg, #818cf8, #c4b5fd, #67e8f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Your schedule.
              </span><br />
              Zero confusion.
            </h2>

            <p className="text-slate-400 text-sm mt-5 leading-7 max-w-xs">
              TimeTable Pro links your university ID to your section, year, and official timetable — so you always know where to be.
            </p>

            <div className="mt-10 space-y-5">
              <FeatureItem icon={Zap} title="Instant timetable sync" desc="Your class schedule loads the moment you register — no manual entry." />
              <FeatureItem icon={Shield} title="University-verified identity" desc="Roll number + section binding means no mix-ups, ever." />
              <FeatureItem icon={BookOpen} title="Section-aware updates" desc="Announcements, changes, and substitutions reach exactly your class." />
            </div>
          </div>

          {/* Bottom credit */}
          <div className="mt-10 pt-6 border-t border-white/6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black text-white"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>CF</div>
              <div>
                <p className="text-white text-sm font-semibold">TimeTable Pro</p>
                <p className="text-slate-500 text-xs">Powered by CampusFlow · Arpan Jain</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── RIGHT PANEL (Form) ── */}
        <section className="rounded-3xl lg:rounded-l-none lg:rounded-r-3xl p-8 flex flex-col"
          style={{ background: 'rgba(10,14,28,0.92)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>

          {/* Header */}
          <div className="flex items-center justify-between mb-7">
            <div>
              <p className="text-xs font-semibold text-indigo-400 uppercase tracking-widest">Student Portal</p>
              <h1 className="text-2xl font-bold text-white mt-1.5">Create your account</h1>
            </div>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}>
              <GraduationCap size={22} className="text-indigo-300" />
            </div>
          </div>

          {/* Google button */}
          <button type="button" onClick={handleGoogleSignup} disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98] mb-5"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" />
              <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <span className="text-xs text-slate-600 font-medium">or register with email</span>
            <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5 flex-1">

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Full Name</label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  onFocus={() => setFocusedField('name')} onBlur={() => setFocusedField(null)}
                  className={inputClass('name')} placeholder="Your full name" required />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)}
                  className={inputClass('email')} placeholder="student@gla.ac.in" required />
              </div>
            </div>

            {/* Roll Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">University Roll Number</label>
              <div className="relative">
                <Hash size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
                <input value={form.universityRollNumber} onChange={e => setForm({ ...form, universityRollNumber: e.target.value.toUpperCase() })}
                  onFocus={() => setFocusedField('roll')} onBlur={() => setFocusedField(null)}
                  className={`${inputClass('roll')} uppercase font-mono tracking-widest`} placeholder="2315000***" required />
              </div>
            </div>

            {/* Session + Year */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Session</label>
                <div className="w-full bg-white/[0.03] border border-white/6 rounded-xl pl-4 pr-4 py-3 text-slate-500 text-sm cursor-not-allowed flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                  2026-27
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Year</label>
                <div className="w-full bg-white/[0.03] border border-white/6 rounded-xl pl-4 pr-4 py-3 text-slate-500 text-sm cursor-not-allowed flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
                  4th Year
                </div>
              </div>
            </div>

            {/* Section dropdown */}
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Section</label>
              <button type="button" onClick={() => setSectionOpen(!sectionOpen)}
                className={`w-full text-left pl-4 pr-4 py-3 rounded-xl text-sm flex items-center justify-between transition-all duration-200 ${sectionOpen ? 'border-indigo-400/60 ring-2 ring-indigo-500/15' : 'border-white/10 hover:border-white/20'} bg-white/[0.04] border`}
                style={{ color: form.section ? '#fff' : '#64748b' }}>
                <span>{form.section || 'Pick your section'}</span>
                <ChevronDown size={15} className={`text-slate-500 transition-transform duration-200 ${sectionOpen ? 'rotate-180' : ''}`} />
              </button>

              {sectionOpen && (
                <div className="absolute z-30 w-full mt-1.5 rounded-2xl shadow-2xl overflow-hidden"
                  style={{ background: '#0d1126', border: '1px solid rgba(99,102,241,0.25)' }}>
                  <div className="p-2.5 border-b" style={{ borderColor: 'rgba(99,102,241,0.1)' }}>
                    <div className="relative">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input value={sectionSearch} onChange={e => setSectionSearch(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/8 rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500/40"
                        placeholder="Search section..." autoFocus />
                    </div>
                  </div>
                  <div className="max-h-40 overflow-y-auto p-1.5">
                    {loadingSections ? (
                      <p className="text-slate-500 text-xs text-center py-4">Loading sections…</p>
                    ) : filteredSections.length === 0 ? (
                      <p className="text-slate-600 text-xs text-center py-4">No sections found</p>
                    ) : filteredSections.map(sec => (
                      <button key={sec._id || sec.name} type="button"
                        onClick={() => { setForm({ ...form, section: sec.name }); setSectionOpen(false); setSectionSearch('') }}
                        className={`w-full text-left px-3 py-2.5 rounded-xl text-sm flex items-center justify-between transition-all duration-150 ${form.section === sec.name ? 'text-indigo-300 bg-indigo-500/15' : 'text-slate-300 hover:bg-white/5'}`}>
                        {sec.name}
                        {form.section === sec.name && <Check size={13} className="text-indigo-400" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
                <input type={showPass ? 'text' : 'password'} value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  onFocus={() => setFocusedField('pass')} onBlur={() => setFocusedField(null)}
                  className={`${inputClass('pass')} pr-11`} placeholder="Min. 6 characters" required minLength={6} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-50 mt-1"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', boxShadow: '0 0 30px rgba(99,102,241,0.3)' }}>
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account…
                </>
              ) : (
                <>
                  Create account
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="text-slate-600 text-xs mt-5 text-center">
            Already registered?{' '}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">Sign in instead</Link>
          </p>
        </section>
      </div>
    </div>
  )
}
