'use client'

import { useState, useEffect } from 'react'
import { reportAPI } from '../../../services/api'
import './reports.css'

function ReportsPage() {
    const [loading, setLoading] = useState(true)
    const [reports, setReports] = useState([])
    const [downloading, setDownloading] = useState(null)
    const [generating, setGenerating] = useState(false)

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const response = await reportAPI.getReports()
                setReports(response.data)
            } catch (error) {
                console.error('Failed to fetch reports:', error)
            }
            setLoading(false)
        }

        fetchReports()
    }, [])

    const handleDownload = async (reportId, filename) => {
        setDownloading(reportId)
        try {
            const response = await reportAPI.downloadReport(reportId)
            // Create a blob URL and trigger download
            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', filename)
            document.body.appendChild(link)
            link.click()
            link.remove()
        } catch (error) {
            console.error('Download failed:', error)
        }
        setDownloading(null)
    }

    const handleGenerateReport = async () => {
        setGenerating(true)
        try {
            await reportAPI.requestReport()
            // Optimistically add a pending report
            const newReport = {
                id: `temp-${Date.now()}`,
                filename: `skill_gap_report_${new Date().toISOString().split('T')[0]}.pdf`,
                generatedAt: new Date().toISOString(),
                status: 'pending',
                emailSent: false
            }
            setReports([newReport, ...reports])
        } catch (error) {
            console.error('Report generation failed:', error)
        }
        setGenerating(false)
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
                    <p>Access your historical analysis reports and insights</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={handleGenerateReport}
                    disabled={generating}
                >
                    {generating ? (
                        <>
                            <div className="spinner" style={{ width: 20, height: 20 }}></div>
                            Generating...
                        </>
                    ) : (
                        <>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <path d="M14 2v6h6" />
                                <path d="M12 18v-6" />
                                <path d="M9 15h6" />
                            </svg>
                            Generate New Report
                        </>
                    )}
                </button>
            </div>

            {/* Reports List */}
            <div className="reports-container">
                {reports.length === 0 ? (
                    <div className="empty-state">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <path d="M14 2v6h6" />
                        </svg>
                        <h3>No reports generated yet</h3>
                        <p>Generate your first skill gap analysis report to track your progress.</p>
                        <button className="btn btn-outline" onClick={handleGenerateReport}>
                            Generate Report
                        </button>
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
                                    <h3>{report.filename}</h3>
                                    <div className="report-metadata">
                                        <span className="report-date">
                                            {new Date(report.generatedAt).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </span>
                                        <span className={`report-status status-${report.status}`}>
                                            {report.status}
                                        </span>
                                    </div>
                                </div>

                                <div className="report-actions">
                                    <div className="email-status" title={report.emailSent ? `Sent to email at ${new Date(report.emailSentAt).toLocaleTimeString()}` : 'Email pending'}>
                                        {report.emailSent ? (
                                            <svg className="sent" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M22 2L11 13" />
                                                <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                                            </svg>
                                        ) : (
                                            <svg className="pending" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <circle cx="12" cy="12" r="10" />
                                                <path d="M12 6v6l4 2" />
                                            </svg>
                                        )}
                                    </div>

                                    <button
                                        className="btn btn-icon btn-ghost"
                                        onClick={() => handleDownload(report.id, report.filename)}
                                        disabled={report.status !== 'completed' || downloading === report.id}
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
                    <h3>Automated Reporting</h3>
                    <p>
                        Reports are automatically generated weekly based on your Notification preferences.
                        You can also manually generate a report at any time to see your latest analysis against
                        real-time market data.
                    </p>
                </div>
            </div>
        </div>
    )
}

export default ReportsPage
