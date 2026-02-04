'use client'

import { useState, useEffect } from 'react'
import { jobMarketAPI } from '../../../services/api'
import './trends.css'

function TrendsPage() {
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('roles')
    const [data, setData] = useState({
        roles: [],
        skills: [],
        snapshot: null
    })

    useEffect(() => {
        const fetchTrendsData = async () => {
            try {
                const [rolesRes, skillsRes, snapshotRes] = await Promise.all([
                    jobMarketAPI.getTrendingRoles(),
                    jobMarketAPI.getTrendingSkills(),
                    jobMarketAPI.getMarketSnapshot()
                ])

                setData({
                    roles: rolesRes.data,
                    skills: skillsRes.data,
                    snapshot: snapshotRes.data
                })
            } catch (error) {
                console.error('Failed to fetch trends data:', error)
            }
            setLoading(false)
        }

        fetchTrendsData()
    }, [])

    if (loading) {
        return (
            <div className="trends-loading">
                <div className="spinner"></div>
                <p>Loading market trends...</p>
            </div>
        )
    }

    const { roles, skills, snapshot } = data

    return (
        <div className="trends-page">
            {/* Header */}
            <div className="page-header">
                <h1>Job Market Trends</h1>
                <p>Real-time insights into the most in-demand roles and skills</p>
            </div>

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
                        <span className="overview-value">{(snapshot?.totalJobs / 1000).toFixed(0)}K+</span>
                        <span className="overview-label">Jobs Analyzed</span>
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
