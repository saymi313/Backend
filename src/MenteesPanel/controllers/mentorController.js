const mongoose = require('mongoose');
const MentorProfile = require('../../MentorPanel/models/MentorProfile');
const MentorService = require('../../MentorPanel/models/Service');
const { sendSuccessResponse, sendErrorResponse } = require('../../shared/utils/helpers/responseHelpers');
const { sanitizeSlug, sanitizeObjectId, sanitizeSearchQuery } = require('../../shared/utils/helpers/sanitization');

// Get all verified mentors (public)
const getAllMentors = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      specialization,
      country,
      rating,
      search
    } = req.query;

    let query = { isActive: true, isVerified: true };

    // Add filters
    if (specialization) {
      query.specializations = { $in: [new RegExp(specialization, 'i')] };
    }

    if (country) {
      query['userId.profile.country'] = new RegExp(country, 'i');
    }

    if (rating) {
      query.rating = { $gte: parseFloat(rating) };
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { bio: { $regex: search, $options: 'i' } },
        { specializations: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Optimize query for landing page (small limits)
    const isSmallLimit = limit <= 10;

    const mentors = await MentorProfile.find(query)
      .populate('userId', 'profile.firstName profile.lastName profile.avatar profile.country')
      .select('title rating totalReviews userId slug')
      .lean() // Convert to plain JS objects for better performance
      .sort({ rating: -1, totalReviews: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Skip count query for small limits (landing page optimization)
    let total = 0;
    let pagination = null;

    if (!isSmallLimit) {
      total = await MentorProfile.countDocuments(query);
      pagination = {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      };
    }

    return sendSuccessResponse(res, 'Mentors retrieved successfully', {
      mentors,
      ...(pagination && { pagination })
    });
  } catch (error) {
    console.error('Get all mentors error:', error);
    return sendErrorResponse(res, 'Failed to retrieve mentors', 500);
  }
};

// Get mentor by ID (public profile)
const getMentorById = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🔍 Fetching mentor profile for:', id);

    let query = { isActive: true };

    // Check if id is a valid ObjectId
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id); if (isValidObjectId) {
      query._id = id;
    } else {
      query.slug = id;
    }

    let mentor = await MentorProfile.findOne(query)
      .populate('userId', 'profile.firstName profile.lastName profile.avatar profile.country email')
      .populate('connections', 'profile.firstName profile.lastName profile.avatar email')
      .populate('services')
      .select('-verificationDocuments');

    if (!mentor) {
      console.log('❌ Mentor not found');
      return sendErrorResponse(res, 'Mentor not found', 404);
    }

    // Safety check for userId
    if (!mentor.userId) {
      console.error('❌ Mentor found but userId is missing/null:', mentor._id);
      return sendErrorResponse(res, 'Mentor user data not found', 404);
    }

    const fs = require('fs');
    try {
      // debug logging (optional, wrap in try-catch to avoid crashing if FS fails)
      // fs.appendFileSync('debug.txt', `\n=== ${new Date().toISOString()} ===\n`);
      // fs.appendFileSync('debug.txt', `Mentor ID: ${id}\n`);
      // fs.appendFileSync('debug.txt', `User ID: ${mentor.userId._id}\n`);
    } catch (e) { }

    // Always fetch fresh services by mentorId to ensure data consistency
    console.log('📋 Fetching fresh services by mentorId...');

    const services = await MentorService.find({
      mentorId: mentor.userId._id,
      isActive: true,
      status: 'approved'
    }).sort({ createdAt: -1 });

    // Check for services potentially linked to Profile ID instead of User ID
    const servicesByProfileId = await MentorService.countDocuments({
      mentorId: mentor._id,
      isActive: true,
      status: 'approved'
    });
    console.log(`🔍 Check: Found ${servicesByProfileId} services linked to ProfileID instead of UserID`);
    fs.appendFileSync('debug.txt', `Check: Found ${servicesByProfileId} services linked to ProfileID instead of UserID\n`);

    fs.appendFileSync('debug.txt', `Found ${services.length} services\n`);
    services.forEach(s => fs.appendFileSync('debug.txt', `  - ${s.title}\n`));

    // Convert to object if it's a mongoose document (though it should be already if populated)
    if (mentor.toObject) {
      mentor = mentor.toObject();
    }
    mentor.services = services;
    console.log(`✅ Attached ${services.length} fresh services to response`);

    console.log('✅ Mentor retrieved successfully:', mentor.userId?.profile?.firstName);
    console.log(`📊 Services count: ${mentor.services?.length || 0}`);
    fs.appendFileSync('debug.txt', `Final services count: ${mentor.services?.length || 0}\n`);

    return sendSuccessResponse(res, 'Mentor retrieved successfully', { mentor });
  } catch (error) {
    console.error('Get mentor by ID error:', error);
    try {
      require('fs').appendFileSync('debug.txt', `ERROR: ${error.message}\n`);
    } catch (e) { console.error('Error writing to debug file', e); }
    return sendErrorResponse(res, 'Failed to retrieve mentor', 500);
  }
};

// Search mentors
const searchMentors = async (req, res) => {
  try {
    const {
      q,
      page = 1,
      limit = 12,
      specialization,
      country,
      rating
    } = req.query;

    if (!q) {
      return sendErrorResponse(res, 'Search query is required', 400);
    }

    let query = {
      isActive: true,
      isVerified: true,
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { bio: { $regex: q, $options: 'i' } },
        { specializations: { $in: [new RegExp(q, 'i')] } }
      ]
    };

    // Add additional filters
    if (specialization) {
      query.specializations = { $in: [new RegExp(specialization, 'i')] };
    }

    if (country) {
      query['userId.profile.country'] = new RegExp(country, 'i');
    }

    if (rating) {
      query.rating = { $gte: parseFloat(rating) };
    }

    const mentors = await MentorProfile.find(query)
      .populate('userId', 'profile.firstName profile.lastName profile.avatar profile.country')
      .select('-verificationDocuments slug')
      .sort({ rating: -1, totalReviews: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await MentorProfile.countDocuments(query);

    return sendSuccessResponse(res, 'Search results retrieved successfully', {
      mentors,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      },
      searchQuery: q
    });
  } catch (error) {
    console.error('Search mentors error:', error);
    return sendErrorResponse(res, 'Failed to search mentors', 500);
  }
};

// Get mentors by specialization
const getMentorsBySpecialization = async (req, res) => {
  try {
    const { specialization } = req.params;
    const { page = 1, limit = 12 } = req.query;

    const query = {
      isActive: true,
      isVerified: true,
      specializations: { $in: [new RegExp(specialization, 'i')] }
    };

    const mentors = await MentorProfile.find(query)
      .populate('userId', 'profile.firstName profile.lastName profile.avatar profile.country')
      .select('-verificationDocuments')
      .sort({ rating: -1, totalReviews: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await MentorProfile.countDocuments(query);

    return sendSuccessResponse(res, 'Mentors by specialization retrieved successfully', {
      mentors,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      },
      specialization
    });
  } catch (error) {
    console.error('Get mentors by specialization error:', error);
    return sendErrorResponse(res, 'Failed to retrieve mentors by specialization', 500);
  }
};

// Get mentor specializations (for filters)
const getMentorSpecializations = async (req, res) => {
  try {
    const specializations = await MentorProfile.aggregate([
      { $match: { isActive: true, isVerified: true } },
      { $unwind: '$specializations' },
      { $group: { _id: '$specializations', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    return sendSuccessResponse(res, 'Specializations retrieved successfully', {
      specializations: specializations.map(s => ({ name: s._id, count: s.count }))
    });
  } catch (error) {
    console.error('Get mentor specializations error:', error);
    return sendErrorResponse(res, 'Failed to retrieve specializations', 500);
  }
};

// Get featured mentors (top rated)
const getFeaturedMentors = async (req, res) => {
  try {
    const { limit = 6 } = req.query;

    const mentors = await MentorProfile.find({
      isActive: true,
      isVerified: true,
      rating: { $gte: 4.0 },
      totalReviews: { $gte: 5 }
    })
      .populate('userId', 'profile.firstName profile.lastName profile.avatar profile.country')
      .select('-verificationDocuments slug')
      .sort({ rating: -1, totalReviews: -1 })
      .limit(parseInt(limit));

    return sendSuccessResponse(res, 'Featured mentors retrieved successfully', { mentors });
  } catch (error) {
    console.error('Get featured mentors error:', error);
    return sendErrorResponse(res, 'Failed to retrieve featured mentors', 500);
  }
};

module.exports = {
  getAllMentors,
  getMentorById,
  searchMentors,
  getMentorsBySpecialization,
  getMentorSpecializations,
  getFeaturedMentors
};


