import axios from 'axios'
import { createClient } from '@supabase/supabase-js'

// --- Configuration ---
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const AUTH_API_URL = process.env.NEXT_PUBLIC_AUTH_API_URL || 'https://qagyzk8zze.execute-api.us-east-1.amazonaws.com/Prod'
const GITHUB_SERVICE_URL = process.env.NEXT_PUBLIC_GITHUB_SERVICE_URL || 'https://12dbzw94lh.execute-api.us-east-1.amazonaws.com/Prod'

// --- Supabase Client ---
export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null

// --- Axios Instance for general API calls ---
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
})

// --- Axios Instance for Auth API ---
const authAxios = axios.create({
    baseURL: AUTH_API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
})

// --- Axios Instance for GitHub Service ---
const githubAxios = axios.create({
    baseURL: GITHUB_SERVICE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
})

// Add request interceptor to attach token to API calls
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('access_token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
    }
    return config
})

// --- API Services ---

// Auth Service - Integrated with AWS Lambda Authentication
export const authAPI = {
    /**
     * Login with email and password
     * Uses the authentication service from INTEGRATION.md
     * Returns: { access_token, token_type }
     */
    login: async (credentials) => {
        try {
            const response = await authAxios.post('/auth/login', {
                email: credentials.email,
                password: credentials.password
            })

            // The API returns { access_token, token_type }
            return {
                data: {
                    access_token: response.data.access_token,
                    token_type: response.data.token_type
                }
            }
        } catch (error) {
            console.error('Login failed:', error)
            throw error
        }
    },

    /**
     * Register a new user with email and password
     * Uses the authentication service from INTEGRATION.md
     * Returns: { message, user: { id, email } }
     */
    register: async (data) => {
        try {
            const response = await authAxios.post('/auth/register', {
                email: data.email,
                password: data.password
            })

            return {
                data: {
                    message: response.data.message,
                    user: response.data.user
                }
            }
        } catch (error) {
            console.error('Registration failed:', error)
            throw error
        }
    },

    /**
     * Get current user profile
     * Requires valid access_token in Authorization header
     * Returns: { id, email }
     */
    getCurrentUser: async (token) => {
        try {
            const response = await authAxios.get('/auth/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            return {
                data: {
                    id: response.data.id,
                    email: response.data.email
                }
            }
        } catch (error) {
            console.error('Get current user failed:', error)
            throw error
        }
    },

    /**
     * Validate token by calling /auth/me
     * Returns true if token is valid, false otherwise
     */
    validateToken: async (token) => {
        if (!token) return false

        try {
            await authAxios.get('/auth/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            return true
        } catch (error) {
            console.error('Token validation failed:', error)
            return false
        }
    },

    /**
     * Sign in with Google using Supabase OAuth
     * Redirects to Google OAuth flow
     */
    signInWithGoogle: async (redirectTo) => {
        if (!supabase) {
            throw new Error('Supabase client not configured')
        }

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectTo || `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`
            }
        })

        if (error) throw error
        return { data }
    },

    /**
     * Handle Supabase OAuth callback
     * Extracts session from URL hash
     */
    handleOAuthCallback: async () => {
        if (!supabase) {
            throw new Error('Supabase client not configured')
        }

        const { data, error } = await supabase.auth.getSession()

        if (error) throw error
        return { data }
    },

    /**
     * Update user profile
     */
    updateProfile: async (data) => {
        return api.put('/users/profile', data).catch(() => {
            // Fallback for demo - save to localStorage
            return { data: { success: true } }
        })
    }
}

// GitHub Service - Integrated with AWS Lambda GitHub Service
export const githubAPI = {
    /**
     * Get the GitHub OAuth connect URL
     * User should be redirected to this URL to start OAuth flow
     */
    getConnectUrl: (userId) => {
        return `${GITHUB_SERVICE_URL}/api/github/connect?user_id=${userId}`
    },

    /**
     * Initiate GitHub OAuth connection
     * Redirects user to GitHub OAuth flow
     */
    connectGitHub: (userId) => {
        if (typeof window !== 'undefined') {
            window.location.href = `${GITHUB_SERVICE_URL}/api/github/connect?user_id=${userId}`
        }
    },

    /**
     * Check if user has connected GitHub
     * Queries the github_connections table via Supabase
     * Returns: { connected: boolean, data: { github_username, last_sync_at } | null }
     */
    checkConnection: async (userId) => {
        if (!supabase) {
            console.warn('Supabase client not configured')
            return { connected: false, data: null }
        }

        try {
            const { data, error } = await supabase
                .from('github_connections')
                .select('github_username, github_user_id, last_sync_at, repos_analyzed')
                .eq('user_id', userId)
                .single()

            if (error) {
                // PGRST116 = Row not found (not an actual error in this context)
                if (error.code === 'PGRST116') {
                    return { connected: false, data: null }
                }
                console.error('Error checking GitHub connection:', error)
                return { connected: false, data: null, error: error.message }
            }

            return {
                connected: !!data,
                data: data ? {
                    github_username: data.github_username,
                    github_user_id: data.github_user_id,
                    last_sync_at: data.last_sync_at,
                    repos_analyzed: data.repos_analyzed
                } : null
            }
        } catch (error) {
            console.error('Error checking GitHub connection:', error)
            return { connected: false, data: null, error: error.message }
        }
    },

    /**
     * Trigger manual sync of GitHub repositories
     * POST /api/github/sync/trigger/{user_id}
     */
    triggerSync: async (userId) => {
        try {
            const response = await githubAxios.post(`/api/github/sync/trigger/${userId}`)
            return { success: true, data: response.data }
        } catch (error) {
            console.error('GitHub sync failed:', error)
            return {
                success: false,
                error: error.response?.data?.message || 'Failed to sync GitHub repositories'
            }
        }
    },

    /**
     * Trigger resume skill extraction
     * POST /api/github/sync/resume/{user_id}
     */
    syncResume: async (userId) => {
        try {
            const response = await githubAxios.post(`/api/github/sync/resume/${userId}`)
            return { success: true, data: response.data }
        } catch (error) {
            console.error('Resume sync failed:', error)
            return {
                success: false,
                error: error.response?.data?.message || 'Failed to extract skills from resume'
            }
        }
    },

    /**
     * Get user skills from Supabase
     * Returns skills extracted from GitHub, resume, or manually added
     */
    getUserSkills: async (userId) => {
        if (!supabase) {
            return { success: false, data: [], error: 'Supabase not configured' }
        }

        try {
            const { data, error } = await supabase
                .from('user_skills')
                .select('skill_name, source, confidence_score, proficiency_level, source_repo')
                .eq('user_id', userId)
                .order('proficiency_level', { ascending: false })

            if (error) throw error

            return { success: true, data: data || [] }
        } catch (error) {
            console.error('Error fetching user skills:', error)
            return { success: false, data: [], error: error.message }
        }
    }
}

// Job Market Service
export const jobMarketAPI = {
    getTrendingRoles: async () => {
        // Try Real API first
        try {
            return await api.get('/trends/roles')
        } catch (e) {
            // Fallback Mock Data
            return {
                data: [
                    { id: 1, title: 'Machine Learning Engineer', demand: 92, growth: '+15%' },
                    { id: 2, title: 'AI Ethics Specialist', demand: 88, growth: '+25%' },
                    { id: 3, title: 'Data Engineer', demand: 85, growth: '+10%' },
                    { id: 4, title: 'Full Stack Developer', demand: 82, growth: '+5%' },
                    { id: 5, title: 'Cloud Architect', demand: 80, growth: '+8%' }
                ]
            }
        }
    },

    getTrendingSkills: async () => {
        try {
            return await api.get('/trends/skills')
        } catch (e) {
            return {
                data: [
                    { skill: 'Python', count: 15420, percentage: 95, trend: 'stable' },
                    { skill: 'TensorFlow', count: 12300, percentage: 80, trend: 'rising' },
                    { skill: 'React', count: 11000, percentage: 75, trend: 'stable' },
                    { skill: 'AWS', count: 10500, percentage: 72, trend: 'rising' },
                    { skill: 'Docker', count: 9800, percentage: 68, trend: 'stable' }
                ]
            }
        }
    },

    getMarketSnapshot: async () => {
        try {
            return await api.get('/trends/snapshot')
        } catch (e) {
            return {
                data: {
                    totalJobs: 45200,
                    totalRoles: 120,
                    totalSkills: 320,
                    lastUpdated: new Date().toISOString(),
                    emergingSkills: ['LangChain', 'Vector DB', 'RAG', 'Prompt Engineering'],
                    decliningSkills: ['jQuery', 'Flash', 'Perl', 'Objective-C']
                }
            }
        }
    }
}

// ML Analysis Service
export const mlAPI = {
    analyzeSkillGap: async (targetRole, resumeUrl) => {
        try {
            return await api.post('/analysis/gap', { targetRole, resumeUrl })
        } catch (e) {
            await new Promise(resolve => setTimeout(resolve, 2000))
            return {
                data: {
                    targetRole,
                    gapPercentage: 35,
                    roleFitScore: 65,
                    marketDemandScore: 88,
                    trendDirection: 'rising',
                    missingSkills: [
                        { skill: 'TensorFlow', importance: 0.85, priority: 1 },
                        { skill: 'Kubernetes', importance: 0.70, priority: 2 },
                        { skill: 'CI/CD', importance: 0.60, priority: 3 }
                    ],
                    matchedSkills: [
                        { skill: 'Python', proficiency: 4 },
                        { skill: 'Git', proficiency: 5 },
                        { skill: 'SQL', proficiency: 3 }
                    ],
                    partialSkills: [
                        { skill: 'Docker', userLevel: 2, requiredLevel: 4 }
                    ],
                    recommendations: {
                        learningPath: [
                            'Complete "Deep Learning Specialization" on Coursera',
                            'Build a project using Kubernetes directly',
                            'Set up a GitHub Actions pipeline for your ML model'
                        ],
                        resources: [
                            { title: 'TensorFlow Documentation', url: 'https://www.tensorflow.org/' },
                            { title: 'Kubernetes Basics', url: 'https://kubernetes.io/docs/tutorials/kubernetes-basics/' }
                        ]
                    }
                }
            }
        }
    },

    getLatestAnalysis: async () => {
        // Return mock analysis or null
        await new Promise(resolve => setTimeout(resolve, 500))
        return {
            data: {
                gapPercentage: 35,
                roleFitScore: 65,
                lastAnalyzed: new Date().toISOString()
            }
        }
    }
}

// Report Service
export const reportAPI = {
    getReports: async () => {
        try {
            return await api.get('/reports')
        } catch (e) {
            await new Promise(resolve => setTimeout(resolve, 800))
            return {
                data: [
                    {
                        id: 'rep-101',
                        filename: 'skill_gap_report_2023-10-01.pdf',
                        generatedAt: '2023-10-01T10:00:00Z',
                        status: 'completed',
                        emailSent: true,
                        emailSentAt: '2023-10-01T10:05:00Z'
                    }
                ]
            }
        }
    },

    requestReport: async () => {
        return api.post('/reports/generate').catch(() => {
            return { data: { success: true, message: 'Report generation queued' } }
        })
    },

    downloadReport: async (reportId) => {
        return { data: new Blob(['PDF Content Mock'], { type: 'application/pdf' }) }
    }
}

// Storage Service (Supabase Integration)
export const storageAPI = {
    /**
     * Upload resume to Supabase Storage and update profile
     * @param {File} file - The resume file to upload
     * @param {string} userId - The user's ID (optional, for organizing files by user)
     * @returns {Object} - { data: { url, filename } } or throws error
     */
    uploadResume: async (file, userId = null) => {
        // Use Supabase Storage if configured
        if (!supabase) {
            console.warn('Supabase not configured, using mock storage')
            // Mock Fallback
            await new Promise(resolve => setTimeout(resolve, 1500))
            return {
                data: {
                    url: `https://storage.mock.com/resumes/${file.name}`,
                    filename: file.name
                }
            }
        }

        try {
            const fileExt = file.name.split('.').pop()
            const timestamp = Date.now()
            // Create unique filename with user ID if available
            const fileName = userId
                ? `${userId}/${timestamp}.${fileExt}`
                : `${timestamp}_${Math.random().toString(36).substring(7)}.${fileExt}`

            // Upload to Supabase storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('resumes')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: true // Replace if exists
                })

            if (uploadError) {
                console.error('Supabase upload error:', uploadError)
                throw uploadError
            }

            // Get the public URL for the file
            // Note: For private buckets, use createSignedUrl instead
            const { data: urlData } = supabase.storage
                .from('resumes')
                .getPublicUrl(uploadData.path)

            const publicUrl = urlData?.publicUrl || uploadData.path

            // If userId is provided, also update the profiles table
            if (userId) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({
                        resume_url: publicUrl,
                        resume_uploaded_at: new Date().toISOString()
                    })
                    .eq('id', userId)

                if (profileError) {
                    console.warn('Failed to update profile with resume URL:', profileError)
                    // Don't throw - the upload succeeded
                }
            }

            return {
                data: {
                    url: publicUrl,
                    path: uploadData.path,
                    filename: file.name
                }
            }
        } catch (error) {
            console.error('Resume upload failed:', error)
            throw error
        }
    },

    /**
     * Get a signed URL for a resume (for private buckets)
     * @param {string} path - The path to the file in storage
     * @param {number} expiresIn - Seconds until URL expires (default 1 hour)
     */
    getSignedUrl: async (path, expiresIn = 3600) => {
        if (!supabase) {
            return { url: path, error: 'Supabase not configured' }
        }

        try {
            const { data, error } = await supabase.storage
                .from('resumes')
                .createSignedUrl(path, expiresIn)

            if (error) throw error
            return { url: data.signedUrl }
        } catch (error) {
            console.error('Failed to get signed URL:', error)
            return { url: path, error: error.message }
        }
    }
}

export default api
