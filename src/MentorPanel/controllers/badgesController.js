const MentorProfile = require('../models/MentorProfile');
const Booking = require('../../shared/models/Booking');
const { sendSuccessResponse, sendErrorResponse } = require('../../shared/utils/helpers/responseHelpers');

// Badge thresholds
const BADGE_THRESHOLDS = {
  'Beginner': 0,
  'Level 1 Seller': 5,
  'Level 2 Seller': 20,
  'Best Seller': 50
};

// Badge descriptions
const BADGE_DESCRIPTIONS = {
  'Beginner': 'Start your journey as a mentor. Complete your first booking to unlock the next level!',
  'Level 1 Seller': 'You\'ve completed 5+ bookings. Keep up the great work!',
  'Level 2 Seller': 'Outstanding! You\'ve completed 20+ bookings. You\'re becoming a trusted mentor.',
  'Best Seller': 'Elite mentor status! You\'ve completed 50+ bookings. You\'re among the top mentors on the platform.'
};

/**
 * Calculate badge based on completed bookings count
 */
const calculateBadge = (completedBookingsCount) => {
  if (completedBookingsCount >= BADGE_THRESHOLDS['Best Seller']) {
    return 'Best Seller';
  } else if (completedBookingsCount >= BADGE_THRESHOLDS['Level 2 Seller']) {
    return 'Level 2 Seller';
  } else if (completedBookingsCount >= BADGE_THRESHOLDS['Level 1 Seller']) {
    return 'Level 1 Seller';
  }
  return 'Beginner';
};

/**
 * Get next badge and progress information
 */
const getNextBadgeInfo = (currentBadge, completedBookingsCount) => {
  const badges = ['Beginner', 'Level 1 Seller', 'Level 2 Seller', 'Best Seller'];
  const currentIndex = badges.indexOf(currentBadge);
  
  if (currentIndex === badges.length - 1) {
    // Already at highest badge
    return {
      nextBadge: null,
      nextThreshold: null,
      progress: 100,
      completedBookings: completedBookingsCount,
      requiredBookings: 0
    };
  }
  
  const nextBadge = badges[currentIndex + 1];
  const nextThreshold = BADGE_THRESHOLDS[nextBadge];
  const progress = Math.min(100, (completedBookingsCount / nextThreshold) * 100);
  const requiredBookings = Math.max(0, nextThreshold - completedBookingsCount);
  
  return {
    nextBadge,
    nextThreshold,
    progress,
    completedBookings: completedBookingsCount,
    requiredBookings
  };
};

/**
 * Get current mentor's badge
 */
const getMentorBadge = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const mentorProfile = await MentorProfile.findOne({ userId });
    if (!mentorProfile) {
      return sendErrorResponse(res, 'Mentor profile not found', 404);
    }
    
    // Count completed bookings
    const completedBookingsCount = await Booking.countDocuments({
      mentorId: userId,
      status: 'completed',
      isActive: true
    });
    
    return sendSuccessResponse(res, 'Mentor badge retrieved successfully', {
      badge: mentorProfile.badge || 'Beginner',
      completedBookings: completedBookingsCount,
      description: BADGE_DESCRIPTIONS[mentorProfile.badge || 'Beginner']
    });
  } catch (error) {
    console.error('Error getting mentor badge:', error);
    return sendErrorResponse(res, 'Failed to retrieve mentor badge', 500);
  }
};

/**
 * Get all available badges with unlock status
 */
const getAllBadges = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Count completed bookings
    const completedBookingsCount = await Booking.countDocuments({
      mentorId: userId,
      status: 'completed',
      isActive: true
    });
    
    const mentorProfile = await MentorProfile.findOne({ userId });
    const currentBadge = mentorProfile?.badge || 'Beginner';
    
    // Determine which badges are unlocked based on completed bookings
    // If a mentor has reached a higher badge, all previous badges are automatically unlocked
    const badgeLevels = ['Beginner', 'Level 1 Seller', 'Level 2 Seller', 'Best Seller'];
    const currentBadgeIndex = badgeLevels.indexOf(currentBadge);
    
    const badges = badgeLevels.map((badgeName, index) => {
      const isUnlocked = completedBookingsCount >= BADGE_THRESHOLDS[badgeName] || 
                         (currentBadgeIndex >= index && currentBadgeIndex > 0);
      
      return {
        name: badgeName,
        threshold: BADGE_THRESHOLDS[badgeName],
        description: BADGE_DESCRIPTIONS[badgeName],
        unlocked: badgeName === 'Beginner' ? true : isUnlocked, // Beginner is always unlocked
        isCurrent: currentBadge === badgeName
      };
    });
    
    return sendSuccessResponse(res, 'All badges retrieved successfully', {
      badges,
      completedBookings: completedBookingsCount
    });
  } catch (error) {
    console.error('Error getting all badges:', error);
    return sendErrorResponse(res, 'Failed to retrieve badges', 500);
  }
};

/**
 * Calculate and update badge based on completed bookings
 */
const calculateAndUpdateBadge = async (userId) => {
  try {
    // Count completed bookings
    const completedBookingsCount = await Booking.countDocuments({
      mentorId: userId,
      status: 'completed',
      isActive: true
    });
    
    // Calculate appropriate badge
    const newBadge = calculateBadge(completedBookingsCount);
    
    // Update mentor profile
    const mentorProfile = await MentorProfile.findOne({ userId });
    if (!mentorProfile) {
      throw new Error('Mentor profile not found');
    }
    
    const oldBadge = mentorProfile.badge || 'Beginner';
    mentorProfile.badge = newBadge;
    await mentorProfile.save();
    
    // Return badge info
    return {
      oldBadge,
      newBadge,
      completedBookings: completedBookingsCount,
      badgeUpdated: oldBadge !== newBadge
    };
  } catch (error) {
    console.error('Error calculating and updating badge:', error);
    throw error;
  }
};

/**
 * Get progress towards next badge
 */
const getBadgeProgress = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Count completed bookings
    const completedBookingsCount = await Booking.countDocuments({
      mentorId: userId,
      status: 'completed',
      isActive: true
    });
    
    const mentorProfile = await MentorProfile.findOne({ userId });
    const currentBadge = mentorProfile?.badge || 'Beginner';
    
    const progressInfo = getNextBadgeInfo(currentBadge, completedBookingsCount);
    
    return sendSuccessResponse(res, 'Badge progress retrieved successfully', {
      currentBadge,
      ...progressInfo,
      description: BADGE_DESCRIPTIONS[currentBadge]
    });
  } catch (error) {
    console.error('Error getting badge progress:', error);
    return sendErrorResponse(res, 'Failed to retrieve badge progress', 500);
  }
};

/**
 * Manually trigger badge recalculation
 */
const recalculateBadge = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await calculateAndUpdateBadge(userId);
    
    return sendSuccessResponse(res, 'Badge recalculated successfully', result);
  } catch (error) {
    console.error('Error recalculating badge:', error);
    return sendErrorResponse(res, 'Failed to recalculate badge', 500);
  }
};

module.exports = {
  getMentorBadge,
  getAllBadges,
  calculateAndUpdateBadge,
  getBadgeProgress,
  recalculateBadge
};

