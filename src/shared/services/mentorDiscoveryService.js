import api from '../utils/api';

// Mentor discovery API endpoints
const mentorDiscoveryAPI = {
  getAllMentors: (params) => api.get('/mentees/mentors', { params }),
  getMentorById: (id) => api.get(`/mentees/mentors/${id}`),
  searchMentors: (params) => api.get('/mentees/mentors/search', { params }),
  getMentorsBySpecialization: (specialization, params) => api.get(`/mentees/mentors/specialization/${specialization}`, { params }),
  getMentorSpecializations: () => api.get('/mentees/mentors/meta/specializations'),
  getFeaturedMentors: (params) => api.get('/mentees/mentors/meta/featured', { params }),
};

const mentorDiscoveryService = {
  // Get all mentors with filtering and pagination
  getAllMentors: async (params = {}) => {
    try {
      const response = await mentorDiscoveryAPI.getAllMentors(params);
      return { success: true, data: response.data.data, message: response.data.message };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || error.message || 'Failed to fetch mentors' };
    }
  },

  // Get mentor by ID (public profile)
  getMentorById: async (id) => {
    try {
      const response = await mentorDiscoveryAPI.getMentorById(id);
      return { success: true, data: response.data.data, message: response.data.message };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || error.message || 'Failed to fetch mentor' };
    }
  },

  // Search mentors
  searchMentors: async (searchParams = {}) => {
    try {
      const response = await mentorDiscoveryAPI.searchMentors(searchParams);
      return { success: true, data: response.data.data, message: response.data.message };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || error.message || 'Failed to search mentors' };
    }
  },

  // Get mentors by specialization
  getMentorsBySpecialization: async (specialization, params = {}) => {
    try {
      const response = await mentorDiscoveryAPI.getMentorsBySpecialization(specialization, params);
      return { success: true, data: response.data.data, message: response.data.message };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || error.message || 'Failed to fetch mentors by specialization' };
    }
  },

  // Get available specializations for filters
  getMentorSpecializations: async () => {
    try {
      const response = await mentorDiscoveryAPI.getMentorSpecializations();
      return { success: true, data: response.data.data, message: response.data.message };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || error.message || 'Failed to fetch specializations' };
    }
  },

  // Get featured mentors (top rated)
  getFeaturedMentors: async (params = {}) => {
    try {
      const response = await mentorDiscoveryAPI.getFeaturedMentors(params);
      return { success: true, data: response.data.data, message: response.data.message };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || error.message || 'Failed to fetch featured mentors' };
    }
  },
};

export default mentorDiscoveryService;
