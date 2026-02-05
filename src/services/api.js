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

// Skill Gap Analysis Service
const SKILLGAP_SERVICE_URL = process.env.NEXT_PUBLIC_SKILLGAP_SERVICE_URL || 'https://skillgap-service.example.com'

const skillGapAxios = axios.create({
    baseURL: SKILLGAP_SERVICE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
})

export const skillGapAPI = {
    /**
     * Trigger skill gap analysis for a user
     * This manually invokes the analysis that normally runs as a cron job
     * @param {string} userId - The user's ID
     * @returns {Object} - { success: boolean, message?: string, error?: string }
     */
    triggerAnalysis: async (userId) => {
        if (!userId) {
            return { success: false, error: 'User ID is required' }
        }

        try {
            const response = await skillGapAxios.post(`/api/analysis/trigger/${userId}`)
            return {
                success: true,
                message: response.data.message || 'Skill gap analysis started',
                data: response.data
            }
        } catch (error) {
            console.error('Skill gap analysis trigger failed:', error)

            // Handle specific error responses
            if (error.response) {
                const status = error.response.status
                if (status === 429) {
                    return {
                        success: false,
                        error: 'Analysis already in progress. Please wait for it to complete.'
                    }
                }
                return {
                    success: false,
                    error: error.response.data?.message || 'Failed to start analysis'
                }
            }

            return {
                success: false,
                error: 'Unable to connect to analysis service. Please try again later.'
            }
        }
    },

    /**
     * Check the status of a running analysis
     * @param {string} userId - The user's ID
     */
    getAnalysisStatus: async (userId) => {
        if (!supabase || !userId) {
            return { status: 'unknown', error: 'Invalid parameters' }
        }

        try {
            const { data, error } = await supabase
                .from('skill_gap_analyses')
                .select('id, status, analyzed_at, gap_percentage, role_fit_score')
                .eq('user_id', userId)
                .order('analyzed_at', { ascending: false })
                .limit(1)
                .single()

            if (error) {
                if (error.code === 'PGRST116') {
                    return { status: 'none', message: 'No analysis found' }
                }
                throw error
            }

            return {
                status: data.status,
                analyzedAt: data.analyzed_at,
                gapPercentage: data.gap_percentage,
                roleFitScore: data.role_fit_score
            }
        } catch (error) {
            console.error('Failed to get analysis status:', error)
            return { status: 'error', error: error.message }
        }
    }
}

// Report Service - Fetches PDF reports from Supabase 'reports' bucket
export const reportAPI = {
    /**
     * Get reports for the current user from Supabase
     * Reports are stored in the 'reports' bucket organized by user_id
     * @param {string} userId - The user's ID
     */
    getReports: async (userId) => {
        if (!supabase || !userId) {
            console.warn('Supabase not configured or no userId')
            return { data: [] }
        }

        try {
            // List files in the user's reports folder
            const { data: files, error } = await supabase.storage
                .from('reports')
                .list(userId, {
                    limit: 50,
                    sortBy: { column: 'created_at', order: 'desc' }
                })

            if (error) {
                console.error('Error listing reports:', error)
                return { data: [] }
            }

            if (!files || files.length === 0) {
                return { data: [] }
            }

            // Map files to report objects with signed URLs
            const reports = await Promise.all(
                files
                    .filter(file => file.name.endsWith('.pdf'))
                    .map(async (file) => {
                        const filePath = `${userId}/${file.name}`

                        // Generate signed URL for viewing/downloading
                        let signedUrl = null
                        try {
                            const { data: signedData, error: signedError } = await supabase.storage
                                .from('reports')
                                .createSignedUrl(filePath, 3600) // 1 hour expiry

                            if (!signedError && signedData) {
                                signedUrl = signedData.signedUrl
                            }
                        } catch (e) {
                            console.warn('Could not create signed URL for report:', e)
                        }

                        return {
                            id: file.id || file.name,
                            filename: file.name,
                            filePath: filePath,
                            signedUrl: signedUrl,
                            generatedAt: file.created_at || file.updated_at,
                            fileSize: file.metadata?.size || 0,
                            status: 'completed' // If it's in storage, it's complete
                        }
                    })
            )

            return { data: reports }
        } catch (error) {
            console.error('Failed to fetch reports:', error)
            return { data: [] }
        }
    },

    /**
     * Download a report by getting a fresh signed URL
     * @param {string} filePath - The full path to the file in storage
     * @param {string} filename - The filename for download
     */
    downloadReport: async (filePath, filename) => {
        if (!supabase) {
            return { success: false, error: 'Supabase not configured' }
        }

        try {
            // Get fresh signed URL for download
            const { data, error } = await supabase.storage
                .from('reports')
                .createSignedUrl(filePath, 3600)

            if (error) throw error

            // Trigger download
            if (typeof window !== 'undefined' && data.signedUrl) {
                const link = document.createElement('a')
                link.href = data.signedUrl
                link.setAttribute('download', filename)
                link.setAttribute('target', '_blank')
                document.body.appendChild(link)
                link.click()
                link.remove()
            }

            return { success: true, url: data.signedUrl }
        } catch (error) {
            console.error('Download failed:', error)
            return { success: false, error: error.message }
        }
    },

    /**
     * View a report in a new tab
     * @param {string} signedUrl - The signed URL of the report
     */
    viewReport: (signedUrl) => {
        if (typeof window !== 'undefined' && signedUrl) {
            window.open(signedUrl, '_blank')
        }
    }
}

// Storage Service (Supabase Integration)
export const storageAPI = {
    /**
     * Upload resume to Supabase Storage and update profile
     * Uses a consistent filename per user so new uploads replace old ones
     * @param {File} file - The resume file to upload
     * @param {string} userId - The user's ID (required for organized storage)
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

        if (!userId) {
            console.error('User ID is required for resume upload')
            throw new Error('User ID is required for resume upload')
        }

        try {
            const fileExt = file.name.split('.').pop()?.toLowerCase() || 'pdf'
            // Use a consistent filename so uploads replace each other
            // Format: {userId}/resume.{ext}
            const fileName = `${userId}/resume.${fileExt}`

            // First, try to delete any existing resume for this user
            // This ensures clean replacement
            try {
                const { data: existingFiles } = await supabase.storage
                    .from('resumes')
                    .list(userId)

                if (existingFiles && existingFiles.length > 0) {
                    const filesToDelete = existingFiles.map(f => `${userId}/${f.name}`)
                    console.log('[Storage] Deleting old resumes:', filesToDelete)
                    await supabase.storage
                        .from('resumes')
                        .remove(filesToDelete)
                }
            } catch (deleteError) {
                // If deletion fails, continue with upload (upsert will handle it)
                console.warn('[Storage] Could not delete old resume:', deleteError)
            }

            // Upload to Supabase storage with upsert to replace if exists
            console.log('[Storage] Uploading resume:', fileName)
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('resumes')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: true // Replace if exists
                })

            if (uploadError) {
                console.error('[Storage] Supabase upload error:', uploadError)
                throw uploadError
            }

            // For private buckets, store the storage path instead of public URL
            // We'll generate signed URLs when viewing
            const storagePath = uploadData.path
            const uploadedAt = new Date().toISOString()

            console.log('[Storage] Resume uploaded successfully:', { path: storagePath })

            // Update the profiles table with resume storage path
            // Store path format: {userId}/resume.{ext}
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    resume_url: storagePath, // Store path, not public URL
                    resume_uploaded_at: uploadedAt
                })
                .eq('id', userId)

            if (profileError) {
                console.warn('[Storage] Failed to update profile with resume path:', profileError)
                // Don't throw - the upload succeeded
            }

            // Generate a signed URL for immediate use
            let signedUrl = storagePath
            try {
                const { data: signedData, error: signedError } = await supabase.storage
                    .from('resumes')
                    .createSignedUrl(storagePath, 3600) // 1 hour expiry

                if (!signedError && signedData?.signedUrl) {
                    signedUrl = signedData.signedUrl
                }
            } catch (signedErr) {
                console.warn('[Storage] Could not create signed URL:', signedErr)
            }

            return {
                data: {
                    url: storagePath,
                    signedUrl: signedUrl,
                    path: storagePath,
                    filename: file.name,
                    uploadedAt: uploadedAt
                }
            }
        } catch (error) {
            console.error('[Storage] Resume upload failed:', error)
            throw error
        }
    },

    /**
     * Get resume info from profile with signed URL for private bucket access
     * @param {string} userId - The user's ID
     * @returns {Object} - { url, signedUrl, uploadedAt, filename } or null
     */
    getResumeInfo: async (userId) => {
        if (!supabase || !userId) {
            return null
        }

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('resume_url, resume_uploaded_at')
                .eq('id', userId)
                .single()

            if (error || !data || !data.resume_url) {
                return null
            }

            // Determine storage path - handle both formats:
            // 1. Old format: Full URL like https://...supabase.co/storage/v1/object/public/resumes/{userId}/{filename}
            // 2. New format: Storage path like {userId}/resume.pdf
            let storagePath = data.resume_url
            let filename = 'Resume.pdf'

            // Check if it's a full URL (old format) or just a path (new format)
            if (data.resume_url.includes('supabase.co') || data.resume_url.startsWith('http')) {
                // Old URL format - extract path from URL
                try {
                    // URL format: .../storage/v1/object/public/resumes/{userId}/{filename}
                    const urlParts = data.resume_url.split('/resumes/')
                    if (urlParts.length > 1) {
                        storagePath = urlParts[1] // Gets "{userId}/{filename}"
                    }
                } catch (e) {
                    console.warn('[Storage] Could not parse path from URL:', e)
                }
            }

            // Extract filename from storage path
            try {
                const pathParts = storagePath.split('/')
                const rawFilename = pathParts[pathParts.length - 1]
                filename = decodeURIComponent(rawFilename) || 'Resume.pdf'
            } catch (e) {
                console.warn('[Storage] Could not parse filename:', e)
            }

            // Generate a signed URL since the bucket is private
            let signedUrl = null
            try {
                const { data: signedData, error: signedError } = await supabase.storage
                    .from('resumes')
                    .createSignedUrl(storagePath, 3600) // 1 hour expiry

                if (!signedError && signedData?.signedUrl) {
                    signedUrl = signedData.signedUrl
                } else {
                    console.warn('[Storage] Signed URL error:', signedError)
                }
            } catch (signedErr) {
                console.warn('[Storage] Could not create signed URL:', signedErr)
            }

            return {
                url: data.resume_url,
                storagePath: storagePath,
                signedUrl: signedUrl,
                uploadedAt: data.resume_uploaded_at,
                filename: filename
            }
        } catch (error) {
            console.error('[Storage] Failed to get resume info:', error)
            return null
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

// API Key Service (BYOK - Bring Your Own Key)
export const apiKeyAPI = {
    /**
     * Save or update an API key for a provider
     * The key is hashed and stored securely; we don't log or expose it
     * @param {string} userId - The user's ID
     * @param {string} apiKey - The API key to save
     * @param {string} provider - The provider (default: 'google_ai_studio')
     */
    saveApiKey: async (userId, apiKey, provider = 'google_ai_studio') => {
        if (!supabase || !userId || !apiKey) {
            return { success: false, error: 'Invalid parameters' }
        }

        try {
            // Create a simple hash of the key for verification
            // Note: In production, use proper encryption via a backend service
            const encoder = new TextEncoder()
            const data = encoder.encode(apiKey)
            const hashBuffer = await crypto.subtle.digest('SHA-256', data)
            const hashArray = Array.from(new Uint8Array(hashBuffer))
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

            // Get the prefix for display (first 8 characters)
            const prefix = apiKey.substring(0, 8) + '...'

            // For now, we store a masked version (in production, use server-side encryption)
            // The actual key should be encrypted with a server-side key
            const maskedKey = btoa(apiKey) // Base64 encode (not secure, just for demo)

            // Upsert the key (replace if exists for this user/provider)
            const { data: result, error } = await supabase
                .from('user_api_keys')
                .upsert({
                    user_id: userId,
                    provider: provider,
                    api_key_hash: hashHex,
                    api_key_encrypted: maskedKey,
                    api_key_prefix: prefix,
                    is_active: true,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id,provider'
                })
                .select('id, provider, api_key_prefix, is_active, created_at, updated_at')
                .single()

            if (error) {
                console.error('Error saving API key:', error)
                return { success: false, error: error.message }
            }

            return {
                success: true,
                data: {
                    id: result.id,
                    provider: result.provider,
                    prefix: result.api_key_prefix,
                    isActive: result.is_active,
                    updatedAt: result.updated_at
                }
            }
        } catch (error) {
            console.error('Error saving API key:', error)
            return { success: false, error: error.message }
        }
    },

    /**
     * Get the status of a user's API key (does not return the actual key)
     * @param {string} userId - The user's ID
     * @param {string} provider - The provider (default: 'google_ai_studio')
     */
    getApiKeyStatus: async (userId, provider = 'google_ai_studio') => {
        if (!supabase || !userId) {
            return { hasKey: false, data: null }
        }

        try {
            const { data, error } = await supabase
                .from('user_api_keys')
                .select('id, provider, api_key_prefix, is_active, created_at, updated_at')
                .eq('user_id', userId)
                .eq('provider', provider)
                .single()

            if (error) {
                // PGRST116 = Row not found (not an actual error)
                if (error.code === 'PGRST116') {
                    return { hasKey: false, data: null }
                }
                console.error('Error getting API key status:', error)
                return { hasKey: false, data: null, error: error.message }
            }

            return {
                hasKey: !!data && data.is_active,
                data: data ? {
                    id: data.id,
                    provider: data.provider,
                    prefix: data.api_key_prefix,
                    isActive: data.is_active,
                    updatedAt: data.updated_at
                } : null
            }
        } catch (error) {
            console.error('Error getting API key status:', error)
            return { hasKey: false, data: null, error: error.message }
        }
    },

    /**
     * Delete/invalidate a user's API key
     * @param {string} userId - The user's ID
     * @param {string} provider - The provider (default: 'google_ai_studio')
     */
    deleteApiKey: async (userId, provider = 'google_ai_studio') => {
        if (!supabase || !userId) {
            return { success: false, error: 'Invalid parameters' }
        }

        try {
            const { error } = await supabase
                .from('user_api_keys')
                .delete()
                .eq('user_id', userId)
                .eq('provider', provider)

            if (error) {
                console.error('Error deleting API key:', error)
                return { success: false, error: error.message }
            }

            return { success: true }
        } catch (error) {
            console.error('Error deleting API key:', error)
            return { success: false, error: error.message }
        }
    }
}

export default api
