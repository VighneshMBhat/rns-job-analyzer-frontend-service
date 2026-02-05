'use client'

import { useState, useEffect } from 'react'
import { githubAPI } from '../../../services/api'
import { useAuth } from '../../../context/AuthContext'
import './repositories.css'

function RepositoriesPage() {
    const { user, githubConnection, checkGithubConnection } = useAuth()
    const [loading, setLoading] = useState(true)
    const [repositories, setRepositories] = useState([])
    const [expandedRepo, setExpandedRepo] = useState(null)
    const [error, setError] = useState('')

    useEffect(() => {
        const fetchRepositories = async () => {
            if (!user?.id) {
                setLoading(false)
                return
            }

            // Check GitHub connection first
            await checkGithubConnection(user.id)

            try {
                const response = await githubAPI.getRepositories(user.id)
                if (response.success) {
                    setRepositories(response.data || [])
                } else {
                    setError(response.error || 'Failed to fetch repositories')
                }
            } catch (err) {
                console.error('Failed to fetch repositories:', err)
                setError('An error occurred while fetching repositories')
            }
            setLoading(false)
        }

        fetchRepositories()
    }, [user?.id, checkGithubConnection])

    const toggleAccordion = (repoId) => {
        setExpandedRepo(expandedRepo === repoId ? null : repoId)
    }

    const handleConnectGitHub = () => {
        if (user?.id) {
            githubAPI.connectGitHub(user.id)
        }
    }

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'Unknown'
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }

    // Truncate README for preview
    const truncateReadme = (content, maxLength = 200) => {
        if (!content) return 'No README available'
        if (content.length <= maxLength) return content
        return content.substring(0, maxLength) + '...'
    }

    if (loading) {
        return (
            <div className="repositories-loading">
                <div className="spinner"></div>
                <p>Loading repositories...</p>
            </div>
        )
    }

    // Check if GitHub is connected
    const isGitHubConnected = githubConnection.connected || user?.githubConnected

    return (
        <div className="repositories-page">
            {/* Header */}
            <div className="page-header">
                <div className="header-content">
                    <h1>My Repositories</h1>
                    <p>View your GitHub repositories and extracted skills</p>
                </div>
            </div>

            {/* GitHub Not Connected Alert */}
            {!isGitHubConnected && !githubConnection.loading && (
                <div className="github-alert warning animate-fadeIn">
                    <div className="alert-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                        </svg>
                    </div>
                    <div className="alert-content">
                        <h3>GitHub Not Connected</h3>
                        <p>Connect your GitHub account to view your repositories and extract skills from your code.</p>
                        <button className="btn btn-primary" onClick={handleConnectGitHub}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                            </svg>
                            Connect GitHub
                        </button>
                    </div>
                </div>
            )}

            {/* Error Alert */}
            {error && (
                <div className="github-alert error animate-fadeIn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {error}
                </div>
            )}

            {/* Repositories List */}
            {isGitHubConnected && (
                <div className="repositories-container">
                    {repositories.length === 0 ? (
                        <div className="empty-state">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                            </svg>
                            <h3>No repositories found</h3>
                            <p>
                                Your synced GitHub repositories will appear here.
                                Make sure your GitHub is connected and repositories have been synced.
                            </p>
                        </div>
                    ) : (
                        <div className="repositories-list animate-fadeIn">
                            {repositories.map((repo) => (
                                <div
                                    key={repo.id}
                                    className={`repo-card ${expandedRepo === repo.id ? 'expanded' : ''}`}
                                >
                                    {/* Accordion Header */}
                                    <div
                                        className="repo-header"
                                        onClick={() => toggleAccordion(repo.id)}
                                    >
                                        <div className="repo-icon">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                                            </svg>
                                        </div>
                                        <div className="repo-info">
                                            <h3>{repo.repo_name}</h3>
                                            <div className="repo-meta">
                                                <span className="repo-fullname">{repo.repo_full_name}</span>
                                                <span className="repo-date">
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <circle cx="12" cy="12" r="10" />
                                                        <polyline points="12 6 12 12 16 14" />
                                                    </svg>
                                                    {formatDate(repo.last_processed_at)}
                                                </span>
                                            </div>
                                            {/* Skills Preview */}
                                            {repo.skills?.length > 0 && (
                                                <div className="skills-preview">
                                                    {repo.skills.slice(0, 5).map((skill, idx) => (
                                                        <span key={idx} className="skill-badge">
                                                            {skill.name}
                                                        </span>
                                                    ))}
                                                    {repo.skills.length > 5 && (
                                                        <span className="skill-badge more">
                                                            +{repo.skills.length - 5} more
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="repo-toggle">
                                            <svg
                                                width="20"
                                                height="20"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                className={expandedRepo === repo.id ? 'rotated' : ''}
                                            >
                                                <polyline points="6 9 12 15 18 9" />
                                            </svg>
                                        </div>
                                    </div>

                                    {/* Accordion Content */}
                                    {expandedRepo === repo.id && (
                                        <div className="repo-content animate-slideDown">
                                            {/* README Section */}
                                            <div className="readme-section">
                                                <h4>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                        <path d="M14 2v6h6" />
                                                    </svg>
                                                    README.md
                                                </h4>
                                                <div className="readme-content">
                                                    <pre>{repo.readme_content || 'No README content available'}</pre>
                                                </div>
                                            </div>

                                            {/* Skills Section */}
                                            <div className="skills-section">
                                                <h4>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                                                    </svg>
                                                    Extracted Skills ({repo.skills?.length || 0})
                                                </h4>
                                                {repo.skills?.length > 0 ? (
                                                    <div className="skills-grid">
                                                        {repo.skills.map((skill, idx) => (
                                                            <div key={idx} className="skill-card">
                                                                <span className="skill-name">{skill.name}</span>
                                                                {skill.confidence && (
                                                                    <span className="skill-confidence">
                                                                        {Math.round(skill.confidence * 100)}% confidence
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="no-skills">No skills extracted from this repository yet.</p>
                                                )}
                                            </div>

                                            {/* View on GitHub Link */}
                                            <div className="repo-actions">
                                                <a
                                                    href={repo.repo_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="btn btn-outline"
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                                        <polyline points="15 3 21 3 21 9" />
                                                        <line x1="10" y1="14" x2="21" y2="3" />
                                                    </svg>
                                                    View on GitHub
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Info Card */}
            <div className="info-card">
                <div className="info-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                </div>
                <div className="info-content">
                    <h3>About Your Repositories</h3>
                    <p>
                        This page displays your GitHub repositories that have been analyzed for skills.
                        Skills are automatically extracted from your code using AI-powered analysis.
                        Click on any repository to view its README and the skills that were identified.
                    </p>
                </div>
            </div>
        </div>
    )
}

export default RepositoriesPage
