'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../../../context/AuthContext'
import { mlAPI, jobMarketAPI, githubAPI, supabase } from '../../../services/api'
import './dashboard.css'


function DashboardPageContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { user, checkGithubConnection } = useAuth()
    const [loading, setLoading] = useState(true)
    const [notification, setNotification] = useState({ show: false, type: '', message: '' })
    const [data, setData] = useState({
        latestAnalysis: null,
        trendingRoles: [],
        marketSnapshot: null,
        recentJobs: [],
        jobCount: 0,
        userSkills: [],
        userSkillsCount: 0,
        reportsCount: 0
    })

    // Handle GitHub OAuth callback and onboarding redirect
    useEffect(() => {
        const feature = searchParams?.get('feature')
        const errorParam = searchParams?.get('error')
        const detail = searchParams?.get('detail')

        // Check if user needs to complete onboarding
        if (!user?.onboardingCompleted) {
            // If coming from GitHub OAuth during onboarding, go back to onboarding step 4
            if (feature === 'github_connected') {
                localStorage.setItem('onboarding_step', '4')
                localStorage.removeItem('github_connection_pending')
            }
            router.push('/onboarding')
            return
        }

        // Handle GitHub connected success
        if (feature === 'github_connected' && user?.id) {
            setNotification({
                show: true,
                type: 'success',
                message: 'GitHub connected successfully! Your repositories will be synced shortly.'
            })

            // Refresh GitHub connection status
            checkGithubConnection(user.id)

            // Optionally trigger sync
            githubAPI.triggerSync(user.id).catch(err => {
                console.warn('Auto-sync failed:', err)
            })

            // Clean URL
            router.replace('/dashboard', { scroll: false })
        }

        // Handle GitHub connection error
        if (errorParam === 'github_connection_failed') {
            setNotification({
                show: true,
                type: 'error',
                message: `GitHub connection failed: ${detail || 'Unknown error. Please try again.'}`
            })
            router.replace('/dashboard', { scroll: false })
        }

        // Auto-hide notification after 5 seconds
        if (notification.show) {
            const timer = setTimeout(() => {
                setNotification({ show: false, type: '', message: '' })
            }, 5000)
            return () => clearTimeout(timer)
        }
    }, [searchParams, user, router, checkGithubConnection, notification.show])

    // Fetch dashboard data
    useEffect(() => {
        const fetchDashboardData = async () => {
            // Only fetch if user has completed onboarding
            if (!user?.onboardingCompleted) return

            try {
                // Fetch from existing APIs (with fallbacks)
                let analysisData = null
                let rolesData = []
                let snapshotData = null

                try {
                    const [analysisRes, rolesRes, snapshotRes] = await Promise.all([
                        mlAPI.getLatestAnalysis(),
                        jobMarketAPI.getTrendingRoles(),
                        jobMarketAPI.getMarketSnapshot()
                    ])
                    analysisData = analysisRes.data
                    rolesData = rolesRes.data?.slice(0, 5) || []
                    snapshotData = snapshotRes.data
                } catch (apiError) {
                    console.warn('API fetch failed, using Supabase data:', apiError)
                }

                // Fetch dynamic data from Supabase
                let recentJobs = []
                let jobCount = 0
                let userSkills = []
                let reportsCount = 0
                let skillGapAnalysis = null
                let userSkillsCount = 0

                if (supabase) {
                    // Get job count
                    const { count: totalJobs } = await supabase
                        .from('fetched_jobs')
                        .select('*', { count: 'exact', head: true })
                    jobCount = totalJobs || 0

                    // Get recent jobs
                    const { data: jobs } = await supabase
                        .from('fetched_jobs')
                        .select('id, title, company_name, location, posted_date')
                        .order('fetched_at', { ascending: false })
                        .limit(5)
                    recentJobs = jobs || []

                    // Get user-specific data
                    if (user?.id) {
                        // Get latest skill gap analysis for user
                        const { data: analysisFromDb } = await supabase
                            .from('skill_gap_analyses')
                            .select('gap_percentage, role_fit_score, matched_skills, missing_skills, target_job_title, analyzed_at')
                            .eq('user_id', user.id)
                            .order('analyzed_at', { ascending: false })
                            .limit(1)
                            .single()

                        if (analysisFromDb) {
                            skillGapAnalysis = analysisFromDb
                        }

                        // Get user skills count
                        const { count: skillsCount } = await supabase
                            .from('user_skills')
                            .select('*', { count: 'exact', head: true })
                            .eq('user_id', user.id)
                        userSkillsCount = skillsCount || 0

                        // Get user skills for display
                        const { data: skills } = await supabase
                            .from('user_skills')
                            .select('skill_name, skill_source, proficiency_level')
                            .eq('user_id', user.id)
                            .limit(10)
                        userSkills = skills || []

                        // Get reports count
                        const { count: reports } = await supabase
                            .from('reports')
                            .select('*', { count: 'exact', head: true })
                            .eq('user_id', user.id)
                        reportsCount = reports || 0
                    }
                }

                setData({
                    latestAnalysis: skillGapAnalysis || analysisData,
                    trendingRoles: rolesData,
                    marketSnapshot: snapshotData,
                    recentJobs,
                    jobCount,
                    userSkills,
                    userSkillsCount,
                    reportsCount
                })
            } catch (error) {
                console.error('Failed to fetch dashboard data:', error)
            }
            setLoading(false)
        }

        fetchDashboardData()
    }, [user?.onboardingCompleted, user?.id])


    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="spinner"></div>
                <p>Loading dashboard...</p>
            </div>
        )
    }

    const { latestAnalysis, trendingRoles, marketSnapshot, recentJobs, jobCount, userSkills, userSkillsCount, reportsCount } = data

    // Check if user has run skill gap analysis
    const hasAnalysis = latestAnalysis && (latestAnalysis.gap_percentage !== undefined || latestAnalysis.gapPercentage !== undefined)

    return (
        <div className="dashboard-page">
            {/* Notification Banner */}
            {notification.show && (
                <div className={`dashboard-notification notification-${notification.type}`}>
                    <div className="notification-content">
                        {notification.type === 'success' && (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        )}
                        {notification.type === 'error' && (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="15" y1="9" x2="9" y2="15" />
                                <line x1="9" y1="9" x2="15" y2="15" />
                            </svg>
                        )}
                        <span>{notification.message}</span>
                    </div>
                    <button
                        className="notification-close"
                        onClick={() => setNotification({ show: false, type: '', message: '' })}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
            )}

            {/* Header */}
            <div className="dashboard-header">
                <div>
                    <h1>Welcome back, {user?.fullName?.split(' ')[0] || 'User'}! 👋</h1>
                    <p>Here's your career intelligence overview</p>
                </div>
                <Link href="/skill-gap" className="btn btn-primary">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                    Analyze Skills
                </Link>
            </div>

            {/* Stats Cards */}
            <div className="dashboard-stats">
                <div className="stat-card stat-card-primary">
                    <div className="stat-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 6v6l4 2" />
                        </svg>
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Skill Gap</span>
                        {hasAnalysis ? (
                            <>
                                <span className="stat-value">{Math.round(latestAnalysis.gap_percentage || latestAnalysis.gapPercentage || 0)}%</span>
                                <span className="stat-change">Based on your analysis</span>
                            </>
                        ) : (
                            <>
                                <span className="stat-value stat-value-muted">--</span>
                                <span className="stat-change">Run analysis to see</span>
                            </>
                        )}
                    </div>
                </div>

                <div className="stat-card stat-card-secondary">
                    <div className="stat-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Role Fit Score</span>
                        {hasAnalysis ? (
                            <>
                                <span className="stat-value">{Math.round(latestAnalysis.role_fit_score || latestAnalysis.roleFitScore || 0)}%</span>
                                <span className="stat-change positive">Your match score</span>
                            </>
                        ) : (
                            <>
                                <span className="stat-value stat-value-muted">--</span>
                                <span className="stat-change">Run analysis to see</span>
                            </>
                        )}
                    </div>
                    {hasAnalysis && (
                        <div className="stat-progress">
                            <div className="progress">
                                <div className="progress-bar" style={{ width: `${latestAnalysis.role_fit_score || latestAnalysis.roleFitScore || 0}%` }}></div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="stat-card stat-card-accent">
                    <div className="stat-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                        </svg>
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Your Skills</span>
                        <span className="stat-value">{userSkillsCount || 0}</span>
                        <span className="stat-change">{userSkillsCount > 0 ? 'From your profile' : 'Upload resume to extract'}</span>
                    </div>
                </div>

                <div className="stat-card stat-card-info">
                    <div className="stat-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                        </svg>
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Jobs Analyzed</span>
                        <span className="stat-value">{jobCount}+</span>
                        <span className="stat-change">Updated daily</span>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="dashboard-grid">
                {/* Missing Skills */}
                <div className="dashboard-card">
                    <div className="card-header">
                        <h2>Top Missing Skills</h2>
                        <Link href="/skill-gap" className="card-link">View all →</Link>
                    </div>
                    <div className="skills-list">
                        {hasAnalysis && latestAnalysis.missing_skills && latestAnalysis.missing_skills.length > 0 ? (
                            latestAnalysis.missing_skills.slice(0, 4).map((item, index) => (
                                <div key={index} className="skill-item">
                                    <div className="skill-info">
                                        <span className="skill-name">{typeof item === 'string' ? item : item.name || item.skill}</span>
                                        <span className={`skill-priority priority-${item.priority?.toLowerCase() || (index < 2 ? 'high' : 'medium')}`}>
                                            {item.priority || (index < 2 ? 'High' : 'Medium')}
                                        </span>
                                    </div>
                                    <div className="skill-bar">
                                        <div className="progress">
                                            <div
                                                className="progress-bar"
                                                style={{ width: `${item.importance || item.score || (85 - index * 10)}%`, background: 'var(--gradient-accent)' }}
                                            ></div>
                                        </div>
                                        <span className="skill-percentage">{item.importance || item.score || (85 - index * 10)}%</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="empty-skills-state">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="40" height="40">
                                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                                </svg>
                                <p>Run a skill gap analysis to see which skills you need to learn</p>
                                <Link href="/trends" className="btn btn-primary btn-sm">
                                    Analyze My Skills
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Jobs */}
                <div className="dashboard-card">
                    <div className="card-header">
                        <h2>Recent Job Listings</h2>
                        <Link href="/trends" className="card-link">View all →</Link>
                    </div>
                    <div className="roles-list">
                        {recentJobs.length > 0 ? (
                            recentJobs.map((job, index) => (
                                <div key={job.id} className="role-item">
                                    <span className="role-rank">#{index + 1}</span>
                                    <div className="role-info">
                                        <span className="role-title">{job.title}</span>
                                        <span className="role-demand">{job.company_name} • {job.location}</span>
                                    </div>
                                    <span className="role-growth positive">
                                        {job.posted_date || 'New'}
                                    </span>
                                </div>
                            ))
                        ) : trendingRoles.length > 0 ? (
                            trendingRoles.map((role, index) => (
                                <div key={role.id} className="role-item">
                                    <span className="role-rank">#{index + 1}</span>
                                    <div className="role-info">
                                        <span className="role-title">{role.title}</span>
                                        <span className="role-demand">Demand: {role.demand}%</span>
                                    </div>
                                    <span className={`role-growth ${role.growth?.startsWith('+') ? 'positive' : 'negative'}`}>
                                        {role.growth}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div className="empty-state">
                                <p>No job listings yet. Check back soon!</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Matched Skills */}
                <div className="dashboard-card">
                    <div className="card-header">
                        <h2>Your Matched Skills</h2>
                        <span className="badge badge-success">5 Skills</span>
                    </div>
                    <div className="matched-skills">
                        {[
                            { skill: 'Python', level: 4 },
                            { skill: 'JavaScript', level: 4 },
                            { skill: 'React', level: 4 },
                            { skill: 'Node.js', level: 3 },
                            { skill: 'Git', level: 4 }
                        ].map((item, index) => (
                            <div key={index} className="matched-skill">
                                <span className="matched-skill-name">{item.skill}</span>
                                <div className="matched-skill-level">
                                    {[1, 2, 3, 4, 5].map((level) => (
                                        <span
                                            key={level}
                                            className={`level-dot ${level <= item.level ? 'filled' : ''}`}
                                        ></span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="dashboard-card quick-actions-card">
                    <div className="card-header">
                        <h2>Quick Actions</h2>
                    </div>
                    <div className="quick-actions">
                        <Link href="/skill-gap" className="quick-action">
                            <div className="quick-action-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                                </svg>
                            </div>
                            <span>Run Analysis</span>
                        </Link>
                        <Link href="/reports" className="quick-action">
                            <div className="quick-action-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <path d="M14 2v6h6" />
                                </svg>
                            </div>
                            <span>View Reports</span>
                        </Link>
                        <Link href="/settings" className="quick-action">
                            <div className="quick-action-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="17 8 12 3 7 8" />
                                    <line x1="12" y1="3" x2="12" y2="15" />
                                </svg>
                            </div>
                            <span>Update Resume</span>
                        </Link>
                        <Link href="/trends" className="quick-action">
                            <div className="quick-action-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M23 6l-9.5 9.5-5-5L1 18" />
                                    <path d="M17 6h6v6" />
                                </svg>
                            </div>
                            <span>View Trends</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Emerging Skills Alert */}
            <div className="emerging-skills-alert">
                <div className="alert-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                </div>
                <div className="alert-content">
                    <h3>🔥 Emerging Skills This Week</h3>
                    <p>
                        <strong>LangChain</strong>, <strong>RAG (Retrieval Augmented Generation)</strong>, and
                        <strong> Vector Databases</strong> are trending in ML job postings. Consider learning these!
                    </p>
                </div>
                <Link href="/trends" className="btn btn-outline btn-sm">Learn More</Link>
            </div>
        </div>
    )
}

// Loading fallback for Suspense
function DashboardLoading() {
    return (
        <div className="dashboard-loading">
            <div className="spinner"></div>
            <p>Loading dashboard...</p>
        </div>
    )
}

// Wrapper component with Suspense boundary for useSearchParams
export default function DashboardPage() {
    return (
        <Suspense fallback={<DashboardLoading />}>
            <DashboardPageContent />
        </Suspense>
    )
}

