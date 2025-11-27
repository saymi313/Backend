import { authAPI, setAuthToken, getAuthToken, clearAuth } from '../utils/api';

class AuthService {
  constructor() {
    this.currentUser = null;
    this.isAuthenticated = false;
    this.loadUserFromStorage();
  }

  // Load user data from localStorage on initialization
  loadUserFromStorage() {
    const token = getAuthToken();
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        this.currentUser = JSON.parse(userData);
        this.isAuthenticated = true;
        setAuthToken(token);
      } catch (error) {
('Error parsing user data from storage:', error);
        this.clearAuth();
      }
    }
  }

  // Register a new user (mentee or mentor)
  async register(userData) {
    try {
      const response = await authAPI.register(userData);
      
      // Check if response has the expected structure
      if (!response.data || !response.data.data) {
        throw new Error('Invalid response structure from server');
      }
      
      const { user, token } = response.data.data;
      
      // Validate user and token
      if (!user || !token) {
        throw new Error('Missing user data or token in response');
      }
      
      // Store user data and token
      this.currentUser = user;
      this.isAuthenticated = true;
      setAuthToken(token);
      localStorage.setItem('user', JSON.stringify(user));
      
      return {
        success: true,
        user,
        token,
        message: response.data.message
      };
    } catch (error) {
('Registration error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Login user
  async login(credentials) {
    try {
      const response = await authAPI.login(credentials);
      
      // Check if response has the expected structure
      if (!response.data || !response.data.data) {
        throw new Error('Invalid response structure from server');
      }
      
      const { user, token } = response.data.data;
      
      // Validate user and token
      if (!user || !token) {
        throw new Error('Missing user data or token in response');
      }
      
      // Store user data and token
      this.currentUser = user;
      this.isAuthenticated = true;
      setAuthToken(token);
      localStorage.setItem('user', JSON.stringify(user));
      
      return {
        success: true,
        user,
        token,
        message: response.data.message
      };
    } catch (error) {
('Login error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Register as mentor
  async mentorRegister(userData) {
    try {
      const response = await authAPI.mentorRegister(userData);
      const { user, token } = response.data.data;
      
      // Store user data and token
      this.currentUser = user;
      this.isAuthenticated = true;
      setAuthToken(token);
      localStorage.setItem('user', JSON.stringify(user));
      
      return {
        success: true,
        user,
        token,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Login as mentor
  async mentorLogin(credentials) {
    try {
      const response = await authAPI.mentorLogin(credentials);
      const { user, token } = response.data.data;
      
      // Store user data and token
      this.currentUser = user;
      this.isAuthenticated = true;
      setAuthToken(token);
      localStorage.setItem('user', JSON.stringify(user));
      
      return {
        success: true,
        user,
        token,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Admin login
  async adminLogin(credentials) {
    try {
      const response = await authAPI.adminLogin(credentials);
      const { user, token } = response.data.data;
      
      // Store user data and token
      this.currentUser = user;
      this.isAuthenticated = true;
      setAuthToken(token);
      localStorage.setItem('user', JSON.stringify(user));
      
      return {
        success: true,
        user,
        token,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get current user from server
  async getCurrentUser() {
    try {
      const response = await authAPI.getCurrentUser();
      const user = response.data.data.user;
      
      // Update stored user data
      this.currentUser = user;
      localStorage.setItem('user', JSON.stringify(user));
      
      return {
        success: true,
        user
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Logout user
  async logout() {
    try {
      // Call logout endpoint
      await authAPI.logout();
    } catch (error) {
('Logout API call failed:', error);
    } finally {
      // Clear local data regardless of API call result
      this.clearAuth();
    }
  }

  // Clear authentication data
  clearAuth() {
    this.currentUser = null;
    this.isAuthenticated = false;
    clearAuth();
  }

  // Check if user is authenticated
  isLoggedIn() {
    return this.isAuthenticated && this.currentUser !== null;
  }

  // Get current user
  getCurrentUserData() {
    return this.currentUser;
  }

  // Check if user has specific role
  hasRole(role) {
    return this.currentUser && this.currentUser.role === role;
  }

  // Check if user is mentee
  isMentee() {
    return this.hasRole('mentee');
  }

  // Check if user is mentor
  isMentor() {
    return this.hasRole('mentor');
  }

  // Check if user is admin
  isAdmin() {
    return this.hasRole('admin');
  }

  // Get user's full name
  getFullName() {
    if (!this.currentUser || !this.currentUser.profile) return '';
    const { firstName, lastName } = this.currentUser.profile;
    return `${firstName} ${lastName}`.trim();
  }

  // Get user's email
  getEmail() {
    return this.currentUser ? this.currentUser.email : '';
  }

  // Get user's role
  getRole() {
    return this.currentUser ? this.currentUser.role : null;
  }
}

// Create and export a singleton instance
const authService = new AuthService();
export default authService;
