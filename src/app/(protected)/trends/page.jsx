'use client'

import { useState, useEffect } from 'react'
import { jobMarketAPI, skillGapAPI, supabase } from '../../../services/api'
import { useAuth } from '../../../context/AuthContext'
import './trends.css'

function TrendsPage() {
    const { user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('jobs')
    const [data, setData] = useState({
        roles: [],
        skills: [],
        snapshot: null,
        jobs: [],
        jobCount: 0
    })

    // Skill Gap Analysis State
    const [analysisLoading, setAnalysisLoading] = useState(false)
    const [analysisMessage, setAnalysisMessage] = useState('')
    const [analysisError, setAnalysisError] = useState('')

    useEffect(() => {
        const fetchTrendsData = async () => {
            try {
                const [rolesRes, skillsRes, snapshotRes] = await Promise.all([
                    jobMarketAPI.getTrendingRoles(),
                    jobMarketAPI.getTrendingSkills(),
                    jobMarketAPI.getMarketSnapshot()
                ])

                // Fetch jobs from Supabase
                let jobs = []
                let jobCount = 0
                if (supabase) {
                    // Get job count
                    const { count } = await supabase
                        .from('fetched_jobs')
                        .select('*', { count: 'exact', head: true })
                    jobCount = count || 0

                    // Get all jobs
                    const { data: jobData } = await supabase
                        .from('fetched_jobs')
                        .select('id, title, company_name, location, posted_date, description, work_type, experience_level, job_url, apply_url')
                        .order('fetched_at', { ascending: false })
                        .limit(50)
                    jobs = jobData || []
                }

                setData({
                    roles: rolesRes.data,
                    skills: skillsRes.data,
                    snapshot: snapshotRes.data,
                    jobs,
                    jobCount
                })
            } catch (error) {
                console.error('Failed to fetch trends data:', error)
            }
            setLoading(false)
        }

        fetchTrendsData()
    }, [])

    // Handle Skill Gap Analysis trigger
    const handleStartAnalysis = async () => {
        if (!user?.id) {
            setAnalysisError('Please log in to start skill gap analysis')
            return
        }

        setAnalysisLoading(true)
        setAnalysisMessage('')
        setAnalysisError('')

        try {
            // This calls POST /api/analysis/generate - takes 1-2 minutes
            const result = await skillGapAPI.generateAnalysis()

            if (result.success) {
                setAnalysisMessage(
                    `Analysis complete! Your fit score is ${result.summary?.overall_fit_score || 'N/A'}%. ` +
                    `Check the Reports page to download your PDF report.`
                )
            } else {
                setAnalysisError(result.error || 'Failed to generate analysis')
            }
        } catch (error) {
            setAnalysisError('An error occurred. Please try again.')
        }

        setAnalysisLoading(false)
    }

    if (loading) {
        return (
            <div className="trends-loading">
                <div className="spinner"></div>
                <p>Loading market trends...</p>
            </div>
        )
    }

    const { roles, skills, snapshot, jobs, jobCount } = data

    return (
        <div className="trends-page">
            {/* Header */}
            <div className="page-header">
                <div className="header-content">
                    <h1>Job Market Trends</h1>
                    <p>Real-time insights into the most in-demand roles and skills</p>
                </div>

                {/* Skill Gap Analysis Button */}
                <button
                    className="btn btn-primary btn-analyze"
                    onClick={handleStartAnalysis}
                    disabled={analysisLoading}
                >
                    {analysisLoading ? (
                        <>
                            <div className="spinner" style={{ width: 20, height: 20 }}></div>
                            Analyzing (1-2 min)...
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

            {/* Analysis Status Messages */}
            {analysisMessage && (
                <div className="analysis-alert success animate-fadeIn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <span>{analysisMessage}</span>
                    <button
                        className="alert-dismiss"
                        onClick={() => setAnalysisMessage('')}
                        aria-label="Dismiss"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
            )}

            {analysisError && (
                <div className="analysis-alert error animate-fadeIn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{analysisError}</span>
                    <button
                        className="alert-dismiss"
                        onClick={() => setAnalysisError('')}
                        aria-label="Dismiss"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Market Overview */}
            <div className="market-overview">
                <div className="overview-card">
                    <div className="overview-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                        </svg>
                    </div>
                    <div className="overview-content">
                        <span className="overview-value">{jobCount || snapshot?.totalJobs || 41}+</span>
                        <span className="overview-label">Jobs Fetched</span>
                    </div>
                </div>

                <div className="overview-card">
                    <div className="overview-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                    </div>
                    <div className="overview-content">
                        <span className="overview-value">{snapshot?.totalRoles}+</span>
                        <span className="overview-label">Unique Roles</span>
                    </div>
                </div>

                <div className="overview-card">
                    <div className="overview-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                        </svg>
                    </div>
                    <div className="overview-content">
                        <span className="overview-value">{snapshot?.totalSkills}+</span>
                        <span className="overview-label">Skills Tracked</span>
                    </div>
                </div>

                <div className="overview-card">
                    <div className="overview-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 6v6l4 2" />
                        </svg>
                    </div>
                    <div className="overview-content">
                        <span className="overview-value">Weekly</span>
                        <span className="overview-label">Data Updates</span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="trends-tabs">
                <button
                    className={`tab-btn ${activeTab === 'jobs' ? 'active' : ''}`}
                    onClick={() => setActiveTab('jobs')}
                >
                    Job Listings ({jobCount})
                </button>
                <button
                    className={`tab-btn ${activeTab === 'roles' ? 'active' : ''}`}
                    onClick={() => setActiveTab('roles')}
                >
                    Trending Roles
                </button>
                <button
                    className={`tab-btn ${activeTab === 'skills' ? 'active' : ''}`}
                    onClick={() => setActiveTab('skills')}
                >
                    Trending Skills
                </button>
                <button
                    className={`tab-btn ${activeTab === 'emerging' ? 'active' : ''}`}
                    onClick={() => setActiveTab('emerging')}
                >
                    Emerging & Declining
                </button>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
                {/* Job Listings */}
                {activeTab === 'jobs' && (
                    <div className="jobs-grid animate-fadeIn">
                        {jobs.length > 0 ? (
                            jobs.map((job) => (
                                <div key={job.id} className="job-card">
                                    <div className="job-header">
                                        <h3 className="job-title">{job.title}</h3>
                                        {job.posted_date && (
                                            <span className="job-posted">{job.posted_date}</span>
                                        )}
                                    </div>
                                    <div className="job-company">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                                            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                                        </svg>
                                        <span>{job.company_name}</span>
                                    </div>
                                    <div className="job-location">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                            <circle cx="12" cy="10" r="3" />
                                        </svg>
                                        <span>{job.location}</span>
                                    </div>
                                    {job.description && (
                                        <p className="job-description">
                                            {job.description.substring(0, 200)}...
                                        </p>
                                    )}
                                    <div className="job-tags">
                                        {job.work_type && <span className="job-tag">{job.work_type === 'True' ? 'Remote' : job.work_type}</span>}
                                        {job.experience_level && <span className="job-tag">{job.experience_level}</span>}
                                    </div>
                                    <div className="job-actions">
                                        {job.apply_url && (
                                            <a href={job.apply_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">
                                                Apply Now
                                            </a>
                                        )}
                                        {job.job_url && (
                                            <a href={job.job_url} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                                                View Details
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="empty-state">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="48" height="48">
                                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                                </svg>
                                <h3>No Job Listings Yet</h3>
                                <p>Job listings will appear here as they are fetched by the trend service.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Trending Roles */}
                {activeTab === 'roles' && (
                    <div className="trends-grid animate-fadeIn">
                        {roles.map((role, index) => (
                            <div key={role.id} className="trend-card">
                                <div className="trend-rank">#{index + 1}</div>
                                <div className="trend-info">
                                    <h3>{role.title}</h3>
                                    <div className="trend-stats">
                                        <div className="stat">
                                            <span className="stat-label">Demand</span>
                                            <div className="stat-bar">
                                                <div className="progress">
                                                    <div className="progress-bar" style={{ width: `${role.demand}%` }}></div>
                                                </div>
                                                <span className="stat-value">{role.demand}%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className={`trend-growth ${role.growth.startsWith('+') ? 'positive' : 'negative'}`}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        {role.growth.startsWith('+') ? (
                                            <>
                                                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                                                <polyline points="17 6 23 6 23 12" />
                                            </>
                                        ) : (
                                            <>
                                                <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                                                <polyline points="17 18 23 18 23 12" />
                                            </>
                                        )}
                                    </svg>
                                    <span>{role.growth}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Trending Skills */}
                {activeTab === 'skills' && (
                    <div className="skills-table animate-fadeIn">
                        <div className="table-header">
                            <span>Skill</span>
                            <span>Job Postings</span>
                            <span>Prevalence</span>
                            <span>Trend</span>
                        </div>
                        {skills.map((skill, index) => (
                            <div key={index} className="table-row">
                                <div className="skill-cell">
                                    <span className="skill-rank">#{index + 1}</span>
                                    <span className="skill-name">{skill.skill}</span>
                                </div>
                                <div className="count-cell">
                                    {skill.count.toLocaleString()}
                                </div>
                                <div className="bar-cell">
                                    <div className="progress">
                                        <div className="progress-bar" style={{ width: `${skill.percentage}%` }}></div>
                                    </div>
                                    <span>{skill.percentage}%</span>
                                </div>
                                <div className="trend-cell">
                                    <span className={`trend-badge ${skill.trend}`}>
                                        {skill.trend === 'rising' && '↑'}
                                        {skill.trend === 'stable' && '→'}
                                        {skill.trend === 'declining' && '↓'}
                                        {skill.trend.charAt(0).toUpperCase() + skill.trend.slice(1)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Emerging & Declining */}
                {activeTab === 'emerging' && (
                    <div className="emerging-grid animate-fadeIn">
                        <div className="emerging-card emerging">
                            <div className="emerging-header">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M23 6l-9.5 9.5-5-5L1 18" />
                                    <path d="M17 6h6v6" />
                                </svg>
                                <h3>🚀 Emerging Skills</h3>
                            </div>
                            <p>These skills are rapidly growing in demand. Consider learning them now!</p>
                            <div className="emerging-list">
                                {snapshot?.emergingSkills?.map((skill, index) => (
                                    <div key={index} className="emerging-item">
                                        <span className="hot-badge">HOT</span>
                                        <span className="skill-name">{skill}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="emerging-card declining">
                            <div className="emerging-header">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M23 18l-9.5-9.5-5 5L1 6" />
                                    <path d="M17 18h6v-6" />
                                </svg>
                                <h3>📉 Declining Skills</h3>
                            </div>
                            <p>These skills are seeing reduced demand in the job market.</p>
                            <div className="emerging-list">
                                {snapshot?.decliningSkills?.map((skill, index) => (
                                    <div key={index} className="emerging-item declining">
                                        <span className="cold-badge">LOW</span>
                                        <span className="skill-name">{skill}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Last Updated */}
            <div className="last-updated">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                </svg>
                Last updated: {new Date(snapshot?.lastUpdated || Date.now()).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })}
            </div>
        </div>
    )
}

export default TrendsPage
