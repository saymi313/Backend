import api from '../utils/api';

// Service API endpoints
const serviceAPI = {
  // Mentee service discovery endpoints
  getAllServices: (params) => api.get('/mentees/services', { params }),
  getServiceById: (id) => api.get(`/mentees/services/${id}`),
  searchServices: (params) => api.get('/mentees/services/search', { params }),
  getServicesByCategory: (category, params) => api.get(`/mentees/services/category/${category}`, { params }),
  getServicesByMentor: (mentorId, params) => api.get(`/mentees/services/mentor/${mentorId}`, { params }),
  getServiceCategories: () => api.get('/mentees/services/meta/categories'),
  getFeaturedServices: (params) => api.get('/mentees/services/meta/featured', { params }),
  getPopularServices: (params) => api.get('/mentees/services/meta/popular', { params }),

  // Mentor service management endpoints
  createService: (serviceData) => {
    const formData = new FormData();
    
    // Add text fields
    Object.keys(serviceData).forEach(key => {
      if (key !== 'images' && serviceData[key] !== null && serviceData[key] !== undefined) {
        if (typeof serviceData[key] === 'object') {
          formData.append(key, JSON.stringify(serviceData[key]));
        } else {
          formData.append(key, serviceData[key]);
        }
      }
    });

    // Add images
    if (serviceData.images && serviceData.images.length > 0) {
      serviceData.images.forEach((image, index) => {
        if (image instanceof File) {
          formData.append('images', image);
        }
      });
    }

    return api.post('/mentors/services', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  getMyServices: (params) => api.get('/mentors/services', { params }),
  getMyServiceById: (id) => api.get(`/mentors/services/${id}`),
  updateService: (id, serviceData) => {
    const formData = new FormData();
    
    // Add text fields
    Object.keys(serviceData).forEach(key => {
      if (key !== 'images' && serviceData[key] !== null && serviceData[key] !== undefined) {
        if (typeof serviceData[key] === 'object') {
          formData.append(key, JSON.stringify(serviceData[key]));
        } else {
          formData.append(key, serviceData[key]);
        }
      }
    });

    // Add new images
    if (serviceData.images && serviceData.images.length > 0) {
      serviceData.images.forEach((image, index) => {
        if (image instanceof File) {
          formData.append('images', image);
        }
      });
    }

    return api.put(`/mentors/services/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  deleteService: (id) => api.delete(`/mentors/services/${id}`),
  uploadServiceImages: (id, images) => {
    const formData = new FormData();
    images.forEach(image => {
      if (image instanceof File) {
        formData.append('images', image);
      }
    });
    return api.post(`/mentors/services/${id}/images`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  removeServiceImage: (id, imageUrl) => api.delete(`/mentors/services/${id}/images`, { data: { imageUrl } }),
  getServiceStats: () => api.get('/mentors/services/stats'),
};

// Service categories
export const SERVICE_CATEGORIES = [
  'Study Abroad Guidance',
  'University Applications',
  'Visa Assistance',
  'Career Counseling',
  'Language Learning',
  'Academic Writing',
  'Research Guidance',
  'Interview Preparation',
  'Scholarship Guidance',
  'Cultural Orientation'
];

// Service status options
export const SERVICE_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

// Package types
export const PACKAGE_TYPES = {
  BASIC: 'Basic',
  STANDARD: 'Standard',
  PREMIUM: 'Premium'
};

// Service service class
class ServiceService {
  // Mentee service discovery methods
  async getAllServices(params = {}) {
    try {
      const response = await serviceAPI.getAllServices(params);
      return {
        success: true,
        data: response.data.data,
        pagination: response.data.pagination
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  async getServiceById(id) {
    try {
      const response = await serviceAPI.getServiceById(id);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  async searchServices(searchParams = {}) {
    try {
      const response = await serviceAPI.searchServices(searchParams);
      return {
        success: true,
        data: response.data.data,
        pagination: response.data.pagination,
        searchQuery: response.data.searchQuery
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  async getServicesByCategory(category, params = {}) {
    try {
      const response = await serviceAPI.getServicesByCategory(category, params);
      return {
        success: true,
        data: response.data.data,
        pagination: response.data.pagination,
        category: response.data.category
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  async getServicesByMentor(mentorId, params = {}) {
    try {
      const response = await serviceAPI.getServicesByMentor(mentorId, params);
      return {
        success: true,
        data: response.data.data,
        pagination: response.data.pagination,
        mentorId: response.data.mentorId
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  async getServiceCategories() {
    try {
      const response = await serviceAPI.getServiceCategories();
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  async getFeaturedServices(params = {}) {
    try {
      const response = await serviceAPI.getFeaturedServices(params);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  async getPopularServices(params = {}) {
    try {
      const response = await serviceAPI.getPopularServices(params);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Mentor service management methods
  async createService(serviceData) {
    try {
      const response = await serviceAPI.createService(serviceData);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  async getMyServices(params = {}) {
    try {
      const response = await serviceAPI.getMyServices(params);
      return {
        success: true,
        data: response.data.data,
        pagination: response.data.pagination
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  async getMyServiceById(id) {
    try {
      const response = await serviceAPI.getMyServiceById(id);
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  async updateService(id, serviceData) {
    try {
      const response = await serviceAPI.updateService(id, serviceData);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  async deleteService(id) {
    try {
      const response = await serviceAPI.deleteService(id);
      return {
        success: true,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  async uploadServiceImages(id, images) {
    try {
      const response = await serviceAPI.uploadServiceImages(id, images);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  async removeServiceImage(id, imageUrl) {
    try {
      const response = await serviceAPI.removeServiceImage(id, imageUrl);
      return {
        success: true,
        data: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  async getServiceStats() {
    try {
      const response = await serviceAPI.getServiceStats();
      return {
        success: true,
        data: response.data.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }
}

// Create and export service instance
const serviceService = new ServiceService();
export default serviceService;
