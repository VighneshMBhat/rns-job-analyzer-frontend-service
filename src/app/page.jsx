'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '../context/AuthContext'
import './hero.css'

function HeroPage() {
    const { user } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (user) {
            router.push('/dashboard')
        }
    }, [user, router])

    return (
        <div className="hero-page">
            {/* Background Elements */}
            <div className="hero-background">
                <div className="hero-gradient-orb hero-orb-1"></div>
                <div className="hero-gradient-orb hero-orb-2"></div>
                <div className="hero-gradient-orb hero-orb-3"></div>
                <div className="hero-grid"></div>
            </div>

            {/* Navigation */}
            <nav className="hero-nav animate-fadeIn">
                <div className="hero-nav-brand">
                    <svg className="hero-logo" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>SkillGap AI</span>
                </div>
                <div className="hero-nav-actions">
                    <Link href="/login" className="btn btn-ghost">
                        Login
                    </Link>
                    <Link href="/signup" className="btn btn-primary">
                        Get Started
                    </Link>
                </div>
            </nav>

            {/* Main Content */}
            <main className="hero-content">
                <div className="hero-badge animate-slideUp">
                    <span className="badge badge-primary">
                        🚀 AI-Powered Career Intelligence
                    </span>
                </div>

                <h1 className="hero-title animate-slideUp">
                    Bridge Your <span className="text-gradient">Skill Gap</span><br />
                    Master the <span className="text-gradient-secondary">Market</span>
                </h1>

                <p className="hero-description animate-slideUp">
                    Analyze your profile against millions of job postings. Get personalized
                    learning paths, real-time market trends, and AI-driven recommendations
                    to land your dream role.
                </p>

                <div className="hero-cta animate-slideUp">
                    <Link href="/signup" className="btn btn-primary btn-lg">
                        Start Free Analysis
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                    </Link>
                    <Link href="/login" className="btn btn-secondary btn-lg">
                        View Demo
                    </Link>
                </div>

                {/* Feature Cards */}
                <div className="hero-features animate-fadeIn">
                    <div className="hero-feature-card">
                        <div className="hero-feature-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 6v6l4 2" />
                            </svg>
                        </div>
                        <h3>Real-Time Analysis</h3>
                        <p>Compare your skills against live job market data updated weekly.</p>
                    </div>

                    <div className="hero-feature-card">
                        <div className="hero-feature-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                            </svg>
                        </div>
                        <h3>Smart Roadmap</h3>
                        <p>Get AI-curated learning paths to close your skill gaps efficiently.</p>
                    </div>

                    <div className="hero-feature-card">
                        <div className="hero-feature-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M23 6l-9.5 9.5-5-5L1 18" />
                                <path d="M17 6h6v6" />
                            </svg>
                        </div>
                        <h3>Trend Spotting</h3>
                        <p>Identify emerging technologies before they become industry standards.</p>
                    </div>
                </div>
            </main>

            {/* Stats */}
            <div className="hero-stats animate-fadeIn">
                <div className="hero-stat">
                    <span className="hero-stat-number">45K+</span>
                    <span className="hero-stat-label">Jobs Analyzed</span>
                </div>
                <div className="hero-stat-divider"></div>
                <div className="hero-stat">
                    <span className="hero-stat-number">120+</span>
                    <span className="hero-stat-label">Job Roles</span>
                </div>
                <div className="hero-stat-divider"></div>
                <div className="hero-stat">
                    <span className="hero-stat-number">95%</span>
                    <span className="hero-stat-label">Accuracy</span>
                </div>
            </div>

            {/* Footer */}
            <footer className="hero-footer">
                <p>© 2024 SkillGap AI. Built with ❤️ for developers.</p>
            </footer>
        </div>
    )
}

export default HeroPage
