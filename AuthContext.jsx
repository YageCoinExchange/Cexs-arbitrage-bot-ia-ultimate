"use client"

import { createContext, useState, useContext, useEffect } from "react"
import api from "../services/api"

const AuthContext = createContext()

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verificar si hay un token guardado
    const token = localStorage.getItem("token")
    const userData = localStorage.getItem("user")

    if (token && userData) {
      setCurrentUser(JSON.parse(userData))
      setIsAuthenticated(true)
      api.setAuthToken(token)
    }

    setLoading(false)
  }, [])

  const login = async (username, password) => {
    try {
      setLoading(true)
      const response = await api.post("/api/login", { username, password })

      const { token, user } = response.data

      localStorage.setItem("token", token)
      localStorage.setItem("user", JSON.stringify(user))

      setCurrentUser(user)
      setIsAuthenticated(true)
      api.setAuthToken(token)

      return { success: true }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Error de autenticación",
      }
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    setCurrentUser(null)
    setIsAuthenticated(false)
    api.removeAuthToken()
  }

  const value = {
    currentUser,
    isAuthenticated,
    loading,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>
}




