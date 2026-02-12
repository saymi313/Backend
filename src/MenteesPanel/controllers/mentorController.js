const mongoose = require('mongoose');
const MentorProfile = require('../../MentorPanel/models/MentorProfile');
const MentorService = require('../../MentorPanel/models/Service');
const Booking = require('../../shared/models/Booking');
const User = require('../../shared/models/User');
const MenteeProfile = require('../models/MenteeProfile');
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

    let query = {
      isActive: true
    };

    // Add filters that can be applied at the DB level (MentorProfile fields only)
    if (specialization) {
      query.specializations = { $in: [new RegExp(specialization, 'i')] };
    }

    // Note: country and name search are applied AFTER populate (see below)
    // because they live on the User document, not MentorProfile

    if (rating) {
      query.rating = { $gte: parseFloat(rating) };
    }

    if (search) {
      // Search MentorProfile-level fields at DB level
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { bio: { $regex: search, $options: 'i' } },
        { specializations: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Optimize query for landing page (small limits)
    const isSmallLimit = limit <= 10;

    // Fetch all mentors matching DB-level query
    let allMentors = await MentorProfile.find(query)
      .populate('userId', 'profile.firstName profile.lastName profile.avatar profile.country')
      .select('title rating totalReviews userId slug badge')
      .lean(); // Convert to plain JS objects for better performance

    // Post-populate filtering for User-level fields (name search & country)
    // These fields live on the User document, so we filter after populate
    if (search) {
      const searchLower = search.toLowerCase();
      // If the mentor already matched via DB-level $or (title/bio/specializations),
      // keep them. Also include mentors whose name matches the search term.
      // We re-fetch without the $or to get ALL active mentors, then filter by name.
      // Instead, we do a second query without $or and merge results.
      // Simpler approach: fetch all active mentors and filter everything in JS.
      const allActiveMentors = await MentorProfile.find({ isActive: true, ...(specialization ? { specializations: { $in: [new RegExp(specialization, 'i')] } } : {}), ...(rating ? { rating: { $gte: parseFloat(rating) } } : {}) })
        .populate('userId', 'profile.firstName profile.lastName profile.avatar profile.country')
        .select('title rating totalReviews userId slug badge')
        .lean();

      // Filter: match if name, title, bio, or specializations contain the search term
      allMentors = allActiveMentors.filter(mentor => {
        const firstName = (mentor.userId?.profile?.firstName || '').toLowerCase();
        const lastName = (mentor.userId?.profile?.lastName || '').toLowerCase();
        const fullName = `${firstName} ${lastName}`;
        const title = (mentor.title || '').toLowerCase();

        return fullName.includes(searchLower) ||
          firstName.includes(searchLower) ||
          lastName.includes(searchLower) ||
          title.includes(searchLower);
      });
    }

    if (country) {
      const countryRegex = new RegExp(country, 'i');
      allMentors = allMentors.filter(mentor => {
        const mentorCountry = mentor.userId?.profile?.country || '';
        return countryRegex.test(mentorCountry);
      });
    }

    // Define badge priority (higher number = higher priority)
    const badgePriority = {
      'Best Seller': 4,
      'Level 2 Seller': 3,
      'Level 1 Seller': 2,
      'Beginner': 1
    };

    // Sort by badge level (highest first), then by rating (highest first)
    allMentors.sort((a, b) => {
      const badgeA = badgePriority[a.badge] || badgePriority['Beginner'];
      const badgeB = badgePriority[b.badge] || badgePriority['Beginner'];

      // First sort by badge level (descending)
      if (badgeA !== badgeB) {
        return badgeB - badgeA;
      }

      // If badges are equal, sort by rating (descending)
      if (a.rating !== b.rating) {
        return b.rating - a.rating;
      }

      // If ratings are also equal, sort by total reviews (descending)
      return b.totalReviews - a.totalReviews;
    });

    // Apply pagination after sorting
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + (limit * 1);
    const mentors = allMentors.slice(startIndex, endIndex);

    // Always return pagination data
    const total = allMentors.length;
    const pagination = {
      current: parseInt(page),
      pages: Math.ceil(total / limit),
      total
    };

    return sendSuccessResponse(res, 'Mentors retrieved successfully', {
      mentors,
      pagination
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
      .select('-verificationDocuments')
      .lean(); // Convert to plain JS object for better performance

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

    // Add follower stats and status if user is logged in
    const followerCount = mentor.followers ? mentor.followers.length : 0;
    let isFollowing = false;

    if (req.user && req.user.role === 'mentee') {
      const menteeProfile = await MenteeProfile.findOne({ userId: req.user.id });
      if (menteeProfile && menteeProfile.following) {
        // Check if mentor's profile ID is in mentee's following list
        // Note: mentor._id is the profile ID
        isFollowing = menteeProfile.following.some(id => id.toString() === mentor._id.toString());
      }
    }

    // Attach to response (create a new object to avoid mutation issues)
    const mentorWithFollowStats = {
      ...mentor,
      followerCount,
      isFollowing
    };

    console.log('✅ Mentor retrieved successfully:', mentor.userId?.profile?.firstName);
    console.log(`📊 Services count: ${mentor.services?.length || 0}`);
    console.log(`👥 Follower count: ${followerCount}, Is Following: ${isFollowing}`);
    fs.appendFileSync('debug.txt', `Final services count: ${mentor.services?.length || 0}\n`);

    return sendSuccessResponse(res, 'Mentor retrieved successfully', { mentor: mentorWithFollowStats });
  } catch (error) {
    console.error('Get mentor by ID error:', error);
    return sendErrorResponse(res, 'Failed to retrieve mentor', 500);
  }
};

// Follow a mentor
const followMentor = async (req, res) => {
  try {
    const { id } = req.params; // Mentor Profile ID or Slug
    const menteeUserId = req.user.id;

    console.log(`👤 User ${menteeUserId} attempting to follow mentor ${id}`);

    // 1. Get Mentee Profile
    const menteeProfile = await MenteeProfile.findOne({ userId: menteeUserId });
    if (!menteeProfile) {
      return sendErrorResponse(res, 'Mentee profile not found', 404);
    }

    // 2. Get Mentor Profile
    let mentorQuery = {};
    if (/^[0-9a-fA-F]{24}$/.test(id)) {
      mentorQuery._id = id;
    } else {
      mentorQuery.slug = id;
    }

    const mentorProfile = await MentorProfile.findOne(mentorQuery);
    if (!mentorProfile) {
      return sendErrorResponse(res, 'Mentor profile not found', 404);
    }

    const mentorProfileId = mentorProfile._id;

    // 3. Check if already following
    if (menteeProfile.following.includes(mentorProfileId)) {
      return sendErrorResponse(res, 'You are already following this mentor', 400);
    }

    // 4. Update Mentee Profile (add to following)
    menteeProfile.following.push(mentorProfileId);
    await menteeProfile.save();

    // 5. Update Mentor Profile (add to followers)
    // Avoid duplicates in case of race conditions
    if (!mentorProfile.followers.includes(menteeUserId)) {
      mentorProfile.followers.push(menteeUserId);
      await mentorProfile.save();
    }

    console.log(`✅ User ${menteeUserId} successfully followed mentor ${mentorProfileId}`);

    return sendSuccessResponse(res, 'You are now following this mentor', {
      isFollowing: true,
      followerCount: mentorProfile.followers.length
    });
  } catch (error) {
    console.error('Follow mentor error:', error);
    return sendErrorResponse(res, 'Failed to follow mentor', 500);
  }
};

// Unfollow a mentor
const unfollowMentor = async (req, res) => {
  try {
    const { id } = req.params; // Mentor Profile ID or Slug
    const menteeUserId = req.user.id;

    console.log(`👤 User ${menteeUserId} attempting to unfollow mentor ${id}`);

    // 1. Get Mentee Profile
    const menteeProfile = await MenteeProfile.findOne({ userId: menteeUserId });
    if (!menteeProfile) {
      return sendErrorResponse(res, 'Mentee profile not found', 404);
    }

    // 2. Get Mentor Profile
    let mentorQuery = {};
    if (/^[0-9a-fA-F]{24}$/.test(id)) {
      mentorQuery._id = id;
    } else {
      mentorQuery.slug = id;
    }

    const mentorProfile = await MentorProfile.findOne(mentorQuery);
    if (!mentorProfile) {
      return sendErrorResponse(res, 'Mentor profile not found', 404);
    }

    const mentorProfileId = mentorProfile._id;

    // 3. Update Mentee Profile (remove from following)
    menteeProfile.following = menteeProfile.following.filter(
      id => id.toString() !== mentorProfileId.toString()
    );
    await menteeProfile.save();

    // 4. Update Mentor Profile (remove from followers)
    mentorProfile.followers = mentorProfile.followers.filter(
      id => id.toString() !== menteeUserId.toString()
    );
    await mentorProfile.save();

    console.log(`✅ User ${menteeUserId} successfully unfollowed mentor ${mentorProfileId}`);

    return sendSuccessResponse(res, 'You have unfollowed this mentor', {
      isFollowing: false,
      followerCount: mentorProfile.followers.length
    });
  } catch (error) {
    console.error('Unfollow mentor error:', error);
    return sendErrorResponse(res, 'Failed to unfollow mentor', 500);
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
      // Profile completion requirements
      specializations: { $exists: true, $ne: [] },
      education: { $exists: true, $ne: [] },
      experience: { $exists: true, $ne: [] },
      background: { $exists: true, $ne: null, $ne: '' }
    };

    // Add additional filters (DB-level only)
    if (specialization) {
      query.specializations = { $in: [new RegExp(specialization, 'i')] };
    }

    if (rating) {
      query.rating = { $gte: parseFloat(rating) };
    }

    // Fetch all matching mentors (we'll filter by name/country after populate)
    let allResults = await MentorProfile.find(query)
      .populate('userId', 'profile.firstName profile.lastName profile.avatar profile.country')
      .select('-verificationDocuments slug')
      .sort({ rating: -1, totalReviews: -1 })
      .lean();

    // Post-populate filtering: search by name, title, bio, specializations
    if (q) {
      const searchLower = q.toLowerCase();
      allResults = allResults.filter(mentor => {
        const firstName = (mentor.userId?.profile?.firstName || '').toLowerCase();
        const lastName = (mentor.userId?.profile?.lastName || '').toLowerCase();
        const fullName = `${firstName} ${lastName}`;
        const title = (mentor.title || '').toLowerCase();
        const bio = (mentor.bio || '').toLowerCase();
        const specs = (mentor.specializations || []).map(s => s.toLowerCase());

        return fullName.includes(searchLower) ||
          firstName.includes(searchLower) ||
          lastName.includes(searchLower) ||
          title.includes(searchLower) ||
          bio.includes(searchLower) ||
          specs.some(s => s.includes(searchLower));
      });
    }

    // Post-populate filtering: country
    if (country) {
      const countryRegex = new RegExp(country, 'i');
      allResults = allResults.filter(mentor => {
        const mentorCountry = mentor.userId?.profile?.country || '';
        return countryRegex.test(mentorCountry);
      });
    }

    // Apply pagination after filtering
    const total = allResults.length;
    const startIndex = (page - 1) * limit;
    const mentors = allResults.slice(startIndex, startIndex + (limit * 1));

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
      specializations: { $in: [new RegExp(specialization, 'i')] },
      // Profile completion requirements
      education: { $exists: true, $ne: [] },
      experience: { $exists: true, $ne: [] },
      background: { $exists: true, $ne: null, $ne: '' }
    };

    const mentors = await MentorProfile.find(query)
      .populate('userId', 'profile.firstName profile.lastName profile.avatar profile.country')
      .select('-verificationDocuments')
      .sort({ rating: -1, totalReviews: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

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
      totalReviews: { $gte: 5 },
      // Profile completion requirements
      specializations: { $exists: true, $ne: [] },
      education: { $exists: true, $ne: [] },
      experience: { $exists: true, $ne: [] },
      background: { $exists: true, $ne: null, $ne: '' }
    })
      .populate('userId', 'profile.firstName profile.lastName profile.avatar profile.country')
      .select('title rating totalReviews userId slug')
      .sort({ rating: -1, totalReviews: -1 })
      .limit(parseInt(limit))
      .lean();

    return sendSuccessResponse(res, 'Featured mentors retrieved successfully', { mentors });
  } catch (error) {
    console.error('Get featured mentors error:', error);
    return sendErrorResponse(res, 'Failed to retrieve featured mentors', 500);
  }
};

// Get students associated with a mentor (those who have booked sessions)
const getMentorStudents = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;

    console.log('🔍 Fetching students for mentor:', id);

    // 1. Get unique mentee IDs from bookings for this mentor
    // First, find the mentor's user ID if id is a profile ID or slug
    let mentorUserId = id;
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      const profile = await MentorProfile.findOne({ slug: id }).select('userId');
      if (profile) mentorUserId = profile.userId;
    } else {
      // Check if it's a profile ID instead of a user ID
      const profile = await MentorProfile.findById(id).select('userId');
      if (profile) mentorUserId = profile.userId;
    }

    // Find unique mentee IDs from bookings
    const menteeIds = await Booking.distinct('menteeId', {
      mentorId: mentorUserId,
      isActive: true,
      status: { $ne: 'cancelled' } // Only count non-cancelled bookings
    });

    if (!menteeIds || menteeIds.length === 0) {
      return sendSuccessResponse(res, 'No students found', {
        students: [],
        pagination: { current: parseInt(page), pages: 0, total: 0 }
      });
    }

    // 2. Fetch mentee profile details with pagination
    const students = await User.find({
      _id: { $in: menteeIds },
      role: 'mentee',
      isActive: true
    })
      .select('profile email createdAt')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await User.countDocuments({
      _id: { $in: menteeIds },
      role: 'mentee',
      isActive: true
    });

    return sendSuccessResponse(res, 'Mentor students retrieved successfully', {
      students,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get mentor students error:', error);
    return sendErrorResponse(res, 'Failed to retrieve mentor students', 500);
  }
};

// Get mentor followers
const getMentorFollowers = async (req, res) => {
  try {
    const { id } = req.params; // Mentor Id (could be User ID or Profile ID)
    const { page = 1, limit = 10 } = req.query;

    console.log('🔍 Fetching followers for mentor:', id);

    let mentorProfile;
    // Check if id is Profile ID or User ID
    // If it looks like an ObjectId, we need to check both
    if (/^[0-9a-fA-F]{24}$/.test(id)) {
      mentorProfile = await MentorProfile.findOne({
        $or: [{ _id: id }, { userId: id }]
      });
    } else {
      // Slug
      mentorProfile = await MentorProfile.findOne({ slug: id });
    }

    if (!mentorProfile) {
      return sendErrorResponse(res, 'Mentor not found', 404);
    }

    if (!mentorProfile.followers || mentorProfile.followers.length === 0) {
      return sendSuccessResponse(res, 'No followers found', {
        followers: [],
        pagination: { current: parseInt(page), pages: 0, total: 0 }
      });
    }

    const followerIds = mentorProfile.followers;

    console.log('📊 Total follower IDs in profile:', followerIds.length);
    console.log('Sample IDs:', followerIds.slice(0, 3));

    // Fetch followers using User.find (same pattern as students)
    const followers = await User.find({
      _id: { $in: followerIds },
      role: 'mentee'
      // Temporarily removed isActive filter for debugging
    })
      .select('profile email createdAt')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    console.log('👥 Followers WITH role=mentee filter:', followers.length);

    // Debug: check without role filter
    const testWithoutRole = await User.find({ _id: { $in: followerIds } }).select('role _id').lean();
    console.log('🔓 Users WITHOUT role filter:', testWithoutRole.length);
    if (testWithoutRole.length > 0) {
      console.log('Sample user:', testWithoutRole[0]);
    }
    console.log('=== FOLLOWERS DEBUG END ===');

    const total = await User.countDocuments({
      _id: { $in: followerIds },
      role: 'mentee'
    });

    return sendSuccessResponse(res, 'Mentor followers retrieved successfully', {
      followers,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Get mentor followers error:', error);
    return sendErrorResponse(res, 'Failed to retrieve mentor followers', 500);
  }
};

module.exports = {
  getAllMentors,
  getMentorById,
  searchMentors,
  getMentorsBySpecialization,
  getMentorSpecializations,
  getFeaturedMentors,
  getMentorStudents,
  followMentor,
  unfollowMentor,
  getMentorFollowers
};


