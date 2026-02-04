'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { authAPI, storageAPI, githubAPI } from '../../../services/api'
import './settings.css'

const NOTIFICATION_INTERVALS = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'biweekly', label: 'Bi-Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'never', label: 'Never' }
]

// GitHub Icon Component
const GitHubIcon = ({ className = '', size = 24, connected = false }) => (
    <svg
        className={className}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={connected ? '#22c55e' : 'currentColor'}
    >
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
)

function SettingsPage() {
    const { user, updateProfile, connectGitHub, githubConnection, checkGithubConnection } = useAuth()
    const fileInputRef = useRef(null)

    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState('')
    const [error, setError] = useState('')
    const [githubLoading, setGithubLoading] = useState(false)
    const [githubError, setGithubError] = useState('')
    const [githubSuccess, setGithubSuccess] = useState('')
    const [syncLoading, setSyncLoading] = useState(false)

    const [formData, setFormData] = useState({
        fullName: user?.fullName || '',
        email: user?.email || '',
        targetRole: user?.targetRole || '',
        experienceLevel: user?.experienceLevel || '',
        notificationInterval: 'weekly', // Default
        notificationEmail: user?.email || ''
    })

    // Update formData when user loads (in case of direct navigation)
    useEffect(() => {
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
    }, [user, formData.email])

    // Refresh GitHub connection status on mount
    useEffect(() => {
        if (user?.id) {
            checkGithubConnection(user.id)
        }
    }, [user?.id, checkGithubConnection])

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
        setError('')
        try {
            // Upload resume with user ID - this also updates the profile in Supabase
            const response = await storageAPI.uploadResume(file, user?.id)

            // Also update local context
            await updateProfile({ resumeUrl: response.data.url })

            // Trigger resume skill extraction
            if (user?.id) {
                try {
                    await githubAPI.syncResume(user.id)
                    setSuccess('Resume updated and skills extracted successfully')
                } catch (syncError) {
                    console.warn('Resume skill extraction failed:', syncError)
                    setSuccess('Resume updated successfully')
                }
            } else {
                setSuccess('Resume updated successfully')
            }
        } catch (err) {
            console.error('Resume upload error:', err)
            setError('Failed to upload resume. Please try again.')
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

    const handleConnectGitHub = async () => {
        setGithubLoading(true)
        setGithubError('')
        setGithubSuccess('')

        try {
            const result = connectGitHub()
            if (!result.success) {
                setGithubError(result.error || 'Failed to connect GitHub')
                setGithubLoading(false)
            }
            // If successful, user will be redirected to GitHub OAuth
        } catch (err) {
            setGithubError('Failed to connect to GitHub. Please try again.')
            setGithubLoading(false)
        }
    }

    const handleSyncGitHub = async () => {
        if (!user?.id) return

        setSyncLoading(true)
        setGithubError('')
        setGithubSuccess('')

        try {
            const result = await githubAPI.triggerSync(user.id)
            if (result.success) {
                setGithubSuccess(`Synced ${result.data?.github?.repos_scanned || 0} repositories successfully!`)
                // Refresh connection status
                await checkGithubConnection(user.id)
            } else {
                setGithubError(result.error || 'Failed to sync repositories')
            }
        } catch (err) {
            setGithubError('Failed to sync GitHub repositories')
        }

        setSyncLoading(false)
    }

    const formatLastSync = (timestamp) => {
        if (!timestamp) return 'Never'
        const date = new Date(timestamp)
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
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

                    {/* Section: GitHub Connection */}
                    <div className="settings-section">
                        <div className="section-header">
                            <h2>GitHub Integration</h2>
                            <p>Connect your GitHub to extract skills from your repositories</p>
                        </div>

                        <div className="github-settings-content">
                            {githubConnection.loading ? (
                                <div className="github-loading">
                                    <div className="spinner" style={{ width: 24, height: 24 }}></div>
                                    <span>Checking GitHub connection...</span>
                                </div>
                            ) : githubConnection.connected ? (
                                <div className="github-connected-section">
                                    <div className="github-status-card connected">
                                        <div className="github-status-icon">
                                            <GitHubIcon size={40} connected={true} />
                                        </div>
                                        <div className="github-status-info">
                                            <div className="github-status-header">
                                                <h3>GitHub Connected</h3>
                                                <span className="github-badge connected">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <polyline points="20 6 9 17 4 12" />
                                                    </svg>
                                                    Connected
                                                </span>
                                            </div>
                                            <p>Connected as <strong>@{githubConnection.data?.github_username}</strong></p>
                                            <div className="github-meta">
                                                <span>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <circle cx="12" cy="12" r="10" />
                                                        <polyline points="12 6 12 12 16 14" />
                                                    </svg>
                                                    Last synced: {formatLastSync(githubConnection.data?.last_sync_at)}
                                                </span>
                                                {githubConnection.data?.repos_analyzed > 0 && (
                                                    <span>
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                                                        </svg>
                                                        {githubConnection.data.repos_analyzed} repos analyzed
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {githubSuccess && (
                                        <div className="github-alert success">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                            {githubSuccess}
                                        </div>
                                    )}

                                    {githubError && (
                                        <div className="github-alert error">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <circle cx="12" cy="12" r="10" />
                                                <line x1="12" y1="8" x2="12" y2="12" />
                                                <line x1="12" y1="16" x2="12.01" y2="16" />
                                            </svg>
                                            {githubError}
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        className="btn btn-outline btn-github-sync"
                                        onClick={handleSyncGitHub}
                                        disabled={syncLoading}
                                    >
                                        {syncLoading ? (
                                            <>
                                                <div className="spinner" style={{ width: 18, height: 18 }}></div>
                                                Syncing...
                                            </>
                                        ) : (
                                            <>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <polyline points="23 4 23 10 17 10" />
                                                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                                                </svg>
                                                Sync Repositories Now
                                            </>
                                        )}
                                    </button>
                                </div>
                            ) : (
                                <div className="github-not-connected">
                                    <div className="github-status-card not-connected">
                                        <div className="github-status-icon">
                                            <GitHubIcon size={40} />
                                        </div>
                                        <div className="github-status-info">
                                            <h3>GitHub Not Connected</h3>
                                            <p>Connect your GitHub account to automatically extract skills from your repositories</p>

                                            <ul className="github-benefits-mini">
                                                <li>Automatic skill detection from READMEs</li>
                                                <li>AI-powered technology analysis</li>
                                                <li>Weekly skill updates</li>
                                            </ul>
                                        </div>
                                    </div>

                                    {githubError && (
                                        <div className="github-alert error">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <circle cx="12" cy="12" r="10" />
                                                <line x1="12" y1="8" x2="12" y2="12" />
                                                <line x1="12" y1="16" x2="12.01" y2="16" />
                                            </svg>
                                            {githubError}
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        className="btn btn-github-connect"
                                        onClick={handleConnectGitHub}
                                        disabled={githubLoading}
                                    >
                                        {githubLoading ? (
                                            <>
                                                <div className="spinner" style={{ width: 20, height: 20 }}></div>
                                                Connecting...
                                            </>
                                        ) : (
                                            <>
                                                <GitHubIcon size={20} />
                                                Connect to GitHub
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
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
