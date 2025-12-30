const MentorService = require('../../MentorPanel/models/Service');
const MentorProfile = require('../../MentorPanel/models/MentorProfile');
const { sendSuccessResponse, sendErrorResponse } = require('../../shared/utils/helpers/responseHelpers');
const { sanitizeSlug, sanitizeObjectId } = require('../../shared/utils/helpers/sanitization');

const parseTagFilters = (value) => {
  if (!value) {
    return [];
  }

  const normalize = (input) => String(input).trim();

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') {
          return normalize(item);
        }
        return normalize(item);
      })
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => normalize(item)).filter(Boolean);
      }
    } catch (error) {
      // Not JSON, fall through to comma split
    }

    return trimmed
      .split(',')
      .map((item) => normalize(item))
      .filter(Boolean);
  }

  return [normalize(value)];
};

const buildTagFilter = (educationLevel, tags) => {
  const filters = new Set();

  parseTagFilters(educationLevel).forEach((item) => filters.add(item));
  parseTagFilters(tags).forEach((item) => filters.add(item));

  return Array.from(filters);
};

// Get all approved services
const getAllMentorServices = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      minPrice,
      maxPrice,
      rating,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      educationLevel,
      tags
    } = req.query;

    // Build query
    const query = {
      status: 'approved',
      isActive: true
    };

    // Add filters
    if (category) {
      query.category = category;
    }

    if (rating) {
      query.rating = { $gte: parseFloat(rating) };
    }

    const tagFilters = buildTagFilter(educationLevel, tags)
    if (tagFilters.length > 0) {
      query.tags = { $in: tagFilters };
    }

    // Price filter (if packages have price information)
    if (minPrice || maxPrice) {
      const priceFilter = {};
      if (minPrice) priceFilter.$gte = parseFloat(minPrice);
      if (maxPrice) priceFilter.$lte = parseFloat(maxPrice);
      query['packages.price'] = priceFilter;
    }

    // Sort options
    const sortOptions = {};
    if (sortBy === 'rating') {
      sortOptions.rating = sortOrder === 'desc' ? -1 : 1;
    } else if (sortBy === 'price') {
      sortOptions['packages.price'] = sortOrder === 'desc' ? -1 : 1;
    } else {
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    }

    const services = await MentorService.find(query)
      .populate('mentorId', 'profile firstName lastName')
      .populate('mentorProfile', 'slug')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await MentorService.countDocuments(query);

    return sendSuccessResponse(res, 'MentorServices retrieved successfully', {
      services,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    return sendErrorResponse(res, 'Failed to retrieve services', 500);
  }
};

// Get service by ID
const getMentorServiceById = async (req, res) => {
  try {
    const { id } = req.params;

    const service = await MentorService.findOne({
      _id: id,
      status: 'approved',
      isActive: true
    }).populate('mentorId', 'profile firstName lastName');

    if (!service) {
      return sendErrorResponse(res, 'MentorService not found', 404);
    }

    // Get feedback count for the service
    const ServiceFeedback = require('../../shared/models/ServiceFeedback');
    const feedbackCount = await ServiceFeedback.countDocuments({
      serviceId: id,
      isActive: true
    });

    // Get MentorProfile ID for navigation
    const mentorProfile = await MentorProfile.findOne({ userId: service.mentorId._id }).select('_id');

    // Convert service to object and add feedback count and mentorProfileId
    const serviceObject = service.toObject();
    serviceObject.feedbackCount = feedbackCount;
    serviceObject.mentorProfileId = mentorProfile ? mentorProfile._id : null;

    return sendSuccessResponse(res, 'MentorService retrieved successfully', {
      service: serviceObject
    });
  } catch (error) {
    console.error('Error getting service by ID:', error);
    return sendErrorResponse(res, 'Failed to retrieve service', 500);
  }
};

// Search services
const searchMentorServices = async (req, res) => {
  try {
    const {
      q,
      category,
      minPrice,
      maxPrice,
      rating,
      location,
      educationLevel,
      tags,
      page = 1,
      limit = 12,
      sortBy = 'relevance',
      sortOrder = 'desc'
    } = req.query;

    // Build search query
    const searchQuery = {
      status: 'approved',
      isActive: true
    };

    // Text search
    if (q) {
      searchQuery.$text = { $search: q };
    }

    // Category filter
    if (category) {
      searchQuery.category = category;
    }

    // Rating filter
    if (rating) {
      searchQuery.rating = { $gte: parseFloat(rating) };
    }

    const tagFilters = buildTagFilter(educationLevel, tags)
    if (tagFilters.length > 0) {
      searchQuery.tags = { $in: tagFilters };
    }

    // Price filter
    if (minPrice || maxPrice) {
      const priceFilter = {};
      if (minPrice) priceFilter.$gte = parseFloat(minPrice);
      if (maxPrice) priceFilter.$lte = parseFloat(maxPrice);
      searchQuery['packages.price'] = priceFilter;
    }

    // Location filter
    if (location) {
      searchQuery['location.country'] = new RegExp(location, 'i');
    }

    // Sort options
    let sortOptions = {};
    if (sortBy === 'relevance' && q) {
      sortOptions = { score: { $meta: 'textScore' } };
    } else if (sortBy === 'rating') {
      sortOptions.rating = sortOrder === 'desc' ? -1 : 1;
    } else if (sortBy === 'price') {
      sortOptions['packages.price'] = sortOrder === 'desc' ? -1 : 1;
    } else {
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    }

    const services = await MentorService.find(searchQuery)
      .populate('mentorId', 'profile firstName lastName')
      .populate('mentorProfile', 'slug') // Get slug
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await MentorService.countDocuments(searchQuery);

    return sendSuccessResponse(res, 'Search results retrieved successfully', {
      services,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      },
      searchQuery: {
        q,
        category,
        minPrice,
        maxPrice,
        rating,
        location,
        educationLevel: tagFilters
      }
    });
  } catch (error) {
    return sendErrorResponse(res, 'Failed to search services', 500);
  }
};

// Get services by category
const getMentorServicesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 12, sortBy = 'rating', sortOrder = 'desc' } = req.query;

    const query = {
      category,
      status: 'approved',
      isActive: true
    };

    // Sort options
    const sortOptions = {};
    if (sortBy === 'rating') {
      sortOptions.rating = sortOrder === 'desc' ? -1 : 1;
    } else if (sortBy === 'price') {
      sortOptions['packages.price'] = sortOrder === 'desc' ? -1 : 1;
    } else {
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    }

    const services = await MentorService.find(query)
      .populate('mentorId', 'profile firstName lastName')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await MentorService.countDocuments(query);

    return sendSuccessResponse(res, 'MentorServices by category retrieved successfully', {
      services,
      category,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    return sendErrorResponse(res, 'Failed to retrieve services by category', 500);
  }
};

// Get services by mentor
const getMentorServicesByMentor = async (req, res) => {
  try {
    const { mentorId } = req.params;
    const { page = 1, limit = 12 } = req.query;

    const query = {
      mentorId,
      status: 'approved',
      isActive: true
    };

    const services = await MentorService.find(query)
      .populate('mentorId', 'profile firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await MentorService.countDocuments(query);

    return sendSuccessResponse(res, 'Mentor services retrieved successfully', {
      services,
      mentorId,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    return sendErrorResponse(res, 'Failed to retrieve mentor services', 500);
  }
};

// Get service categories
const getMentorServiceCategories = async (req, res) => {
  try {
    const categories = await MentorService.distinct('category', {
      status: 'approved',
      isActive: true
    });

    return sendSuccessResponse(res, 'Categories retrieved successfully', { categories });
  } catch (error) {
    return sendErrorResponse(res, 'Failed to retrieve categories', 500);
  }
};

// Get featured services
const getFeaturedMentorServices = async (req, res) => {
  try {
    const { limit = 6 } = req.query;

    const services = await MentorService.find({
      status: 'approved',
      isActive: true,
      rating: { $gte: 4.0 }
    })
      .populate('mentorId', 'profile firstName lastName')
      .populate('mentorProfile', 'slug')
      .sort({ rating: -1, totalReviews: -1 })
      .limit(parseInt(limit));

    return sendSuccessResponse(res, 'Featured services retrieved successfully', { services });
  } catch (error) {
    return sendErrorResponse(res, 'Failed to retrieve featured services', 500);
  }
};

// Get popular services
const getPopularMentorServices = async (req, res) => {
  try {
    const { limit = 8 } = req.query;

    const services = await MentorService.find({
      status: 'approved',
      isActive: true
    })
      .populate('mentorId', 'profile firstName lastName')
      .populate('mentorProfile', 'slug')
      .sort({ totalReviews: -1, rating: -1 })
      .limit(parseInt(limit));

    return sendSuccessResponse(res, 'Popular services retrieved successfully', { services });
  } catch (error) {
    return sendErrorResponse(res, 'Failed to retrieve popular services', 500);
  }
};

// Get service by Mentor Slug and Service Slug
const getServiceByMentorAndSlug = async (req, res) => {
  try {
    const { mentorSlug, serviceSlug } = req.params;
    console.log(`🔍 Fetching service: ${serviceSlug} for mentor: ${mentorSlug}`);

    // Sanitize slug inputs to prevent injection
    const sanitizedMentorSlug = sanitizeSlug(mentorSlug);
    const sanitizedServiceSlug = sanitizeSlug(serviceSlug);

    // 1. Find Mentor by Slug
    const mentor = await MentorProfile.findOne({ slug: sanitizedMentorSlug }).select('userId');
    if (!mentor) {
      console.log('❌ Mentor not found for slug:', sanitizedMentorSlug);
      return sendErrorResponse(res, 'Mentor not found', 404);
    }

    // 2. Find Service by Slug and Mentor ID
    const service = await MentorService.findOne({
      slug: sanitizedServiceSlug,
      mentorId: mentor.userId,
      status: 'approved',
      isActive: true
    }).populate('mentorId', 'profile firstName lastName');

    if (!service) {
      console.log('❌ Service not found:', serviceSlug);
      return sendErrorResponse(res, 'Service not found', 404);
    }

    // Get feedback count
    const ServiceFeedback = require('../../shared/models/ServiceFeedback');
    const feedbackCount = await ServiceFeedback.countDocuments({
      serviceId: service._id,
      isActive: true
    });

    // Get MentorProfile ID for navigation
    const mentorProfile = await MentorProfile.findOne({ userId: service.mentorId._id }).select('_id slug');

    const serviceObject = service.toObject();
    serviceObject.feedbackCount = feedbackCount;
    serviceObject.mentorProfileId = mentorProfile ? mentorProfile._id : null;
    serviceObject.mentorSlug = mentorProfile ? mentorProfile.slug : null;

    return sendSuccessResponse(res, 'Service retrieved successfully', {
      service: serviceObject
    });
  } catch (error) {
    console.error('Error getting service by slugs:', error);

    // Handle validation errors with 400 Bad Request
    if (error.message && error.message.startsWith('Invalid')) {
      return sendErrorResponse(res, error.message, 400);
    }

    return sendErrorResponse(res, 'Failed to retrieve service', 500);
  }
};

module.exports = {
  getAllMentorServices,
  getMentorServiceById,
  searchMentorServices,
  getMentorServicesByCategory,
  getMentorServicesByMentor,
  getMentorServiceCategories,
  getFeaturedMentorServices,
  getPopularMentorServices,
  getServiceByMentorAndSlug
};
