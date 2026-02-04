'use client'

import { createContext, useState, useContext, useEffect, useCallback, Suspense } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { authAPI, githubAPI, supabase } from '../services/api'

const AuthContext = createContext()

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/', '/login', '/signup', '/auth/callback']

export function useAuth() {
    return useContext(AuthContext)
}

// Inner component that uses useSearchParams (needs Suspense)
function AuthProviderInner({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const [githubConnection, setGithubConnection] = useState({
        connected: false,
        loading: true,
        data: null,
        error: null
    })
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    /**
     * Check GitHub connection status
     */
    const checkGithubConnection = useCallback(async (userId) => {
        if (!userId) {
            setGithubConnection({ connected: false, loading: false, data: null, error: null })
            return
        }

        setGithubConnection(prev => ({ ...prev, loading: true }))

        try {
            const result = await githubAPI.checkConnection(userId)
            setGithubConnection({
                connected: result.connected,
                loading: false,
                data: result.data,
                error: result.error || null
            })

            // Also update user data with GitHub info
            if (result.connected && result.data) {
                setUser(prev => ({
                    ...prev,
                    githubConnected: true,
                    githubUsername: result.data.github_username,
                    githubConnectedAt: result.data.last_sync_at
                }))

                // Update localStorage
                const currentUserData = JSON.parse(localStorage.getItem('user_data') || '{}')
                localStorage.setItem('user_data', JSON.stringify({
                    ...currentUserData,
                    githubConnected: true,
                    githubUsername: result.data.github_username,
                    githubConnectedAt: result.data.last_sync_at
                }))
            }

            return result
        } catch (error) {
            console.error('Error checking GitHub connection:', error)
            setGithubConnection({
                connected: false,
                loading: false,
                data: null,
                error: error.message
            })
            return { connected: false, error: error.message }
        }
    }, [])

    /**
     * Connect GitHub account
     * Initiates OAuth flow by redirecting to GitHub
     */
    const connectGitHub = useCallback(() => {
        if (!user?.id) {
            console.error('User ID not available for GitHub connection')
            return { success: false, error: 'User not authenticated' }
        }

        // Store pending connection state
        localStorage.setItem('github_connection_pending', 'true')

        // Redirect to GitHub OAuth
        githubAPI.connectGitHub(user.id)
        return { success: true }
    }, [user?.id])

    /**
     * Handle GitHub OAuth callback
     * Called when user returns from GitHub OAuth with ?feature=github_connected
     */
    const handleGithubCallback = useCallback(async () => {
        const feature = searchParams?.get('feature')

        if (feature === 'github_connected') {
            // Clear pending state
            localStorage.removeItem('github_connection_pending')

            // Refresh GitHub connection status
            if (user?.id) {
                await checkGithubConnection(user.id)
            }

            // Remove the query parameter from URL
            const newUrl = pathname
            router.replace(newUrl, { scroll: false })

            return { success: true, message: 'GitHub connected successfully!' }
        }

        return { success: false }
    }, [searchParams, user?.id, checkGithubConnection, pathname, router])

    /**
     * Validate token and get user info
     * Returns true if valid, false otherwise
     */
    const validateAndGetUser = useCallback(async (token) => {
        if (!token) return false

        try {
            // Validate token by calling /auth/me
            const response = await authAPI.getCurrentUser(token)
            if (response.data && response.data.id) {
                // Get additional user data from localStorage if available
                const storedUserData = localStorage.getItem('user_data')
                const userData = storedUserData ? JSON.parse(storedUserData) : {}

                const fullUser = {
                    id: response.data.id,
                    email: response.data.email,
                    ...userData
                }

                setUser(fullUser)
                setIsAuthenticated(true)

                // Check GitHub connection status
                checkGithubConnection(response.data.id)

                return true
            }
            return false
        } catch (error) {
            console.error('Token validation failed:', error)
            return false
        }
    }, [checkGithubConnection])

    /**
     * Clear authentication state and redirect to login
     */
    const clearAuthAndRedirect = useCallback(() => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('user_data')
        localStorage.removeItem('github_connection_pending')
        setUser(null)
        setIsAuthenticated(false)
        setGithubConnection({ connected: false, loading: false, data: null, error: null })

        // Only redirect if not already on a public route
        if (!PUBLIC_ROUTES.includes(pathname)) {
            router.push('/login')
        }
    }, [pathname, router])

    // Initialize auth state from local storage
    useEffect(() => {
        const checkAuth = async () => {
            setLoading(true)

            // Check for OAuth callback (Supabase Google login)
            if (pathname === '/auth/callback' && supabase) {
                try {
                    const { data: { session } } = await supabase.auth.getSession()
                    if (session?.access_token) {
                        localStorage.setItem('access_token', session.access_token)
                        const isValid = await validateAndGetUser(session.access_token)
                        if (isValid) {
                            setLoading(false)
                            router.push('/dashboard')
                            return
                        }
                    }
                } catch (error) {
                    console.error('OAuth callback error:', error)
                }
            }

            // Check for existing token
            const storedToken = localStorage.getItem('access_token')

            if (storedToken) {
                const isValid = await validateAndGetUser(storedToken)

                if (!isValid) {
                    // Token is invalid, clear everything and redirect to login
                    clearAuthAndRedirect()
                }
            } else {
                // No token found
                if (!PUBLIC_ROUTES.includes(pathname)) {
                    // Redirect to login for protected routes
                    router.push('/login')
                }
            }

            setLoading(false)
        }

        checkAuth()
    }, [pathname, validateAndGetUser, clearAuthAndRedirect, router])

    // Handle GitHub callback when on dashboard with ?feature=github_connected
    useEffect(() => {
        if (isAuthenticated && pathname === '/dashboard') {
            handleGithubCallback()
        }
    }, [isAuthenticated, pathname, handleGithubCallback])

    // Login function
    const login = async (email, password) => {
        try {
            const response = await authAPI.login({ email, password })
            const accessToken = response.data.access_token

            if (!accessToken) {
                return {
                    success: false,
                    error: 'No access token received from server'
                }
            }

            // Store the access token
            localStorage.setItem('access_token', accessToken)

            // Validate token and get user info
            const isValid = await validateAndGetUser(accessToken)

            if (isValid) {
                return { success: true }
            } else {
                // Token received but validation failed
                localStorage.removeItem('access_token')
                return {
                    success: false,
                    error: 'Authentication failed. Please try again.'
                }
            }
        } catch (error) {
            console.error('Login error:', error)
            return {
                success: false,
                error: error.response?.data?.detail || error.response?.data?.message || 'Invalid credentials'
            }
        }
    }

    // Signup function
    const signup = async (userData) => {
        try {
            // Register the user
            const response = await authAPI.register({
                email: userData.email,
                password: userData.password
            })

            if (response.data.message) {
                // Registration successful, now login
                const loginResult = await login(userData.email, userData.password)

                if (loginResult.success) {
                    // Store additional user data
                    const additionalData = {
                        fullName: userData.fullName,
                        onboardingCompleted: false,
                        githubConnected: false,
                        githubConnectionFailed: false
                    }
                    localStorage.setItem('user_data', JSON.stringify(additionalData))
                    setUser(prev => ({ ...prev, ...additionalData }))

                    return { success: true }
                } else {
                    return {
                        success: false,
                        error: 'Account created but login failed. Please try logging in.'
                    }
                }
            }

            return {
                success: false,
                error: 'Registration failed'
            }
        } catch (error) {
            console.error('Signup error:', error)
            return {
                success: false,
                error: error.response?.data?.detail || error.response?.data?.message || 'Signup failed'
            }
        }
    }

    // Google Sign In function
    const signInWithGoogle = async () => {
        try {
            const redirectUrl = typeof window !== 'undefined'
                ? `${window.location.origin}/auth/callback`
                : '/auth/callback'

            await authAPI.signInWithGoogle(redirectUrl)
            return { success: true }
        } catch (error) {
            console.error('Google sign in error:', error)
            return {
                success: false,
                error: error.message || 'Google sign in failed'
            }
        }
    }

    // Logout function
    const logout = useCallback(() => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('user_data')
        localStorage.removeItem('github_connection_pending')
        setUser(null)
        setIsAuthenticated(false)
        setGithubConnection({ connected: false, loading: false, data: null, error: null })

        // Also sign out from Supabase if using Google OAuth
        if (supabase) {
            supabase.auth.signOut().catch(console.error)
        }

        router.push('/login')
    }, [router])

    // Update profile
    const updateProfile = async (data) => {
        try {
            // Update on server
            await authAPI.updateProfile(data)

            // Update local storage
            const currentUserData = JSON.parse(localStorage.getItem('user_data') || '{}')
            const updatedUserData = { ...currentUserData, ...data }
            localStorage.setItem('user_data', JSON.stringify(updatedUserData))

            // Update state
            setUser(prev => ({ ...prev, ...data }))

            return { success: true }
        } catch (error) {
            console.error('Update profile error:', error)
            return { success: false, error: 'Failed to update profile' }
        }
    }

    // Complete profile (onboarding)
    const completeProfile = async (data) => {
        try {
            // Setup default preferences based on role
            const preferences = {
                theme: 'dark',
                notifications: 'weekly'
            }
            return await updateProfile({ ...data, preferences, onboardingCompleted: true })
        } catch (error) {
            return { success: false, error: 'Failed to complete profile' }
        }
    }

    // Mark GitHub connection as failed (for retry later)
    const markGithubConnectionFailed = async () => {
        await updateProfile({ githubConnectionFailed: true, githubConnected: false })
    }

    // Check if current route requires authentication
    const isProtectedRoute = !PUBLIC_ROUTES.includes(pathname)

    const value = {
        user,
        loading,
        isAuthenticated,
        login,
        signup,
        signInWithGoogle,
        logout,
        updateProfile,
        completeProfile,
        // GitHub-related
        githubConnection,
        connectGitHub,
        checkGithubConnection,
        markGithubConnectionFailed
    }

    // Show loading state
    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)'
            }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    border: '3px solid rgba(139, 92, 246, 0.3)',
                    borderTopColor: '#8b5cf6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }} />
                <style jsx>{`
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        )
    }

    // If on a protected route and not authenticated, don't render children
    // The redirect will happen in the useEffect
    if (isProtectedRoute && !isAuthenticated && !loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)',
                color: '#fff'
            }}>
                <p>Redirecting to login...</p>
            </div>
        )
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

// Loading fallback for Suspense
function AuthLoadingFallback() {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)'
        }}>
            <div style={{
                width: '40px',
                height: '40px',
                border: '3px solid rgba(139, 92, 246, 0.3)',
                borderTopColor: '#8b5cf6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
            }} />
            <style jsx>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    )
}

// Wrapper component that provides Suspense boundary
export function AuthProvider({ children }) {
    return (
        <Suspense fallback={<AuthLoadingFallback />}>
            <AuthProviderInner>
                {children}
            </AuthProviderInner>
        </Suspense>
    )
}
