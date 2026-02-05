'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { authAPI, storageAPI, githubAPI, apiKeyAPI } from '../../../services/api'
import './settings.css'

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

// Info Icon Component
const InfoIcon = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
)

// API Key Info Modal Component
const ApiKeyInfoModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content api-key-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>How to Get a Google AI Studio API Key</h3>
                    <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
                <div className="modal-body">
                    <ol className="api-key-steps">
                        <li>
                            <span className="step-number">1</span>
                            <div className="step-content">
                                <strong>Go to Google AI Studio</strong>
                                <p>Visit <a href="https://ai.google.dev" target="_blank" rel="noopener noreferrer">ai.google.dev</a></p>
                            </div>
                        </li>
                        <li>
                            <span className="step-number">2</span>
                            <div className="step-content">
                                <strong>Sign in using a Google account</strong>
                                <p>Use your existing Google account or create a new one</p>
                            </div>
                        </li>
                        <li>
                            <span className="step-number">3</span>
                            <div className="step-content">
                                <strong>Navigate to API Keys</strong>
                                <p>Find the API Keys section from the dashboard menu</p>
                            </div>
                        </li>
                        <li>
                            <span className="step-number">4</span>
                            <div className="step-content">
                                <strong>Click "Create API Key"</strong>
                                <p>Generate a new API key for your application</p>
                            </div>
                        </li>
                        <li>
                            <span className="step-number">5</span>
                            <div className="step-content">
                                <strong>Copy the generated API key</strong>
                                <p>Make sure to copy it immediately as it won't be shown again</p>
                            </div>
                        </li>
                        <li>
                            <span className="step-number">6</span>
                            <div className="step-content">
                                <strong>Paste the API key here</strong>
                                <p>Enter it in the BYOK field in Settings</p>
                            </div>
                        </li>
                    </ol>
                    <div className="api-key-note">
                        <InfoIcon size={16} />
                        <span>Your API key is stored securely and never logged or exposed.</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

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
    const [resumeInfo, setResumeInfo] = useState(null)
    const [resumeLoading, setResumeLoading] = useState(true)

    // BYOK State
    const [apiKey, setApiKey] = useState('')
    const [apiKeyStatus, setApiKeyStatus] = useState({ hasKey: false, data: null, loading: true })
    const [apiKeyLoading, setApiKeyLoading] = useState(false)
    const [apiKeyError, setApiKeyError] = useState('')
    const [apiKeySuccess, setApiKeySuccess] = useState('')
    const [showApiKeyModal, setShowApiKeyModal] = useState(false)
    const [showApiKeyInput, setShowApiKeyInput] = useState(false)

    const [formData, setFormData] = useState({
        fullName: user?.fullName || '',
        email: user?.email || '',
        targetRole: user?.targetRole || '',
        experienceLevel: user?.experienceLevel || '',
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

    // Fetch resume info on mount
    useEffect(() => {
        const fetchResumeInfo = async () => {
            if (!user?.id) {
                setResumeLoading(false)
                return
            }

            try {
                const info = await storageAPI.getResumeInfo(user.id)
                setResumeInfo(info)
            } catch (err) {
                console.error('Failed to fetch resume info:', err)
            }
            setResumeLoading(false)
        }

        fetchResumeInfo()
    }, [user?.id])

    // Fetch API key status on mount
    useEffect(() => {
        const fetchApiKeyStatus = async () => {
            if (!user?.id) {
                setApiKeyStatus({ hasKey: false, data: null, loading: false })
                return
            }

            try {
                const status = await apiKeyAPI.getApiKeyStatus(user.id)
                setApiKeyStatus({ ...status, loading: false })
            } catch (err) {
                console.error('Failed to fetch API key status:', err)
                setApiKeyStatus({ hasKey: false, data: null, loading: false })
            }
        }

        fetchApiKeyStatus()
    }, [user?.id])

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

            // Update local resume info state to reflect the change immediately
            setResumeInfo({
                url: response.data.url,
                signedUrl: response.data.signedUrl,
                uploadedAt: response.data.uploadedAt,
                filename: response.data.filename
            })

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

    // BYOK Handlers
    const handleSaveApiKey = async () => {
        if (!user?.id || !apiKey.trim()) {
            setApiKeyError('Please enter a valid API key')
            return
        }

        setApiKeyLoading(true)
        setApiKeyError('')
        setApiKeySuccess('')

        try {
            const result = await apiKeyAPI.saveApiKey(user.id, apiKey.trim())
            if (result.success) {
                setApiKeySuccess('API key saved successfully')
                setApiKeyStatus({ hasKey: true, data: result.data, loading: false })
                setApiKey('') // Clear the input
                setShowApiKeyInput(false)
            } else {
                setApiKeyError(result.error || 'Failed to save API key')
            }
        } catch (err) {
            setApiKeyError('Failed to save API key. Please try again.')
        }

        setApiKeyLoading(false)
    }

    const handleDeleteApiKey = async () => {
        if (!user?.id) return

        setApiKeyLoading(true)
        setApiKeyError('')
        setApiKeySuccess('')

        try {
            const result = await apiKeyAPI.deleteApiKey(user.id)
            if (result.success) {
                setApiKeySuccess('API key removed successfully')
                setApiKeyStatus({ hasKey: false, data: null, loading: false })
            } else {
                setApiKeyError(result.error || 'Failed to remove API key')
            }
        } catch (err) {
            setApiKeyError('Failed to remove API key')
        }

        setApiKeyLoading(false)
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

                    {/* Section: BYOK API Key */}
                    <div className="settings-section">
                        <div className="section-header">
                            <h2>API Key (BYOK)</h2>
                            <p>Bring Your Own Key for AI features</p>
                        </div>

                        <div className="byok-settings-content">
                            {apiKeyStatus.loading ? (
                                <div className="byok-loading">
                                    <div className="spinner" style={{ width: 24, height: 24 }}></div>
                                    <span>Checking API key status...</span>
                                </div>
                            ) : apiKeyStatus.hasKey && !showApiKeyInput ? (
                                <div className="byok-status-section">
                                    <div className="byok-status-card has-key">
                                        <div className="byok-status-icon">
                                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                                                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                                            </svg>
                                        </div>
                                        <div className="byok-status-info">
                                            <div className="byok-status-header">
                                                <h3>Google AI Studio API Key</h3>
                                                <span className="byok-badge saved">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <polyline points="20 6 9 17 4 12" />
                                                    </svg>
                                                    API key saved
                                                </span>
                                            </div>
                                            <p>Key: <code>{apiKeyStatus.data?.prefix || '••••••••'}</code></p>
                                            <div className="byok-meta">
                                                <span>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <circle cx="12" cy="12" r="10" />
                                                        <polyline points="12 6 12 12 16 14" />
                                                    </svg>
                                                    Updated: {formatLastSync(apiKeyStatus.data?.updatedAt)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {apiKeySuccess && (
                                        <div className="byok-alert success">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                            {apiKeySuccess}
                                        </div>
                                    )}

                                    {apiKeyError && (
                                        <div className="byok-alert error">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <circle cx="12" cy="12" r="10" />
                                                <line x1="12" y1="8" x2="12" y2="12" />
                                                <line x1="12" y1="16" x2="12.01" y2="16" />
                                            </svg>
                                            {apiKeyError}
                                        </div>
                                    )}

                                    <div className="byok-actions">
                                        <button
                                            type="button"
                                            className="btn btn-outline"
                                            onClick={() => setShowApiKeyInput(true)}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                            </svg>
                                            Update Key
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-danger"
                                            onClick={handleDeleteApiKey}
                                            disabled={apiKeyLoading}
                                        >
                                            {apiKeyLoading ? (
                                                <div className="spinner" style={{ width: 16, height: 16 }}></div>
                                            ) : (
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <polyline points="3 6 5 6 21 6" />
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                </svg>
                                            )}
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="byok-input-section">
                                    <div className="byok-input-card">
                                        <div className="byok-input-header">
                                            <label className="form-label">
                                                Google AI Studio API Key
                                                <span className="optional-badge">Optional</span>
                                            </label>
                                            <button
                                                type="button"
                                                className="info-btn"
                                                onClick={() => setShowApiKeyModal(true)}
                                                aria-label="How to get an API key"
                                            >
                                                <InfoIcon size={18} />
                                            </button>
                                        </div>
                                        <div className="byok-input-wrapper">
                                            <input
                                                type="password"
                                                className="form-input"
                                                placeholder="Enter your Google AI Studio API key"
                                                value={apiKey}
                                                onChange={(e) => {
                                                    setApiKey(e.target.value)
                                                    setApiKeyError('')
                                                }}
                                            />
                                        </div>
                                        <span className="form-hint">
                                            Your API key enables advanced AI-powered analysis features. It is stored securely and never logged.
                                        </span>

                                        {apiKeySuccess && (
                                            <div className="byok-alert success">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                                {apiKeySuccess}
                                            </div>
                                        )}

                                        {apiKeyError && (
                                            <div className="byok-alert error">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <circle cx="12" cy="12" r="10" />
                                                    <line x1="12" y1="8" x2="12" y2="12" />
                                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                                </svg>
                                                {apiKeyError}
                                            </div>
                                        )}

                                        <div className="byok-actions">
                                            <button
                                                type="button"
                                                className="btn btn-primary"
                                                onClick={handleSaveApiKey}
                                                disabled={apiKeyLoading || !apiKey.trim()}
                                            >
                                                {apiKeyLoading ? (
                                                    <>
                                                        <div className="spinner" style={{ width: 18, height: 18 }}></div>
                                                        Saving...
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                                                            <polyline points="17 21 17 13 7 13 7 21" />
                                                            <polyline points="7 3 7 8 15 8" />
                                                        </svg>
                                                        Save API Key
                                                    </>
                                                )}
                                            </button>
                                            {showApiKeyInput && (
                                                <button
                                                    type="button"
                                                    className="btn btn-ghost"
                                                    onClick={() => {
                                                        setShowApiKeyInput(false)
                                                        setApiKey('')
                                                        setApiKeyError('')
                                                    }}
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
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
                            {resumeLoading ? (
                                <div className="resume-loading">
                                    <div className="spinner" style={{ width: 24, height: 24 }}></div>
                                    <span>Loading resume info...</span>
                                </div>
                            ) : resumeInfo && resumeInfo.url ? (
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
                                        <span className="file-name">
                                            {resumeInfo.filename || 'Resume.pdf'}
                                        </span>
                                        <span className="file-meta">
                                            Uploaded on {resumeInfo.uploadedAt
                                                ? new Date(resumeInfo.uploadedAt).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })
                                                : 'Unknown date'
                                            }
                                        </span>
                                    </div>
                                    <div className="resume-actions">
                                        <a
                                            href={resumeInfo.signedUrl || resumeInfo.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn btn-ghost btn-sm"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                <circle cx="12" cy="12" r="3" />
                                            </svg>
                                            View
                                        </a>
                                        <button
                                            type="button"
                                            className="btn btn-outline btn-sm"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <>
                                                    <div className="spinner" style={{ width: 14, height: 14 }}></div>
                                                    Uploading...
                                                </>
                                            ) : (
                                                <>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                        <polyline points="17 8 12 3 7 8" />
                                                        <line x1="12" y1="3" x2="12" y2="15" />
                                                    </svg>
                                                    Replace
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".pdf"
                                        onChange={handleResumeUpload}
                                        style={{ display: 'none' }}
                                    />
                                </div>
                            ) : (
                                <div className="no-resume">
                                    <div className="no-resume-icon">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                            <path d="M14 2v6h6" />
                                            <line x1="12" y1="11" x2="12" y2="17" />
                                            <line x1="9" y1="14" x2="15" y2="14" />
                                        </svg>
                                    </div>
                                    <div className="no-resume-text">
                                        <h4>No Resume Uploaded</h4>
                                        <p>Upload your resume to extract skills and enhance your analysis</p>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <>
                                                <div className="spinner" style={{ width: 18, height: 18 }}></div>
                                                Uploading...
                                            </>
                                        ) : (
                                            <>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                    <polyline points="17 8 12 3 7 8" />
                                                    <line x1="12" y1="3" x2="12" y2="15" />
                                                </svg>
                                                Upload Resume
                                            </>
                                        )}
                                    </button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".pdf"
                                        onChange={handleResumeUpload}
                                        style={{ display: 'none' }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="divider"></div>

                    {/* Section: Notifications */}
                    <div className="settings-section">
                        <div className="section-header">
                            <h2>Notifications</h2>
                            <p>Manage how you receive updates</p>
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

            {/* API Key Info Modal */}
            <ApiKeyInfoModal
                isOpen={showApiKeyModal}
                onClose={() => setShowApiKeyModal(false)}
            />
        </div>
    )
}

export default SettingsPage
