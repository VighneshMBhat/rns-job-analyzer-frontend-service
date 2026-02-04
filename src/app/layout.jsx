import { AuthProvider } from '../context/AuthContext'
import './globals.css'

export const metadata = {
    title: 'Skill Gap & Job Trend Intelligence Platform',
    description: 'Analyze your skills against current market trends',
}

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body>
                <AuthProvider>
                    {children}
                </AuthProvider>
            </body>
        </html>
    )
}
