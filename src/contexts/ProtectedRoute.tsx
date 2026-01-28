import { Navigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) return <div style={{ padding: 24 }}>Loading...</div>
  if (!session) return <Navigate to="/academy/login" replace />

  return <>{children}</>
}