'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../context/AuthContext'
import { storageAPI } from '../../services/api'
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

function OnboardingPage() {
    const router = useRouter()
    const { completeProfile, user } = useAuth()
    const fileInputRef = useRef(null)

    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const [formData, setFormData] = useState({
        targetRole: '',
        experienceLevel: '',
        domain: '',
        resumeFile: null,
        resumeUrl: ''
    })

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        })
        setError('')
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
            if (!formData.targetRole) {
                setError('Please select a target role')
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
        }
        setError('')
    }

    const handleBack = () => {
        setStep(step - 1)
        setError('')
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
                const response = await storageAPI.uploadResume(formData.resumeFile)
                resumeUrl = response.data.url
            }

            const result = await completeProfile({
                targetRole: formData.targetRole,
                experienceLevel: formData.experienceLevel,
                domain: formData.domain,
                resumeUrl: resumeUrl
            })

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
                        <span>Target Role</span>
                    </div>
                    <div className="progress-line"></div>
                    <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
                        <div className="step-number">2</div>
                        <span>Experience</span>
                    </div>
                    <div className="progress-line"></div>
                    <div className={`progress-step ${step >= 3 ? 'active' : ''}`}>
                        <div className="step-number">3</div>
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

                {/* Step 1: Target Role */}
                {step === 1 && (
                    <div className="onboarding-step">
                        <h2>What role are you targeting?</h2>
                        <p>Select the job role you want to work towards</p>

                        <div className="role-grid">
                            {TARGET_ROLES.map((role) => (
                                <button
                                    key={role}
                                    type="button"
                                    className={`role-card ${formData.targetRole === role ? 'selected' : ''}`}
                                    onClick={() => setFormData({ ...formData, targetRole: role })}
                                >
                                    {role}
                                </button>
                            ))}
                        </div>
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

                {/* Step 3: Resume Upload */}
                {step === 3 && (
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
