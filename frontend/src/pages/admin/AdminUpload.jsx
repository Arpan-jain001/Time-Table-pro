import React, { useState, useRef, useEffect } from 'react'
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X, Info, Download, Calendar, Sparkles, User } from 'lucide-react'
import api from '../../services/api'
import toast from 'react-hot-toast'

const FloatingOrb = ({ className }) => (
  <div className={`absolute rounded-full blur-3xl opacity-20 pointer-events-none ${className}`} />
)

const PANEL = { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }

export default function AdminUpload() {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)
  const [session, setSession] = useState('2026-27')
  const [dragOver, setDragOver] = useState(false)
  const [refFile, setRefFile] = useState(null)
  const [loadingRef, setLoadingRef] = useState(false)
  const fileRef = useRef()

  // Fetch reference file info on mount
  useEffect(() => {
    fetchReferenceFile()
  }, [])

  const fetchReferenceFile = async () => {
    setLoadingRef(true)
    try {
      const { data } = await api.get('/timetable/reference/info')
      if (data.success && data.refFile) {
        setRefFile(data.refFile)
      }
    } catch (err) {
      console.error('Error fetching reference:', err)
    } finally {
      setLoadingRef(false)
    }
  }

  const handleDownloadReference = async () => {
    if (!refFile) return
    try {
      const response = await api.get(refFile.downloadUrl || `/timetable/reference/${refFile._id}/download`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', refFile.fileName || 'timetable-reference.xlsx')
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success(`Downloaded: ${refFile.fileName}`)
    } catch (error) {
      console.error('Reference download error:', error)
      toast.error('Failed to download reference file')
    }
  }

  const handleFile = (f) => {
    if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))) {
      setFile(f)
      setResult(null)
    } else {
      toast.error('Please upload a valid Excel file (.xlsx or .xls)')
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleUpload = async () => {
    if (!file) return toast.error('Please select a file first')
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('session', '2026-27')
      const { data } = await api.post('/timetable/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setResult(data)
      setFile(null)
      toast.success(`Upload successful: ${data.created} created, ${data.updated} updated`)
      // Refresh reference file info
      setTimeout(fetchReferenceFile, 500)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed')
    } finally {
      setUploading(false)
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

      <div className="relative z-10 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}>
            <Upload size={20} className="text-indigo-300" />
          </div>
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-indigo-300 mb-1"
              style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}>
              <Sparkles size={10} />
              Session 2026-27
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Upload Timetable</h1>
            <p className="text-slate-400 text-sm">Import from Excel spreadsheet</p>
          </div>
        </div>

        {/* Excel format guide */}
        <div className="rounded-2xl p-5" style={{ background: 'rgba(34,211,238,0.05)', border: '1px solid rgba(34,211,238,0.18)' }}>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.25)' }}>
              <Info size={16} className="text-cyan-300" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm mb-2.5">Expected Excel column headers</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {['Section', 'Day', 'Subject', 'Code', 'Faculty', 'Room', 'Block', 'StartTime', 'EndTime', 'Type', 'Session', 'Year'].map(col => (
                  <span key={col} className="font-mono text-xs text-cyan-300 px-2 py-1 rounded-lg"
                    style={{ background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.18)' }}>{col}</span>
                ))}
              </div>
              <p className="text-slate-400 text-xs mt-3 leading-relaxed">
                <span className="text-slate-300 font-semibold">Section</span> supports ranges: <span className="font-mono text-cyan-300">3A,3B,3C</span> or <span className="font-mono text-cyan-300">3A-3F</span> — entries are auto-created for each section.
                Missing sections are auto-created. Duplicate entries are updated, not duplicated.
              </p>
            </div>
          </div>
        </div>

        {/* Session selector - Locked to 2026-27 */}
        <div className="rounded-2xl p-5" style={PANEL}>
          <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Academic Session</label>
          <div className="w-full bg-white/[0.03] border border-white/6 rounded-xl px-4 py-3 text-slate-400 text-sm cursor-not-allowed flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
            2026-27
          </div>
          <p className="text-slate-500 text-xs mt-2">Session is locked to 2026-27 for all uploads</p>
        </div>

        {/* Current Reference File Status */}
        {loadingRef ? (
          <div className="rounded-2xl p-5" style={PANEL}>
            <div className="h-4 w-1/4 rounded mb-3 animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <div className="h-10 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
          </div>
        ) : refFile ? (
          <div className="rounded-2xl p-5" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.18)' }}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle size={17} className="text-emerald-400" />
                  <p className="font-semibold text-emerald-300 text-sm">Current reference timetable</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-300">
                    <FileSpreadsheet size={14} className="text-cyan-400 flex-shrink-0" />
                    <span className="truncate"><span className="text-slate-400">File:</span> {refFile.fileName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="text-slate-400 text-xs ml-[22px]">Size:</span> {refFile.fileSize}
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Calendar size={14} className="text-indigo-400 flex-shrink-0" />
                    <span><span className="text-slate-400">Uploaded:</span> {new Date(refFile.uploadDate).toLocaleDateString('en-IN')} {new Date(refFile.uploadDate).toLocaleTimeString('en-IN')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <User size={14} className="text-violet-400 flex-shrink-0" />
                    <span><span className="text-slate-400">Uploaded by:</span> {refFile.uploadedBy}</span>
                  </div>
                  {refFile.description && (
                    <p className="text-slate-500 text-xs italic mt-2">{refFile.description}</p>
                  )}
                </div>
              </div>
              <button
                onClick={handleDownloadReference}
                className="flex items-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98] flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)' }}
                title="Download the official reference timetable"
              >
                <Download size={15} />
                Download
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl p-5" style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.18)' }}>
            <div className="flex items-center gap-3">
              <AlertCircle size={18} className="text-amber-400 flex-shrink-0" />
              <p className="text-amber-300 text-sm">No reference timetable uploaded yet. Upload the first file to set the official reference.</p>
            </div>
          </div>
        )}

        {/* Drop zone */}
        <div
          onClick={() => fileRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          className="rounded-2xl p-10 text-center cursor-pointer transition-all duration-300"
          style={dragOver
            ? { background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.5)', transform: 'scale(1.005)' }
            : { ...PANEL }}
          onMouseEnter={e => { if (!dragOver) { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; e.currentTarget.style.background = 'rgba(99,102,241,0.04)' } }}
          onMouseLeave={e => { if (!dragOver) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)' } }}
        >
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => handleFile(e.target.files[0])} />

          {file ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
                <FileSpreadsheet size={26} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-white font-semibold">{file.name}</p>
                <p className="text-slate-400 text-sm">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null) }}
                className="flex items-center gap-1.5 text-red-400 hover:text-red-300 text-sm transition-colors duration-150"
              >
                <X size={14} />
                Remove file
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(99,102,241,0.08)', border: '2px dashed rgba(99,102,241,0.3)' }}>
                <Upload size={28} className="text-indigo-300" />
              </div>
              <div>
                <p className="text-white font-semibold">Drop your Excel file here</p>
                <p className="text-slate-400 text-sm mt-1">or click to browse</p>
                <p className="text-slate-600 text-xs mt-2">.xlsx or .xls, max 10MB</p>
              </div>
            </div>
          )}
        </div>

        {/* Upload button */}
        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', boxShadow: '0 0 30px rgba(99,102,241,0.3)' }}
        >
          {uploading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Processing Excel...
            </>
          ) : (
            <>
              <Upload size={18} />
              Upload & Process
            </>
          )}
        </button>

        {/* Results */}
        {result && (
          <div className="rounded-2xl p-5 animate-slide-up" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.18)' }}>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle size={19} className="text-emerald-400" />
              <p className="font-semibold text-emerald-300 text-sm">Upload complete</p>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)' }}>
                <p className="text-2xl font-black text-emerald-400 tabular-nums">{result.created}</p>
                <p className="text-slate-400 text-xs mt-0.5">Created</p>
              </div>
              <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.15)' }}>
                <p className="text-2xl font-black text-cyan-400 tabular-nums">{result.updated}</p>
                <p className="text-slate-400 text-xs mt-0.5">Updated</p>
              </div>
              <div className="text-center p-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
                <p className="text-2xl font-black text-indigo-400 tabular-nums">{result.sections?.length || 0}</p>
                <p className="text-slate-400 text-xs mt-0.5">Sections</p>
              </div>
            </div>

            {result.sections?.length > 0 && (
              <div>
                <p className="text-slate-400 text-xs mb-2">Sections processed:</p>
                <div className="flex flex-wrap gap-2">
                  {result.sections.map(s => (
                    <span key={s} className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-400/30">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {result.errors?.length > 0 && (
              <div className="mt-4 p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <AlertCircle size={14} className="text-red-400" />
                  <p className="text-red-400 text-xs font-medium">{result.errors.length} row errors</p>
                </div>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-red-300/70 text-xs font-mono">{err}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}