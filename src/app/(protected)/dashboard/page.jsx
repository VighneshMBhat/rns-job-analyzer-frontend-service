'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '../../../context/AuthContext'
import { mlAPI, jobMarketAPI } from '../../../services/api'
import './dashboard.css'

function DashboardPage() {
    const { user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState({
        latestAnalysis: null,
        trendingRoles: [],
        marketSnapshot: null
    })

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [analysisRes, rolesRes, snapshotRes] = await Promise.all([
                    mlAPI.getLatestAnalysis(),
                    jobMarketAPI.getTrendingRoles(),
                    jobMarketAPI.getMarketSnapshot()
                ])

                setData({
                    latestAnalysis: analysisRes.data,
                    trendingRoles: rolesRes.data.slice(0, 5),
                    marketSnapshot: snapshotRes.data
                })
            } catch (error) {
                console.error('Failed to fetch dashboard data:', error)
            }
            setLoading(false)
        }

        fetchDashboardData()
    }, [])

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="spinner"></div>
                <p>Loading dashboard...</p>
            </div>
        )
    }

    const { latestAnalysis, trendingRoles, marketSnapshot } = data

    return (
        <div className="dashboard-page">
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
                        <span className="stat-value">{latestAnalysis?.gapPercentage || 35}%</span>
                        <span className="stat-change negative">↓ 7% from last week</span>
                    </div>
                    <div className="stat-chart">
                        <svg viewBox="0 0 100 40">
                            <path d="M0 35 L20 30 L40 32 L60 25 L80 20 L100 15" fill="none" stroke="currentColor" strokeWidth="2" />
                        </svg>
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
                        <span className="stat-value">{latestAnalysis?.roleFitScore || 65}%</span>
                        <span className="stat-change positive">↑ 12% improvement</span>
                    </div>
                    <div className="stat-progress">
                        <div className="progress">
                            <div className="progress-bar" style={{ width: `${latestAnalysis?.roleFitScore || 65}%` }}></div>
                        </div>
                    </div>
                </div>

                <div className="stat-card stat-card-accent">
                    <div className="stat-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                        </svg>
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Skills Tracked</span>
                        <span className="stat-value">{marketSnapshot?.totalSkills || 320}</span>
                        <span className="stat-change">Across market</span>
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
                        <span className="stat-value">{(marketSnapshot?.totalJobs / 1000).toFixed(0) || 45}K+</span>
                        <span className="stat-change">Updated weekly</span>
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
                        {[
                            { skill: 'TensorFlow', importance: 85, priority: 'High' },
                            { skill: 'PyTorch', importance: 80, priority: 'High' },
                            { skill: 'Kubernetes', importance: 65, priority: 'Medium' },
                            { skill: 'MLOps', importance: 60, priority: 'Medium' }
                        ].map((item, index) => (
                            <div key={index} className="skill-item">
                                <div className="skill-info">
                                    <span className="skill-name">{item.skill}</span>
                                    <span className={`skill-priority priority-${item.priority.toLowerCase()}`}>
                                        {item.priority}
                                    </span>
                                </div>
                                <div className="skill-bar">
                                    <div className="progress">
                                        <div
                                            className="progress-bar"
                                            style={{ width: `${item.importance}%`, background: 'var(--gradient-accent)' }}
                                        ></div>
                                    </div>
                                    <span className="skill-percentage">{item.importance}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Trending Roles */}
                <div className="dashboard-card">
                    <div className="card-header">
                        <h2>Trending Job Roles</h2>
                        <Link href="/trends" className="card-link">View all →</Link>
                    </div>
                    <div className="roles-list">
                        {trendingRoles.map((role, index) => (
                            <div key={role.id} className="role-item">
                                <span className="role-rank">#{index + 1}</span>
                                <div className="role-info">
                                    <span className="role-title">{role.title}</span>
                                    <span className="role-demand">Demand: {role.demand}%</span>
                                </div>
                                <span className={`role-growth ${role.growth.startsWith('+') ? 'positive' : 'negative'}`}>
                                    {role.growth}
                                </span>
                            </div>
                        ))}
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

export default DashboardPage
