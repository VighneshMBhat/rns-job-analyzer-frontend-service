'use client'

import { useState, useEffect } from 'react'
import { reportAPI } from '../../../services/api'
import { useAuth } from '../../../context/AuthContext'
import './reports.css'

function ReportsPage() {
    const { user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [reports, setReports] = useState([])
    const [downloading, setDownloading] = useState(null)
    const [sending, setSending] = useState(null)
    const [sendSuccess, setSendSuccess] = useState('')
    const [sendError, setSendError] = useState('')

    useEffect(() => {
        const fetchReports = async () => {
            if (!user?.id) {
                setLoading(false)
                return
            }

            try {
                const response = await reportAPI.getReports(user.id)
                setReports(response.data || [])
            } catch (error) {
                console.error('Failed to fetch reports:', error)
            }
            setLoading(false)
        }

        fetchReports()
    }, [user?.id])

    const handleDownload = async (report) => {
        setDownloading(report.id)
        try {
            await reportAPI.downloadReport(report.filePath, report.filename)
        } catch (error) {
            console.error('Download failed:', error)
        }
        setDownloading(null)
    }

    const handleView = (report) => {
        if (report.signedUrl) {
            reportAPI.viewReport(report.signedUrl)
        }
    }

    const handleSendEmail = async (report) => {
        if (!user?.id || !user?.email) {
            setSendError('User email not found')
            return
        }

        setSending(report.id)
        setSendSuccess('')
        setSendError('')

        try {
            const result = await reportAPI.sendReportEmail(report.id, user.id, user.email)

            if (result.success) {
                setSendSuccess(result.message || `Report sent to ${user.email}`)
                // Update the report in local state to show email sent
                setReports(prev => prev.map(r =>
                    r.id === report.id
                        ? { ...r, emailSent: !result.pending, emailRecipient: user.email }
                        : r
                ))
            } else {
                setSendError(result.error || 'Failed to send email')
            }
        } catch (error) {
            setSendError('An error occurred. Please try again.')
        }

        setSending(null)

        // Clear messages after 5 seconds
        setTimeout(() => {
            setSendSuccess('')
            setSendError('')
        }, 5000)
    }

    // Format file size
    const formatFileSize = (bytes) => {
        if (!bytes || bytes === 0) return ''
        const kb = bytes / 1024
        if (kb < 1024) return `${kb.toFixed(1)} KB`
        return `${(kb / 1024).toFixed(1)} MB`
    }

    if (loading) {
        return (
            <div className="reports-loading">
                <div className="spinner"></div>
                <p>Loading reports...</p>
            </div>
        )
    }

    return (
        <div className="reports-page">
            {/* Header */}
            <div className="page-header">
                <div className="header-content">
                    <h1>My Reports</h1>
                    <p>View and download your skill gap analysis reports</p>
                </div>
            </div>

            {/* Alert Messages */}
            {sendSuccess && (
                <div className="reports-alert success animate-fadeIn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    {sendSuccess}
                </div>
            )}

            {sendError && (
                <div className="reports-alert error animate-fadeIn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {sendError}
                </div>
            )}

            {/* Reports List */}
            <div className="reports-container">
                {reports.length === 0 ? (
                    <div className="empty-state">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <path d="M14 2v6h6" />
                        </svg>
                        <h3>No reports available yet</h3>
                        <p>
                            Your skill gap analysis reports will appear here once generated.
                            Go to the Trends page and click "Start Skill Gap Analysis" to generate your first report.
                        </p>
                    </div>
                ) : (
                    <div className="reports-grid animate-fadeIn">
                        {reports.map((report) => (
                            <div key={report.id} className="report-card">
                                <div className="report-icon">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <path d="M14 2v6h6" />
                                        <path d="M16 13H8" />
                                        <path d="M16 17H8" />
                                        <path d="M10 9H8" />
                                    </svg>
                                </div>

                                <div className="report-info">
                                    <h3 title={report.filename}>{report.filename}</h3>
                                    <div className="report-metadata">
                                        <span className="report-date">
                                            {report.generatedAt ? new Date(report.generatedAt).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            }) : 'Unknown date'}
                                        </span>
                                        {report.fileSize > 0 && (
                                            <span className="report-size">
                                                {formatFileSize(report.fileSize)}
                                            </span>
                                        )}
                                        <span className="report-status status-completed">
                                            {report.status}
                                        </span>
                                    </div>
                                </div>

                                <div className="report-actions">
                                    {/* Send Email Button */}
                                    <button
                                        className={`btn btn-icon ${report.emailSent ? 'btn-ghost' : 'btn-primary-outline'}`}
                                        onClick={() => handleSendEmail(report)}
                                        disabled={sending === report.id || report.emailSent}
                                        title={report.emailSent ? `Already sent to ${report.emailRecipient || 'email'}` : 'Send to my email'}
                                    >
                                        {sending === report.id ? (
                                            <div className="spinner" style={{ width: 20, height: 20 }}></div>
                                        ) : report.emailSent ? (
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        ) : (
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M22 2L11 13" />
                                                <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                                            </svg>
                                        )}
                                    </button>

                                    {/* View Button */}
                                    <button
                                        className="btn btn-icon btn-ghost"
                                        onClick={() => handleView(report)}
                                        disabled={!report.signedUrl}
                                        title="View report"
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                    </button>

                                    {/* Download Button */}
                                    <button
                                        className="btn btn-icon btn-ghost"
                                        onClick={() => handleDownload(report)}
                                        disabled={downloading === report.id}
                                        title="Download report"
                                    >
                                        {downloading === report.id ? (
                                            <div className="spinner" style={{ width: 20, height: 20 }}></div>
                                        ) : (
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                <polyline points="7 10 12 15 17 10" />
                                                <line x1="12" y1="15" x2="12" y2="3" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

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
                    <h3>About Your Reports</h3>
                    <p>
                        Reports are generated when you run a skill gap analysis from the Trends page.
                        Each report compares your skills against current job market requirements
                        and provides personalized recommendations for improvement.
                    </p>
                    <p style={{ marginTop: '0.5rem' }}>
                        📧 <strong>Weekly Email Delivery:</strong> Your reports are automatically emailed to you every week.
                        Look for an email from <em>talentovision.info@gmail.com</em>.
                    </p>
                </div>
            </div>
        </div>
    )
}

export default ReportsPage
