import React, { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { AlertTriangle, Check, ChevronDown, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { fetchMe, setInitialized } from './store/slices/authSlice'
import { initializeFirebaseMessaging, requestNotificationPermission } from './services/firebaseNotification'
import api from './services/api'

import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import DashboardLayout from './components/shared/DashboardLayout'
import StudentDashboard from './pages/StudentDashboard'
import WeeklyView from './pages/WeeklyView'
import CalendarView from './pages/CalendarView'
import NotificationsPage from './pages/NotificationsPage'
import ProfilePage from './pages/ProfilePage'
import PageNotFound from './pages/PageNotFound'

import AdminDashboard from './pages/admin/AdminDashboard'
import AdminTimetable from './pages/admin/AdminTimetable'
import AdminSections from './pages/admin/AdminSections'
import AdminHolidays from './pages/admin/AdminHolidays'
import AdminStudents from './pages/admin/AdminStudents'
import AdminUpload from './pages/admin/AdminUpload'
import AdminList from './pages/admin/AdminList'
import AddAdmin from './pages/admin/AddAdmin'

import LoadingScreen from './components/shared/LoadingScreen'
import TopProgressBar from './components/shared/TopProgressBar'

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, token, initialized } = useSelector(s => s.auth)

  if (!initialized) return <LoadingScreen text="Checking session..." />
  if (!token || !user) return <Navigate to="/login" replace />
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" replace />

  return children
}

const PublicRoute = ({ children }) => {
  const { user, token, initialized } = useSelector(s => s.auth)

  if (!initialized) return <LoadingScreen text="Loading..." />
  if (token && user) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />
  }

  return children
}

// 👉 page names
const routeNames = {
  '/dashboard': 'Dashboard',
  '/weekly': 'Weekly Schedule',
  '/calendar': 'Calendar',
  '/notifications': 'Notifications',
  '/profile': 'Profile',

  '/admin': 'Admin Dashboard',
  '/admin/timetable': 'Timetable',
  '/admin/upload': 'Upload Excel',
  '/admin/sections': 'Sections',
  '/admin/holidays': 'Holidays',
  '/admin/students': 'Students',
  '/admin/admins': 'Admins',
  '/admin/add-admin': 'Add Admin',
}

const SectionUpdateModal = ({ open, onClose, currentSection, sections, selectedSection, onSectionChange, saving, onSave }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-indigo-500/20 bg-slate-950/95 p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-amber-500/10 p-2">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Please update your section</h3>
            <p className="mt-1 text-sm text-slate-400">
              Your current section does not match the available timetable sections. Update it to keep receiving the right class updates.
            </p>
          </div>
        </div>

        <div className="mt-5">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">Current section</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen(prev => !prev)}
              className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm text-white"
            >
              <span>{selectedSection || currentSection || 'Select section'}</span>
              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute z-10 mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 p-2 shadow-xl">
                {sections.length === 0 ? (
                  <p className="px-2 py-2 text-sm text-slate-400">No sections available yet.</p>
                ) : (
                  sections.map(section => (
                    <button
                      key={section}
                      type="button"
                      onClick={() => {
                        onSectionChange(section)
                        setDropdownOpen(false)
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${selectedSection === section ? 'bg-indigo-500/15 text-indigo-300' : 'text-slate-300 hover:bg-white/5'}`}
                    >
                      <span>{section}</span>
                      {selectedSection === section && <Check className="h-4 w-4 text-indigo-400" />}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/5"
          >
            Later
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !selectedSection}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Update section
          </button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const dispatch = useDispatch()
  const { token, initialized, user } = useSelector(s => s.auth)
  const location = useLocation()

  const [splash, setSplash] = useState(true)
  const [pageLoading, setPageLoading] = useState(false)
  const [firstRenderDone, setFirstRenderDone] = useState(false)
  const [sectionReminderOpen, setSectionReminderOpen] = useState(false)
  const [sectionOptions, setSectionOptions] = useState([])
  const [selectedSection, setSelectedSection] = useState('')
  const [sectionSaving, setSectionSaving] = useState(false)
  const [sectionReminderChecked, setSectionReminderChecked] = useState(false)

  // auth init
  useEffect(() => {
    if (token && !initialized) {
      dispatch(fetchMe())
    } else if (!token && !initialized) {
      dispatch(setInitialized())
    }
  }, [token, initialized, dispatch])

  useEffect(() => {
    if (!token || !initialized || !user || sectionReminderChecked) return

    let active = true

    const checkSectionReminder = async () => {
      try {
        const sessionValue = user.session || '2026-27'
        const { data } = await api.get('/sections', { params: { session: sessionValue } })
        const sections = Array.isArray(data?.sections)
          ? data.sections.map(section => (section?.name || '').toString().trim().toUpperCase())
          : []
        const currentSection = (user.section || '').toString().trim().toUpperCase()
        const needsReminder = !currentSection || !sections.includes(currentSection)

        if (active && needsReminder) {
          setSectionOptions(sections)
          setSelectedSection(currentSection || sections[0] || '')
          setSectionReminderOpen(true)

          try {
            await api.post('/auth/send-section-update-notification', {
              recipientId: user._id,
              subject: 'Please update your section',
              message: 'Please update your section in your profile page so you continue receiving the correct timetable updates and class alerts.'
            })
          } catch (notificationError) {
            console.error('Unable to send automatic section reminder:', notificationError)
          }
        }
      } catch (error) {
        console.error('Unable to load sections for reminder:', error)
      } finally {
        if (active) setSectionReminderChecked(true)
      }
    }

    checkSectionReminder()

    return () => {
      active = false
    }
  }, [token, initialized, user, sectionReminderChecked])

  // Firebase messaging init and permission request
  useEffect(() => {
    const setupNotifications = async () => {
      if (token && initialized) {
        // Initialize Firebase messaging
        await initializeFirebaseMessaging()

        // Request permission automatically
        const hasPermission = await requestNotificationPermission()
        if (hasPermission) {
          console.log('✅ Push notifications enabled')
        } else {
          console.log('⚠️  Push notifications disabled')
        }
      }
    }

    setupNotifications()
  }, [token, initialized])

  // splash only first time
  useEffect(() => {
    const timer = setTimeout(() => {
      setSplash(false)
      setFirstRenderDone(true)
    }, 1800)

    return () => clearTimeout(timer)
  }, [])

  // route loader
  useEffect(() => {
    if (!firstRenderDone) return

    setPageLoading(true)

    const timer = setTimeout(() => {
      setPageLoading(false)
    }, 400)

    return () => clearTimeout(timer)
  }, [location.pathname, firstRenderDone])

  // SPLASH SCREEN
  if (splash) {
    return <LoadingScreen text="Loading Timetable System..." />
  }

  const pageName = routeNames[location.pathname] || "Page"

  const handleSectionSave = async () => {
    if (!selectedSection || !user) return

    setSectionSaving(true)
    try {
      await api.put('/auth/profile', {
        name: user.name,
        section: selectedSection,
        year: user.year,
        session: user.session,
      })
      await dispatch(fetchMe())
      toast.success('Section updated successfully')
      setSectionReminderOpen(false)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update your section')
    } finally {
      setSectionSaving(false)
    }
  }

  return (
    <>
      {/* 🔥 Top Progress Bar */}
      <TopProgressBar loading={pageLoading} />

      {/* 🔥 Overlay loader (NOT full screen block) */}
      {pageLoading && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <LoadingScreen text={`Loading ${pageName}...`} />
        </div>
      )}

      <SectionUpdateModal
        open={sectionReminderOpen}
        onClose={() => setSectionReminderOpen(false)}
        currentSection={user?.section || ''}
        sections={sectionOptions}
        selectedSection={selectedSection}
        onSectionChange={setSelectedSection}
        saving={sectionSaving}
        onSave={handleSectionSave}
      />

      <Routes>
        <Route path="/" element={<Navigate to={token ? "/dashboard" : "/login"} replace />} />

        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
        <Route path="/reset-password" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />

        {/* Student */}
        <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route path="student/dashboard" element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="weekly" element={<WeeklyView />} />
          <Route path="calendar" element={<CalendarView />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Admin */}
        <Route path="/admin" element={<ProtectedRoute adminOnly><DashboardLayout isAdmin /></ProtectedRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="timetable" element={<AdminTimetable />} />
          <Route path="upload" element={<AdminUpload />} />
          <Route path="sections" element={<AdminSections />} />
          <Route path="holidays" element={<AdminHolidays />} />
          <Route path="students" element={<AdminStudents />} />
          <Route path="admins" element={<AdminList />} />
          <Route path="add-admin" element={<AddAdmin />} />
        </Route>

        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </>
  )
}
