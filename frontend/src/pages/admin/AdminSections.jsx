import React, { useEffect, useState } from 'react'
import { GraduationCap, Plus, Pencil, Trash2, X, Save, Sparkles } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

const FloatingOrb = ({ className }) => (
  <div className={`absolute rounded-full blur-3xl opacity-20 pointer-events-none ${className}`} />
)

const PANEL = { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }
const inputClass = "w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 text-sm transition-all duration-200 outline-none hover:border-white/20 focus:border-indigo-400/60 focus:ring-2 focus:ring-indigo-500/15"
const labelClass = "block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide"

export default function AdminSections() {
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ name: '', session: '2026-27', year: '4th Year' })
  const [saving, setSaving] = useState(false)

  const fetchSections = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/sections', { params: { session: '2026-27' } })
      setSections(data.sections)
    } catch { toast.error('Failed to load sections') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchSections() }, [])

  const openAdd = () => { setForm({ name: '', session: '2026-27', year: '4th Year' }); setModal('add') }
  const openEdit = (sec) => { setForm(sec); setModal('edit') }

  const handleSave = async () => {
    if (!form.name || !form.session) return toast.error('Section name required')
    setSaving(true)
    try {
      if (modal === 'edit') await api.put(`/sections/${form._id}`, form)
      else await api.post('/sections', form)
      toast.success(modal === 'edit' ? 'Section updated' : 'Section created')
      setModal(null)
      fetchSections()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this section?')) return
    try {
      await api.delete(`/sections/${id}`)
      toast.success('Section deleted')
      fetchSections()
    } catch { toast.error('Failed') }
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

      <div className="relative z-10 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.3)' }}>
              <GraduationCap size={20} className="text-cyan-300" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-cyan-300 mb-1"
                style={{ background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.25)' }}>
                <Sparkles size={10} />
                Session 2026-27
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight">Sections</h1>
              <p className="text-slate-400 text-sm">{sections.length} active sections</p>
            </div>
          </div>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', boxShadow: '0 0 30px rgba(99,102,241,0.3)' }}>
            <Plus size={16} />
            Add Section
          </button>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }} />
            ))}
          </div>
        ) : sections.length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={PANEL}>
            <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <GraduationCap size={28} className="text-slate-600" />
            </div>
            <p className="text-slate-300 font-medium">No sections yet</p>
            <p className="text-slate-500 text-sm mt-1">Create sections or upload an Excel file to auto-generate them</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {sections.map(sec => (
              <div key={sec._id}
                className="rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5 group"
                style={PANEL}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(34,211,238,0.35)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.25)' }}>
                    <span className="text-cyan-300 font-bold text-sm">{sec.name}</span>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button onClick={() => openEdit(sec)} className="p-1.5 rounded-lg hover:bg-indigo-500/15 text-slate-500 hover:text-indigo-300 transition-colors duration-150">
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => handleDelete(sec._id)} className="p-1.5 rounded-lg hover:bg-red-500/15 text-slate-500 hover:text-red-300 transition-colors duration-150">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <p className="text-white font-semibold text-sm">{sec.name}</p>
                <p className="text-slate-500 text-xs font-mono mt-0.5">{sec.session}</p>
                {sec.year && <p className="text-slate-600 text-xs mt-0.5">{sec.year}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {modal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-3xl p-6 animate-slide-up"
              style={{ background: 'rgba(10,14,28,0.96)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  {modal === 'add' ? <><Plus size={17} className="text-cyan-400" /> Add Section</> : <><Pencil size={15} className="text-cyan-400" /> Edit Section</>}
                </h2>
                <button onClick={() => setModal(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors duration-150">
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Section Name *</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value.toUpperCase() })}
                    className={`${inputClass} font-mono uppercase tracking-widest`} placeholder="e.g. 3A" />
                </div>
                <div>
                  <label className={labelClass}>Session</label>
                  <div className="w-full bg-white/[0.03] border border-white/6 rounded-xl px-4 py-3 text-slate-400 text-sm cursor-not-allowed flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                    2026-27
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Year</label>
                  <div className="w-full bg-white/[0.03] border border-white/6 rounded-xl px-4 py-3 text-slate-400 text-sm cursor-not-allowed flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
                    4th Year
                  </div>
                </div>
                <div className="flex gap-3 pt-1">
                  <button onClick={handleSave} disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', boxShadow: '0 0 30px rgba(99,102,241,0.3)' }}>
                    <Save size={14} />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={() => setModal(null)}
                    className="px-5 py-3 rounded-xl text-sm font-medium text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)' }}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}