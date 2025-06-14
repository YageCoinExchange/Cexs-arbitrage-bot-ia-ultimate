// ========== CLIENTE API MÓVIL ==========
class MobileAPIClient {
  constructor() {
    this.baseURL = window.location.origin
    this.token = localStorage.getItem("authToken")
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}/api${endpoint}`
    const config = {
      headers: {
        "Content-Type": "application/json",
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
      ...options,
    }

    try {
      const response = await fetch(url, config)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Error en la solicitud")
      }

      return data
    } catch (error) {
      console.error("API Error:", error)
      throw error
    }
  }

  // Métodos específicos
  async getStatus() {
    return this.request("/status")
  }

  async getOpportunities() {
    return this.request("/opportunities")
  }

  async getBalances() {
    return this.request("/balances")
  }

  async startBot() {
    return this.request("/start", { method: "POST" })
  }

  async stopBot() {
    return this.request("/stop", { method: "POST" })
  }

  async executeOpportunity(opportunityId) {
    return this.request("/execute-opportunity", {
      method: "POST",
      body: JSON.stringify({ opportunityId }),
    })
  }

  async getReport() {
    return this.request("/report")
  }

  // Método para actualizar token
  setToken(token) {
    this.token = token
    localStorage.setItem("authToken", token)
  }

  // Método para limpiar token
  clearToken() {
    this.token = null
    localStorage.removeItem("authToken")
  }
}

// Exportar para uso global
window.MobileAPIClient = MobileAPIClient
