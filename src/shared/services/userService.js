import api from '../utils/api';

// User profile API endpoints
const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  uploadAvatar: (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post('/users/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  deleteAvatar: () => api.delete('/users/avatar'),
  getUserById: (id) => api.get(`/users/${id}`),
};

const userService = {
  // Get current user profile
  getProfile: async () => {
    try {
      const response = await userAPI.getProfile();
      return { success: true, data: response.data.data, message: response.data.message };
    } catch (error) {
('Error fetching user profile:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.message || error.message || 'Failed to fetch profile' };
    }
  },

  // Update user profile
  updateProfile: async (profileData) => {
    try {
      const response = await userAPI.updateProfile(profileData);
      return { success: true, data: response.data.data, message: response.data.message };
    } catch (error) {
('Error updating user profile:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.message || error.message || 'Failed to update profile' };
    }
  },

  // Upload avatar
  uploadAvatar: async (file) => {
    try {
      const response = await userAPI.uploadAvatar(file);
      return { success: true, data: response.data.data, message: response.data.message };
    } catch (error) {
('Error uploading avatar:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.message || error.message || 'Failed to upload avatar' };
    }
  },

  // Delete avatar
  deleteAvatar: async () => {
    try {
      const response = await userAPI.deleteAvatar();
      return { success: true, data: response.data.data, message: response.data.message };
    } catch (error) {
('Error deleting avatar:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.message || error.message || 'Failed to delete avatar' };
    }
  },

  // Get user by ID (public profile)
  getUserById: async (id) => {
    try {
      const response = await userAPI.getUserById(id);
      return { success: true, data: response.data.data, message: response.data.message };
    } catch (error) {
('Error fetching user by ID:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.message || error.message || 'Failed to fetch user' };
    }
  },
};

export default userService;
