import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "../../../context/AuthContext"

export default function CTAButton({ className = "" }) {
  const navigate = useNavigate()
  const { isAuthenticated, user, logout } = useAuth()

  const handleSignOut = async () => {
    await logout()
    navigate('/mentees/login')
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {isAuthenticated ? (
        // User is logged in - show Sign Out button
        <>
          <button
            onClick={handleSignOut}
            className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-full transition-colors inline-block text-center mr-2"
          >
            Sign Out
          </button>
          <Link
            to="/mentees/profile"
            className="bg-white border border-[#5D38DE] text-[#5D38DE] hover:bg-[#f4f0ff] px-5 py-2 rounded-full transition-colors inline-block text-center"
          >
            Profile
          </Link>
        </>
      ) : (
        // User is not logged in - show Register button
        <>
          <Link
            to="/mentees/signup"
            className="bg-[#5D38DE] hover:bg-[#4A2BB8] text-white px-5 py-2 rounded-full transition-colors inline-block text-center mr-2"
          >
            Register
          </Link>
          <Link
            to="/mentees/login"
            className="bg-white border border-[#5D38DE] text-[#5D38DE] hover:bg-[#f4f0ff] px-5 py-2 rounded-full transition-colors inline-block text-center"
          >
            Login
          </Link>
        </>
      )}
    </div>
  )
}
