'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../context/AuthContext'
import Sidebar from '../../components/layout/Sidebar'
import './protected-layout.css'

export default function ProtectedLayout({ children }) {
    const { user, loading } = useAuth()
    const router = useRouter()

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login')
        }
    }, [user, loading, router])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] text-[var(--text-primary)]">
                <div className="spinner"></div>
            </div>
        )
    }

    if (!user) {
        return null // Will redirect
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
