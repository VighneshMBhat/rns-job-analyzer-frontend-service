'use client'

import { useState, useRef, useEffect } from 'react'
import { mlAPI, jobMarketAPI, storageAPI } from '../../../services/api'
import './skill-gap.css'

function SkillGapPage() {
    const fileInputRef = useRef(null)
    const [loading, setLoading] = useState(false)
    const [analyzing, setAnalyzing] = useState(false)
    const [selectedRole, setSelectedRole] = useState('')
    const [resumeFile, setResumeFile] = useState(null)
    const [analysis, setAnalysis] = useState(null)
    const [roles, setRoles] = useState([])

    useEffect(() => {
        const fetchRoles = async () => {
            try {
                const response = await jobMarketAPI.getTrendingRoles()
                setRoles(response.data)
            } catch (error) {
                console.error('Failed to fetch roles:', error)
            }
        }
        fetchRoles()
    }, [])

    const handleFileChange = (e) => {
        const file = e.target.files[0]
        if (file && file.type === 'application/pdf') {
            setResumeFile(file)
        }
    }

    const handleAnalyze = async () => {
        if (!selectedRole) return

        setAnalyzing(true)
        try {
            // TODO: Upload resume if provided
            if (resumeFile) {
                await storageAPI.uploadResume(resumeFile)
            }

            // TODO: Replace with real ML API call
            const response = await mlAPI.analyzeSkillGap(selectedRole)
            setAnalysis(response.data)
        } catch (error) {
            console.error('Analysis failed:', error)
        }
        setAnalyzing(false)
    }

    return (
        <div className="skillgap-page">
            {/* Header */}
            <div className="page-header">
                <h1>Skill Gap Analyzer</h1>
                <p>Compare your skills against market requirements and get personalized recommendations</p>
            </div>

            {/* Analysis Form */}
            <div className="analysis-form">
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Target Role</label>
                        <select
                            className="form-select"
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value)}
                        >
                            <option value="">Select a target role</option>
                            {roles.map((role) => (
                                <option key={role.id} value={role.id}>
                                    {role.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Resume (Optional)</label>
                        <div
                            className={`file-input ${resumeFile ? 'has-file' : ''}`}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf"
                                onChange={handleFileChange}
                            />
                            {resumeFile ? (
                                <span className="file-name">{resumeFile.name}</span>
                            ) : (
                                <span className="file-placeholder">Click to upload PDF</span>
                            )}
                        </div>
                    </div>
                </div>

                <button
                    className="btn btn-primary btn-lg"
                    onClick={handleAnalyze}
                    disabled={!selectedRole || analyzing}
                >
                    {analyzing ? (
                        <>
                            <div className="spinner" style={{ width: 20, height: 20 }}></div>
                            Analyzing Skills...
                        </>
                    ) : (
                        <>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                            </svg>
                            Analyze My Skills
                        </>
                    )}
                </button>
            </div>

            {/* Analysis Results */}
            {analysis && (
                <div className="analysis-results animate-slideUp">
                    {/* Score Cards */}
                    <div className="score-cards">
                        <div className="score-card">
                            <div className="score-ring" style={{ '--progress': `${100 - analysis.gapPercentage}%` }}>
                                <svg viewBox="0 0 100 100">
                                    <defs>
                                        <linearGradient id="gradient-primary" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#667eea" />
                                            <stop offset="100%" stopColor="#764ba2" />
                                        </linearGradient>
                                    </defs>
                                    <circle cx="50" cy="50" r="45" className="score-ring-bg" />
                                    <circle cx="50" cy="50" r="45" className="score-ring-progress" />
                                </svg>
                                <div className="score-value">
                                    <span className="score-number">{analysis.gapPercentage}%</span>
                                    <span className="score-label">Gap</span>
                                </div>
                            </div>
                            <h3>Skill Gap</h3>
                            <p>Skills you need to learn</p>
                        </div>

                        <div className="score-card">
                            <div className="score-ring success" style={{ '--progress': `${analysis.roleFitScore}%` }}>
                                <svg viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="45" className="score-ring-bg" />
                                    <circle cx="50" cy="50" r="45" className="score-ring-progress" />
                                </svg>
                                <div className="score-value">
                                    <span className="score-number">{analysis.roleFitScore}%</span>
                                    <span className="score-label">Fit</span>
                                </div>
                            </div>
                            <h3>Role Fit Score</h3>
                            <p>How well you match the role</p>
                        </div>

                        <div className="score-card">
                            <div className="score-ring info" style={{ '--progress': `${analysis.marketDemandScore}%` }}>
                                <svg viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="45" className="score-ring-bg" />
                                    <circle cx="50" cy="50" r="45" className="score-ring-progress" />
                                </svg>
                                <div className="score-value">
                                    <span className="score-number">{analysis.marketDemandScore}%</span>
                                    <span className="score-label">Demand</span>
                                </div>
                            </div>
                            <h3>Market Demand</h3>
                            <p>How in-demand are missing skills</p>
                        </div>
                    </div>

                    {/* Skills Breakdown */}
                    <div className="skills-breakdown">
                        {/* Missing Skills */}
                        <div className="breakdown-card">
                            <div className="breakdown-header">
                                <h3>Missing Skills</h3>
                                <span className="badge badge-error">{analysis.missingSkills.length} Skills</span>
                            </div>
                            <div className="breakdown-list">
                                {analysis.missingSkills.map((skill, index) => (
                                    <div key={index} className="breakdown-item">
                                        <div className="item-info">
                                            <span className="item-rank">#{skill.priority}</span>
                                            <span className="item-name">{skill.skill}</span>
                                        </div>
                                        <div className="item-bar">
                                            <div className="progress">
                                                <div
                                                    className="progress-bar error"
                                                    style={{ width: `${skill.importance * 100}%` }}
                                                ></div>
                                            </div>
                                            <span className="item-value">{Math.round(skill.importance * 100)}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Matched Skills */}
                        <div className="breakdown-card">
                            <div className="breakdown-header">
                                <h3>Matched Skills</h3>
                                <span className="badge badge-success">{analysis.matchedSkills.length} Skills</span>
                            </div>
                            <div className="breakdown-list">
                                {analysis.matchedSkills.map((skill, index) => (
                                    <div key={index} className="breakdown-item">
                                        <div className="item-info">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--success-500)' }}>
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                            <span className="item-name">{skill.skill}</span>
                                        </div>
                                        <div className="item-bar">
                                            <div className="proficiency-dots">
                                                {[1, 2, 3, 4, 5].map((level) => (
                                                    <span
                                                        key={level}
                                                        className={`dot ${level <= skill.proficiency ? 'filled' : ''}`}
                                                    ></span>
                                                ))}
                                            </div>
                                            <span className="item-value">Level {skill.proficiency}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Partial Skills */}
                        <div className="breakdown-card">
                            <div className="breakdown-header">
                                <h3>Skills to Improve</h3>
                                <span className="badge badge-warning">{analysis.partialSkills.length} Skills</span>
                            </div>
                            <div className="breakdown-list">
                                {analysis.partialSkills.map((skill, index) => (
                                    <div key={index} className="breakdown-item">
                                        <div className="item-info">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--warning-500)' }}>
                                                <path d="M23 6l-9.5 9.5-5-5L1 18" />
                                            </svg>
                                            <span className="item-name">{skill.skill}</span>
                                        </div>
                                        <div className="item-bar">
                                            <span className="level-indicator">
                                                Level {skill.userLevel} → {skill.requiredLevel}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Recommendations */}
                    <div className="recommendations-section">
                        <h2>AI Recommendations</h2>
                        <div className="recommendations-grid">
                            <div className="recommendation-card">
                                <h4>📚 Learning Path</h4>
                                <ul className="recommendation-list">
                                    {analysis.recommendations.learningPath.map((item, index) => (
                                        <li key={index}>{item}</li>
                                    ))}
                                </ul>
                            </div>

                            <div className="recommendation-card">
                                <h4>🔗 Recommended Resources</h4>
                                <ul className="resource-list">
                                    {analysis.recommendations.resources.map((resource, index) => (
                                        <li key={index}>
                                            <a href={resource.url} target="_blank" rel="noopener noreferrer">
                                                {resource.title}
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                                    <polyline points="15 3 21 3 21 9" />
                                                    <line x1="10" y1="14" x2="21" y2="3" />
                                                </svg>
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Trend Indicator */}
                    <div className={`trend-indicator trend-${analysis.trendDirection}`}>
                        <div className="trend-icon">
                            {analysis.trendDirection === 'rising' && (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M23 6l-9.5 9.5-5-5L1 18" />
                                    <path d="M17 6h6v6" />
                                </svg>
                            )}
                            {analysis.trendDirection === 'stable' && (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="5" y1="12" x2="19" y2="12" />
                                </svg>
                            )}
                            {analysis.trendDirection === 'declining' && (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M23 18l-9.5-9.5-5 5L1 6" />
                                    <path d="M17 18h6v-6" />
                                </svg>
                            )}
                        </div>
                        <div className="trend-content">
                            <h4>Market Trend: {analysis.trendDirection.charAt(0).toUpperCase() + analysis.trendDirection.slice(1)}</h4>
                            <p>The skills you need are currently {analysis.trendDirection} in demand.
                                {analysis.trendDirection === 'rising' && ' This is a great time to learn them!'}
                                {analysis.trendDirection === 'stable' && ' These remain consistently valuable skills.'}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default SkillGapPage
