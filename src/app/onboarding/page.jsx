'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../context/AuthContext'
import { storageAPI, githubAPI } from '../../services/api'
import './onboarding.css'

const TARGET_ROLES = [
    'Machine Learning Engineer',
    'Data Scientist',
    'Full Stack Developer',
    'Frontend Developer',
    'Backend Developer',
    'DevOps Engineer',
    'Cloud Architect',
    'Data Engineer',
    'AI/ML Researcher',
    'Software Engineer',
    'Mobile Developer',
    'Cybersecurity Engineer'
]

const EXPERIENCE_LEVELS = [
    { value: 'entry', label: 'Entry Level (0-2 years)' },
    { value: 'mid', label: 'Mid Level (2-5 years)' },
    { value: 'senior', label: 'Senior Level (5-8 years)' },
    { value: 'lead', label: 'Lead/Principal (8+ years)' }
]

const DOMAINS = [
    'Web Development',
    'Mobile Development',
    'Machine Learning / AI',
    'Data Engineering',
    'Cloud & DevOps',
    'Cybersecurity',
    'Blockchain',
    'Game Development',
    'Embedded Systems',
    'Other'
]

// Maximum number of roles that can be selected
const MAX_ROLES = 3

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

function OnboardingPage() {
    const router = useRouter()
    const { completeProfile, user, connectGitHub, githubConnection, updateProfile, checkGithubConnection } = useAuth()
    const fileInputRef = useRef(null)

    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [githubLoading, setGithubLoading] = useState(false)
    const [githubError, setGithubError] = useState('')
    const [githubSkipped, setGithubSkipped] = useState(false)
    const [isRestored, setIsRestored] = useState(false)

    const [formData, setFormData] = useState({
        targetRoles: [], // Changed from targetRole (string) to targetRoles (array)
        experienceLevel: '',
        domain: '',
        resumeFile: null,
        resumeUrl: ''
    })

    // Restore step and form data from localStorage on mount
    useEffect(() => {
        // Only run on client side
        if (typeof window === 'undefined') return

        // Check if returning from GitHub OAuth
        const savedStep = localStorage.getItem('onboarding_step')
        const savedFormData = localStorage.getItem('onboarding_form_data')
        const githubPending = localStorage.getItem('github_connection_pending')

        console.log('[Onboarding] Restoring state:', { savedStep, githubPending, hasFormData: !!savedFormData })

        // Restore step
        if (savedStep) {
            const parsedStep = parseInt(savedStep, 10)
            if (parsedStep >= 1 && parsedStep <= 4) {
                console.log('[Onboarding] Restoring to step:', parsedStep)
                setStep(parsedStep)
            }
        }

        // Restore form data (excluding file which can't be serialized)
        if (savedFormData) {
            try {
                const parsed = JSON.parse(savedFormData)
                setFormData(prev => ({
                    ...prev,
                    targetRoles: parsed.targetRoles || [],
                    experienceLevel: parsed.experienceLevel || '',
                    domain: parsed.domain || ''
                    // Note: resumeFile cannot be restored from localStorage
                }))
                console.log('[Onboarding] Restored form data:', parsed)
            } catch (e) {
                console.warn('[Onboarding] Failed to parse saved form data:', e)
            }
        }

        // If returning from GitHub OAuth, also refresh the connection status
        if (githubPending && user?.id) {
            console.log('[Onboarding] Checking GitHub connection status after OAuth return')
            checkGithubConnection(user.id)
            localStorage.removeItem('github_connection_pending')
        }

        setIsRestored(true)
    }, [user?.id, checkGithubConnection])

    // Persist step to localStorage when it changes (except on initial load)
    useEffect(() => {
        if (isRestored && typeof window !== 'undefined') {
            localStorage.setItem('onboarding_step', step.toString())
            console.log('[Onboarding] Saved step to localStorage:', step)
        }
    }, [step, isRestored])

    // Persist form data to localStorage when it changes (except on initial load)
    useEffect(() => {
        if (isRestored && typeof window !== 'undefined') {
            // Only save serializable data (not the file)
            const dataToSave = {
                targetRoles: formData.targetRoles,
                experienceLevel: formData.experienceLevel,
                domain: formData.domain
            }
            localStorage.setItem('onboarding_form_data', JSON.stringify(dataToSave))
        }
    }, [formData.targetRoles, formData.experienceLevel, formData.domain, isRestored])

    // Redirect to dashboard if onboarding already completed
    useEffect(() => {
        if (user?.onboardingCompleted) {
            router.push('/dashboard')
        }
    }, [user, router])

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        })
        setError('')
    }

    /**
     * Handle role selection - allows selecting up to MAX_ROLES (3) roles
     */
    const handleRoleToggle = (role) => {
        setError('')
        const currentRoles = formData.targetRoles
        const isSelected = currentRoles.includes(role)

        if (isSelected) {
            // Deselect the role
            setFormData({
                ...formData,
                targetRoles: currentRoles.filter(r => r !== role)
            })
        } else {
            // Check if max limit reached
            if (currentRoles.length >= MAX_ROLES) {
                setError(`You can select up to ${MAX_ROLES} roles. Deselect one to choose another.`)
                return
            }
            // Select the role
            setFormData({
                ...formData,
                targetRoles: [...currentRoles, role]
            })
        }
    }

    /**
     * Check if a role can be selected (not at max limit or already selected)
     */
    const isRoleDisabled = (role) => {
        const currentRoles = formData.targetRoles
        const isSelected = currentRoles.includes(role)
        return !isSelected && currentRoles.length >= MAX_ROLES
    }

    const handleFileChange = async (e) => {
        const file = e.target.files[0]
        if (!file) return

        if (file.type !== 'application/pdf') {
            setError('Please upload a PDF file only')
            return
        }

        if (file.size > 10 * 1024 * 1024) {
            setError('File size must be less than 10MB')
            return
        }

        setFormData({
            ...formData,
            resumeFile: file
        })
        setError('')
    }

    const handleNext = () => {
        if (step === 1) {
            // Validate: at least 1 role must be selected
            if (formData.targetRoles.length === 0) {
                setError('Please select at least one target role')
                return
            }
            // Validate: no more than MAX_ROLES
            if (formData.targetRoles.length > MAX_ROLES) {
                setError(`You can select up to ${MAX_ROLES} roles`)
                return
            }
            setStep(2)
        } else if (step === 2) {
            if (!formData.experienceLevel) {
                setError('Please select your experience level')
                return
            }
            if (!formData.domain) {
                setError('Please select your domain')
                return
            }
            setStep(3)
        } else if (step === 3) {
            // GitHub step - can be skipped
            setStep(4)
        }
        setError('')
    }

    const handleBack = () => {
        setStep(step - 1)
        setError('')
        setGithubError('')
    }

    const handleConnectGitHub = async () => {
        setGithubLoading(true)
        setGithubError('')

        try {
            // Save that we want to go to step 4 (Resume) after GitHub OAuth completes
            // This is critical because the OAuth redirect will cause the page to reload
            localStorage.setItem('onboarding_step', '4')
            localStorage.setItem('github_connection_pending', 'true')

            // Also save current form data before redirect
            const dataToSave = {
                targetRoles: formData.targetRoles,
                experienceLevel: formData.experienceLevel,
                domain: formData.domain
            }
            localStorage.setItem('onboarding_form_data', JSON.stringify(dataToSave))
            console.log('[Onboarding] Saved state before GitHub OAuth:', { step: 4, formData: dataToSave })

            // The connectGitHub function will redirect to GitHub OAuth
            const result = connectGitHub()
            if (!result.success) {
                setGithubError(result.error || 'Failed to connect GitHub')
                setGithubLoading(false)
                // Revert step to 3 since GitHub connection failed
                localStorage.setItem('onboarding_step', '3')
                localStorage.removeItem('github_connection_pending')
            }
            // If successful, user will be redirected to GitHub OAuth
        } catch (err) {
            setGithubError('Failed to connect to GitHub. Please try again.')
            setGithubLoading(false)
            localStorage.setItem('onboarding_step', '3')
            localStorage.removeItem('github_connection_pending')
        }
    }

    const handleSkipGitHub = async () => {
        setGithubSkipped(true)
        // Mark that user skipped GitHub during onboarding (can retry later)
        await updateProfile({ githubConnectionFailed: false, githubSkippedOnboarding: true })
        setStep(4)
    }

    const handleSubmit = async () => {
        if (!formData.resumeFile && !formData.resumeUrl) {
            setError('Please upload your resume')
            return
        }

        setLoading(true)
        setError('')

        try {
            let resumeUrl = formData.resumeUrl
            if (formData.resumeFile && !resumeUrl) {
                // Upload resume with user ID for proper organization and profile update
                const response = await storageAPI.uploadResume(formData.resumeFile, user?.id)
                resumeUrl = response.data.url

                // Trigger resume skill extraction if user ID is available
                if (user?.id) {
                    try {
                        await githubAPI.syncResume(user.id)
                    } catch (syncError) {
                        console.warn('Resume skill extraction failed:', syncError)
                        // Don't block onboarding for this
                    }
                }
            }

            // Build profile data with backward compatibility
            // - targetRoles: new array format (up to 3 roles)
            // - targetRole: primary role (first selected) for backward compatibility
            const profileData = {
                targetRoles: formData.targetRoles,
                targetRole: formData.targetRoles[0] || '', // Primary role for backward compatibility
                experienceLevel: formData.experienceLevel,
                domain: formData.domain,
                resumeUrl: resumeUrl,
                githubConnected: githubConnection.connected,
                githubSkippedOnboarding: githubSkipped
            }

            const result = await completeProfile(profileData)

            if (result.success) {
                router.push('/dashboard')
            } else {
                setError(result.error || 'Failed to complete profile')
            }
        } catch (err) {
            setError('Something went wrong. Please try again.')
        }

        setLoading(false)
    }

    // Total steps including GitHub
    const totalSteps = 4

    return (
        <div className="onboarding-page">
            {/* Background */}
            <div className="onboarding-background">
                <div className="onboarding-orb onboarding-orb-1"></div>
                <div className="onboarding-orb onboarding-orb-2"></div>
            </div>

            <div className="onboarding-container animate-slideUp">
                {/* Header */}
                <div className="onboarding-header">
                    <div className="onboarding-logo">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <h1>Complete Your Profile</h1>
                    <p>Help us personalize your skill gap analysis</p>
                </div>

                {/* Progress Steps */}
                <div className="onboarding-progress">
                    <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>
                        <div className="step-number">1</div>
                        <span>Target Roles</span>
                    </div>
                    <div className="progress-line"></div>
                    <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
                        <div className="step-number">2</div>
                        <span>Experience</span>
                    </div>
                    <div className="progress-line"></div>
                    <div className={`progress-step ${step >= 3 ? 'active' : ''}`}>
                        <div className="step-number">3</div>
                        <span>GitHub</span>
                    </div>
                    <div className="progress-line"></div>
                    <div className={`progress-step ${step >= 4 ? 'active' : ''}`}>
                        <div className="step-number">4</div>
                        <span>Resume</span>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="onboarding-error">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        {error}
                    </div>
                )}

                {/* Step 1: Target Roles (Multiple Selection) */}
                {step === 1 && (
                    <div className="onboarding-step">
                        <h2>What roles are you targeting?</h2>
                        <p>Select up to {MAX_ROLES} job roles you want to work towards</p>

                        {/* Selection Counter */}
                        <div className="role-selection-counter">
                            <span className={`counter ${formData.targetRoles.length === MAX_ROLES ? 'max-reached' : ''}`}>
                                {formData.targetRoles.length} / {MAX_ROLES} selected
                            </span>
                            {formData.targetRoles.length > 0 && (
                                <button
                                    type="button"
                                    className="clear-selection-btn"
                                    onClick={() => setFormData({ ...formData, targetRoles: [] })}
                                >
                                    Clear all
                                </button>
                            )}
                        </div>

                        <div className="role-grid">
                            {TARGET_ROLES.map((role) => {
                                const isSelected = formData.targetRoles.includes(role)
                                const isDisabled = isRoleDisabled(role)

                                return (
                                    <button
                                        key={role}
                                        type="button"
                                        className={`role-card ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                                        onClick={() => handleRoleToggle(role)}
                                        disabled={isDisabled}
                                        aria-pressed={isSelected}
                                        aria-disabled={isDisabled}
                                    >
                                        <span className="role-name">{role}</span>
                                        {isSelected && (
                                            <span className="role-check">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                            </span>
                                        )}
                                        {isSelected && (
                                            <span className="role-order">
                                                {formData.targetRoles.indexOf(role) + 1}
                                            </span>
                                        )}
                                    </button>
                                )
                            })}
                        </div>

                        {/* Selected Roles Summary */}
                        {formData.targetRoles.length > 0 && (
                            <div className="selected-roles-summary">
                                <span className="summary-label">Selected:</span>
                                <div className="selected-roles-tags">
                                    {formData.targetRoles.map((role, index) => (
                                        <span key={role} className="role-tag">
                                            <span className="tag-order">{index + 1}</span>
                                            {role}
                                            <button
                                                type="button"
                                                className="tag-remove"
                                                onClick={() => handleRoleToggle(role)}
                                                aria-label={`Remove ${role}`}
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <line x1="18" y1="6" x2="6" y2="18" />
                                                    <line x1="6" y1="6" x2="18" y2="18" />
                                                </svg>
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 2: Experience & Domain */}
                {step === 2 && (
                    <div className="onboarding-step">
                        <h2>Tell us about your experience</h2>
                        <p>This helps us calibrate your skill gap analysis</p>

                        <div className="form-group">
                            <label className="form-label">Experience Level</label>
                            <select
                                name="experienceLevel"
                                className="form-select"
                                value={formData.experienceLevel}
                                onChange={handleChange}
                            >
                                <option value="">Select your experience level</option>
                                {EXPERIENCE_LEVELS.map((level) => (
                                    <option key={level.value} value={level.value}>
                                        {level.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Primary Domain / Interest</label>
                            <select
                                name="domain"
                                className="form-select"
                                value={formData.domain}
                                onChange={handleChange}
                            >
                                <option value="">Select your domain</option>
                                {DOMAINS.map((domain) => (
                                    <option key={domain} value={domain}>
                                        {domain}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {/* Step 3: GitHub Connection */}
                {step === 3 && (
                    <div className="onboarding-step">
                        <h2>Connect Your GitHub</h2>
                        <p>We'll analyze your repositories to extract your technical skills automatically</p>

                        <div className="github-connect-section">
                            {githubConnection.connected ? (
                                <div className="github-connected-card">
                                    <div className="github-connected-icon">
                                        <GitHubIcon size={48} connected={true} />
                                    </div>
                                    <div className="github-connected-info">
                                        <h3>GitHub Connected!</h3>
                                        <p>Connected as <strong>@{githubConnection.data?.github_username}</strong></p>
                                    </div>
                                    <div className="github-connected-badge">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        Connected
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="github-connect-card">
                                        <div className="github-icon-wrapper">
                                            <GitHubIcon size={64} />
                                        </div>
                                        <h3>Enhance Your Profile</h3>
                                        <p>Connect GitHub to automatically extract skills from your repositories</p>

                                        <ul className="github-benefits">
                                            <li>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                                Automatic skill detection from READMEs
                                            </li>
                                            <li>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                                AI-powered technology analysis
                                            </li>
                                            <li>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                                Weekly skill updates from new commits
                                            </li>
                                        </ul>

                                        {githubError && (
                                            <div className="github-error">
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
                                            className="btn btn-github"
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

                                    <button
                                        type="button"
                                        className="btn btn-text skip-github-btn"
                                        onClick={handleSkipGitHub}
                                    >
                                        Skip for now, I'll connect later
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 4: Resume Upload */}
                {step === 4 && (
                    <div className="onboarding-step">
                        <h2>Upload your resume</h2>
                        <p>We'll extract your skills and compare them with market requirements</p>

                        <div
                            className={`resume-upload ${formData.resumeFile ? 'has-file' : ''}`}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf"
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                            />

                            {formData.resumeFile ? (
                                <div className="resume-preview">
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <path d="M14 2v6h6" />
                                        <path d="M9 15l2 2 4-4" />
                                    </svg>
                                    <div className="resume-info">
                                        <span className="resume-name">{formData.resumeFile.name}</span>
                                        <span className="resume-size">
                                            {(formData.resumeFile.size / 1024 / 1024).toFixed(2)} MB
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn btn-ghost btn-sm"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setFormData({ ...formData, resumeFile: null, resumeUrl: '' })
                                        }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <svg className="upload-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <polyline points="17 8 12 3 7 8" />
                                        <line x1="12" y1="3" x2="12" y2="15" />
                                    </svg>
                                    <span className="upload-text">Click to upload or drag and drop</span>
                                    <span className="upload-hint">PDF only, max 10MB</span>
                                </>
                            )}
                        </div>

                        <div className="resume-note">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="16" x2="12" y2="12" />
                                <line x1="12" y1="8" x2="12.01" y2="8" />
                            </svg>
                            <span>Your resume is securely stored and only used for skill extraction</span>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="onboarding-actions">
                    {step > 1 && (
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={handleBack}
                            disabled={loading}
                        >
                            Back
                        </button>
                    )}

                    {step < 3 ? (
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleNext}
                        >
                            Continue
                        </button>
                    ) : step === 3 ? (
                        githubConnection.connected ? (
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleNext}
                            >
                                Continue
                            </button>
                        ) : null // GitHub step shows its own buttons
                    ) : (
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <div className="spinner" style={{ width: 20, height: 20 }}></div>
                                    Saving...
                                </>
                            ) : (
                                'Complete Setup'
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

export default OnboardingPage
