'use client'

import { createContext, useState, useContext, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { authAPI } from '../services/api'

const AuthContext = createContext()

export function useAuth() {
    return useContext(AuthContext)
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()
    const pathname = usePathname()

    // Initialize auth state from local storage
    useEffect(() => {
        const checkAuth = async () => {
            const storedUser = localStorage.getItem('user')
            if (storedUser) {
                setUser(JSON.parse(storedUser))
            }
            setLoading(false)
        }
        checkAuth()
    }, [])

    // Login function
    const login = async (email, password) => {
        try {
            const response = await authAPI.login({ email, password })
            const userData = response.data.user
            const token = response.data.token

            const userWithToken = { ...userData, token }
            localStorage.setItem('user', JSON.stringify(userWithToken))
            setUser(userWithToken)

            return { success: true }
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.message || 'Invalid credentials'
            }
        }
    }

    // Signup function
    const signup = async (userData) => {
        try {
            const response = await authAPI.signup(userData)
            const newUser = response.data.user
            const token = response.data.token

            const userWithToken = { ...newUser, token }
            localStorage.setItem('user', JSON.stringify(userWithToken))
            setUser(userWithToken)

            return { success: true }
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.message || 'Signup failed'
            }
        }
    }

    // Logout function
    const logout = () => {
        localStorage.removeItem('user')
        setUser(null)
        router.push('/login')
    }

    // Update profile
    const updateProfile = async (data) => {
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 500))

            const updatedUser = { ...user, ...data }
            localStorage.setItem('user', JSON.stringify(updatedUser))
            setUser(updatedUser)
            return { success: true }
        } catch (error) {
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

    const value = {
        user,
        loading,
        login,
        signup,
        logout,
        updateProfile,
        completeProfile
    }

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    )
}
