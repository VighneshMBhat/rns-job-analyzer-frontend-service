'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../context/AuthContext'
import Sidebar from '../../components/layout/Sidebar'
import './protected-layout.css'

export default function ProtectedLayout({ children }) {
    const { user, loading, isAuthenticated } = useAuth()
    const router = useRouter()

    useEffect(() => {
        // Redirect to login if not authenticated and not loading
        if (!loading && !isAuthenticated) {
            router.push('/login')
        }
    }, [isAuthenticated, loading, router])

    // Show loading spinner while checking authentication
    if (loading) {
        return (
            <div className="protected-loading">
                <div className="spinner"></div>
                <p>Loading...</p>
            </div>
        )
    }

    // Don't render anything while redirecting
    if (!isAuthenticated) {
        return (
            <div className="protected-loading">
                <p>Redirecting to login...</p>
            </div>
        )
    }

    return (
        <div className="protected-layout">
            <Sidebar />
            <main className="main-content">
                {children}
            </main>
        </div>
    )
}
