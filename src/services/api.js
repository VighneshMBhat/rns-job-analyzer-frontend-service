import axios from 'axios'
import { createClient } from '@supabase/supabase-js'

// --- Configuration ---
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const AWS_LAMBDA_AUTH_URL = process.env.NEXT_PUBLIC_AWS_LAMBDA_AUTH_URL

// --- Supabase Client ---
export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null

// --- Axios Instance ---
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
})

// Add request interceptor to attach token
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const user = JSON.parse(localStorage.getItem('user'))
        if (user?.token) {
            config.headers.Authorization = `Bearer ${user.token}`
        }
    }
    return config
})

// --- API Services ---

// Auth Service
export const authAPI = {
    login: async (credentials) => {
        // Option 1: AWS Lambda Auth (Priority if configured)
        if (AWS_LAMBDA_AUTH_URL) {
            try {
                const response = await axios.post(`${AWS_LAMBDA_AUTH_URL}/login`, credentials)
                return response
            } catch (error) {
                console.warn('AWS Lambda login failed, falling back to mock/local', error)
            }
        }

        // Option 2: Mock/Local Fallback
        await new Promise(resolve => setTimeout(resolve, 1000))
        if (credentials.email === 'test@example.com' && credentials.password === 'password') {
            return {
                data: {
                    token: 'mock-jwt-token-aws-style',
                    user: {
                        id: '1',
                        fullName: 'Alex Developer',
                        email: 'test@example.com',
                        targetRole: 'Machine Learning Engineer',
                        experienceLevel: 'mid'
                    }
                }
            }
        }
        throw new Error('Invalid credentials')
    },

    signup: async (data) => {
        if (AWS_LAMBDA_AUTH_URL) {
            return await axios.post(`${AWS_LAMBDA_AUTH_URL}/signup`, data)
        }

        // Mock signup
        await new Promise(resolve => setTimeout(resolve, 1000))
        return {
            data: {
                token: 'mock-jwt-token',
                user: {
                    id: '2',
                    ...data
                }
            }
        }
    },

    updateProfile: async (data) => {
        // Simulate API call
        return api.put('/users/profile', data).catch(() => {
            // Fallback for demo
            return { data: { success: true } }
        })
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
    uploadResume: async (file) => {
        // Use Supabase Storage if configured
        if (supabase) {
            try {
                const fileExt = file.name.split('.').pop()
                const fileName = `${Math.random()}.${fileExt}`
                const filePath = `${fileName}`

                const { data, error } = await supabase.storage
                    .from('resumes')
                    .upload(filePath, file)

                if (error) throw error

                return {
                    data: {
                        url: data.path, // In real app, generate public URL or signed URL
                        filename: file.name
                    }
                }
            } catch (error) {
                console.error('Supabase upload failed:', error)
                // Fallthrough to mock
            }
        }

        // Mock Fallback
        await new Promise(resolve => setTimeout(resolve, 1500))
        return {
            data: {
                url: `https://storage.mock.com/resumes/${file.name}`,
                filename: file.name
            }
        }
    }
}

export default api
