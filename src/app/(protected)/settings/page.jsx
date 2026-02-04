'use client'

import { useState, useRef } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { authAPI, storageAPI } from '../../../services/api'
import './settings.css'

const NOTIFICATION_INTERVALS = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'biweekly', label: 'Bi-Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'never', label: 'Never' }
]

function SettingsPage() {
    const { user, updateProfile } = useAuth()
    const fileInputRef = useRef(null)

    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState('')
    const [error, setError] = useState('')

    const [formData, setFormData] = useState({
        fullName: user?.fullName || '',
        email: user?.email || '',
        targetRole: user?.targetRole || '',
        experienceLevel: user?.experienceLevel || '',
        notificationInterval: 'weekly', // Default
        notificationEmail: user?.email || ''
    })

    // Update formData when user loads (in case of direct navigation)
    if (user && formData.email === '' && user.email) {
        setFormData({
            fullName: user.fullName || '',
            email: user.email || '',
            targetRole: user.targetRole || '',
            experienceLevel: user.experienceLevel || '',
            notificationInterval: user.preferences?.notifications || 'weekly',
            notificationEmail: user.email || ''
        })
    }

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        })
        setSuccess('')
        setError('')
    }

    const handleResumeUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        if (file.type !== 'application/pdf') {
            setError('Please upload a PDF file only')
            return
        }

        setLoading(true)
        try {
            const response = await storageAPI.uploadResume(file)
            await updateProfile({ resumeUrl: response.data.url })
            setSuccess('Resume updated successfully')
        } catch (err) {
            setError('Failed to upload resume')
        }
        setLoading(false)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setSuccess('')

        try {
            // API call first
            await authAPI.updateProfile(formData)
            // Then context update
            await updateProfile(formData)
            setSuccess('Settings saved successfully')
        } catch (err) {
            setError('Failed to save settings')
        }
        setLoading(false)
    }

    return (
        <div className="settings-page">
            <div className="settings-container">
                {/* Header */}
                <div className="page-header">
                    <h1>Settings</h1>
                    <p>Manage your profile and preferences</p>
                </div>

                {/* Notifications */}
                {success && (
                    <div className="settings-alert success animate-fadeIn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                        {success}
                    </div>
                )}

                {error && (
                    <div className="settings-alert error animate-fadeIn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        {error}
                    </div>
                )}

                {/* Settings Form */}
                <form onSubmit={handleSubmit} className="settings-form">
                    {/* Section: Profile */}
                    <div className="settings-section">
                        <div className="section-header">
                            <h2>Profile Information</h2>
                            <p>Update your personal details</p>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Full Name</label>
                            <input
                                type="text"
                                name="fullName"
                                className="form-input"
                                value={formData.fullName}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <input
                                type="email"
                                name="email"
                                className="form-input"
                                value={formData.email}
                                disabled
                            />
                            <span className="form-hint">Email cannot be changed</span>
                        </div>
                    </div>

                    <div className="divider"></div>

                    {/* Section: Career Preferences */}
                    <div className="settings-section">
                        <div className="section-header">
                            <h2>Career Preferences</h2>
                            <p>Customize your analysis parameters</p>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Target Role</label>
                            <select
                                name="targetRole"
                                className="form-select"
                                value={formData.targetRole}
                                onChange={handleChange}
                            >
                                <option value="">Select Target Role</option>
                                <option value="Machine Learning Engineer">Machine Learning Engineer</option>
                                <option value="Data Scientist">Data Scientist</option>
                                <option value="Full Stack Developer">Full Stack Developer</option>
                                <option value="DevOps Engineer">DevOps Engineer</option>
                                <option value="Cloud Architect">Cloud Architect</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Experience Level</label>
                            <select
                                name="experienceLevel"
                                className="form-select"
                                value={formData.experienceLevel}
                                onChange={handleChange}
                            >
                                <option value="">Select Experience Level</option>
                                <option value="entry">Entry Level (0-2 years)</option>
                                <option value="mid">Mid Level (2-5 years)</option>
                                <option value="senior">Senior Level (5-8 years)</option>
                                <option value="lead">Lead/Principal (8+ years)</option>
                            </select>
                        </div>
                    </div>

                    <div className="divider"></div>

                    {/* Section: Resume */}
                    <div className="settings-section">
                        <div className="section-header">
                            <h2>Resume Settings</h2>
                            <p>Manage your uploaded resume</p>
                        </div>

                        <div className="resume-settings">
                            <div className="current-resume">
                                <div className="file-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <path d="M14 2v6h6" />
                                        <path d="M16 13H8" />
                                        <path d="M16 17H8" />
                                        <path d="M10 9H8" />
                                    </svg>
                                </div>
                                <div className="file-info">
                                    <span className="file-name">Current Resume.pdf</span>
                                    <span className="file-meta">Uploaded on Feb 4, 2024</span>
                                </div>
                                <button
                                    type="button"
                                    className="btn btn-outline btn-sm"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    Update
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf"
                                    onChange={handleResumeUpload}
                                    style={{ display: 'none' }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="divider"></div>

                    {/* Section: Notifications */}
                    <div className="settings-section">
                        <div className="section-header">
                            <h2>Notifications</h2>
                            <p>Manage how and when you receive updates</p>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Report Frequency</label>
                            <select
                                name="notificationInterval"
                                className="form-select"
                                value={formData.notificationInterval}
                                onChange={handleChange}
                            >
                                {NOTIFICATION_INTERVALS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            <span className="form-hint">
                                How often you want to receive skill gap analysis reports
                            </span>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Notification Email</label>
                            <input
                                type="email"
                                name="notificationEmail"
                                className="form-input"
                                value={formData.notificationEmail}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="settings-actions">
                        <button
                            type="submit"
                            className="btn btn-primary btn-lg"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <div className="spinner" style={{ width: 20, height: 20 }}></div>
                                    Saving...
                                </>
                            ) : (
                                'Save Changes'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default SettingsPage
