'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../services/api'

/**
 * OAuth Callback Page
 * Handles the redirect from Google OAuth via Supabase
 * Extracts the session and stores the access token
 */
export default function AuthCallbackPage() {
    const router = useRouter()
    const [error, setError] = useState(null)
    const [status, setStatus] = useState('Processing authentication...')

    useEffect(() => {
        const handleCallback = async () => {
            try {
                if (!supabase) {
                    throw new Error('Supabase client not configured')
                }

                setStatus('Verifying session...')

                // Get session from URL hash (Supabase OAuth implicit flow)
                const { data: { session }, error: sessionError } = await supabase.auth.getSession()

                if (sessionError) {
                    throw sessionError
                }

                if (session?.access_token) {
                    setStatus('Authentication successful! Redirecting...')

                    // Store the access token
                    localStorage.setItem('access_token', session.access_token)

                    // Store user data
                    const userData = {
                        id: session.user?.id,
                        email: session.user?.email,
                        fullName: session.user?.user_metadata?.full_name || session.user?.user_metadata?.name || '',
                        avatarUrl: session.user?.user_metadata?.avatar_url || '',
                        onboardingCompleted: false // New OAuth users need onboarding
                    }
                    localStorage.setItem('user_data', JSON.stringify(userData))

                    // Small delay to show success message
                    await new Promise(resolve => setTimeout(resolve, 500))

                    // Redirect to onboarding for new users, dashboard for existing
                    router.push('/onboarding')
                } else {
                    throw new Error('No session found. Please try logging in again.')
                }
            } catch (err) {
                console.error('OAuth callback error:', err)
                setError(err.message || 'Authentication failed. Please try again.')

                // Redirect to login after showing error
                setTimeout(() => {
                    router.push('/login')
                }, 3000)
            }
        }

        handleCallback()
    }, [router])

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)',
            color: '#fff',
            fontFamily: 'Inter, system-ui, sans-serif'
        }}>
            {error ? (
                <>
                    <div style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        background: 'rgba(239, 68, 68, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '1.5rem'
                    }}>
                        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="15" y1="9" x2="9" y2="15" />
                            <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                    </div>
                    <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>Authentication Failed</h2>
                    <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '1rem' }}>{error}</p>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>Redirecting to login...</p>
                </>
            ) : (
                <>
                    <div style={{
                        width: '50px',
                        height: '50px',
                        border: '3px solid rgba(139, 92, 246, 0.3)',
                        borderTopColor: '#8b5cf6',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        marginBottom: '1.5rem'
                    }} />
                    <h2 style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>{status}</h2>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>
                        Please wait while we complete your sign-in...
                    </p>
                </>
            )}
            <style jsx>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    )
}
