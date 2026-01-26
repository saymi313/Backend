const MenteeProfile = require('../models/MenteeProfile');
const { sendSuccessResponse, sendErrorResponse } = require('../../shared/utils/helpers/responseHelpers');

// Create mentee profile
const createMenteeProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      educationLevel,
      currentInstitution,
      studyGoals,
      targetCountries,
      budget,
      budgetCurrency,
      preferences,
      academicInterests,
      careerGoals,
      timeline,
      previousExperience,
      challenges
    } = req.body;

    // Check if profile already exists
    const existingProfile = await MenteeProfile.findOne({ userId });
    if (existingProfile) {
      return sendErrorResponse(res, 'Mentee profile already exists', 400);
    }

    // Validate required fields
    if (!educationLevel) {
      return sendErrorResponse(res, 'Education level is required', 400);
    }

    const menteeProfile = new MenteeProfile({
      userId,
      educationLevel,
      currentInstitution: currentInstitution || '',
      studyGoals: studyGoals || [],
      targetCountries: targetCountries || [],
      budget: budget || 0,
      budgetCurrency: budgetCurrency || 'USD',
      preferences: preferences || {
        mentorGender: 'Any',
        communicationStyle: 'Mixed',
        preferredLanguage: 'English',
        timezone: 'UTC'
      },
      academicInterests: academicInterests || [],
      careerGoals: careerGoals || [],
      timeline: timeline || 'Flexible',
      previousExperience: previousExperience || '',
      challenges: challenges || []
    });

    await menteeProfile.save();

    // Populate user data
    await menteeProfile.populate('userId', 'profile.firstName profile.lastName profile.avatar email');

    return sendSuccessResponse(res, 'Mentee profile created successfully', {
      profile: menteeProfile
    }, 201);
  } catch (error) {
    return sendErrorResponse(res, 'Failed to create mentee profile', 500);
  }
};

// Get mentee profile
const getMenteeProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const User = require('../../shared/models/User');

    // Get user data
    const user = await User.findById(userId).select('profile firstName lastName avatar email');
    if (!user) {
      return sendErrorResponse(res, 'User not found', 404);
    }

    const profile = await MenteeProfile.findOne({ userId })
      .populate('userId', 'profile.firstName profile.lastName profile.avatar email');

    // If profile doesn't exist, return default structure
    if (!profile) {
      const defaultProfile = {
        userId: {
          _id: user._id,
          profile: {
            firstName: user.profile?.firstName || '',
            lastName: user.profile?.lastName || '',
            avatar: user.profile?.avatar || ''
          },
          email: user.email
        },
        educationLevel: '',
        currentInstitution: '',
        studyGoals: [],
        targetCountries: [],
        budget: 0,
        budgetCurrency: 'USD',
        preferences: {
          mentorGender: 'Any',
          communicationStyle: 'Mixed',
          preferredLanguage: 'English',
          timezone: user.profile?.timezone || 'UTC'
        },
        academicInterests: [],
        careerGoals: [],
        timeline: '',
        previousExperience: '',
        challenges: [],
        socialLinks: {}
      };
      return sendSuccessResponse(res, 'Mentee profile retrieved successfully', { profile: defaultProfile });
    }

    return sendSuccessResponse(res, 'Mentee profile retrieved successfully', { profile });
  } catch (error) {
    console.error('Error getting mentee profile:', error);
    return sendErrorResponse(res, 'Failed to retrieve mentee profile', 500);
  }
};

// Get mentee profile by user ID (for mentors to view)
const getMenteeProfileById = async (req, res) => {
  try {
    const { id } = req.params;
    const User = require('../../shared/models/User');

    // Get user data
    const user = await User.findById(id).select('profile email');
    if (!user) {
      return sendErrorResponse(res, 'User not found', 404);
    }

    const profile = await MenteeProfile.findOne({ userId: id })
      .populate('userId', 'profile email');

    // If profile doesn't exist, return minimal user info
    if (!profile) {
      const defaultProfile = {
        userId: {
          _id: user._id,
          profile: user.profile || {},
          email: user.email
        },
        educationLevel: '',
        currentInstitution: '',
        studyGoals: [],
        targetCountries: [],
        budget: 0,
        budgetCurrency: 'USD',
        preferences: {},
        academicInterests: [],
        careerGoals: [],
        timeline: '',
        previousExperience: '',
        challenges: [],
        socialLinks: {}
      };
      return sendSuccessResponse(res, 'Mentee profile retrieved successfully', { profile: defaultProfile });
    }

    return sendSuccessResponse(res, 'Mentee profile retrieved successfully', { profile });
  } catch (error) {
    console.error('Error getting mentee profile by ID:', error);
    return sendErrorResponse(res, 'Failed to retrieve mentee profile', 500);
  }
};

// Update mentee profile
const updateMenteeProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      educationLevel,
      currentInstitution,
      studyGoals,
      targetCountries,
      budget,
      budgetCurrency,
      academicInterests,
      careerGoals,
      timeline,
      previousExperience,
      challenges,
      socialLinks
    } = req.body;

    let profile = await MenteeProfile.findOne({ userId });

    // If profile doesn't exist, create a new one (Upsert)
    if (!profile) {
      console.log('Creating new mentee profile for user:', userId);
      profile = new MenteeProfile({ userId, educationLevel: educationLevel || 'Other' });
    }

    // Update simple fields
    if (educationLevel) profile.educationLevel = educationLevel;
    if (currentInstitution !== undefined) profile.currentInstitution = currentInstitution;
    if (budget !== undefined) profile.budget = budget;
    if (budgetCurrency) profile.budgetCurrency = budgetCurrency;
    if (timeline) profile.timeline = timeline;
    if (previousExperience !== undefined) profile.previousExperience = previousExperience;

    // Update array fields with full replacement
    if (studyGoals !== undefined) profile.studyGoals = studyGoals;
    if (targetCountries !== undefined) profile.targetCountries = targetCountries;
    if (academicInterests !== undefined) profile.academicInterests = academicInterests;
    if (careerGoals !== undefined) profile.careerGoals = careerGoals;
    if (challenges !== undefined) profile.challenges = challenges;

    // Update social links
    if (socialLinks) profile.socialLinks = socialLinks;

    await profile.save();

    // Check if population is possible (sometimes fails if user ref is broken)
    try {
      await profile.populate('userId', 'profile.firstName profile.lastName profile.avatar email');
    } catch (popError) {
      console.warn('Population failed in updateMenteeProfile:', popError.message);
    }

    return sendSuccessResponse(res, 'Mentee profile updated successfully', { profile });
  } catch (error) {
    console.error('Error updating mentee profile:', error);
    if (error.name === 'ValidationError') {
      return sendErrorResponse(res, error.message, 400);
    }
    return sendErrorResponse(res, 'Failed to update mentee profile: ' + error.message, 500);
  }
};

// Update study goals
const updateStudyGoals = async (req, res) => {
  try {
    const userId = req.user.id;
    const { studyGoals } = req.body;

    if (!Array.isArray(studyGoals)) {
      return sendErrorResponse(res, 'Study goals must be an array', 400);
    }

    const profile = await MenteeProfile.findOne({ userId });
    if (!profile) {
      return sendErrorResponse(res, 'Mentee profile not found', 404);
    }

    profile.studyGoals = studyGoals;
    await profile.save();

    return sendSuccessResponse(res, 'Study goals updated successfully', {
      studyGoals: profile.studyGoals
    });
  } catch (error) {
    return sendErrorResponse(res, 'Failed to update study goals', 500);
  }
};

// Update target countries
const updateTargetCountries = async (req, res) => {
  try {
    const userId = req.user.id;
    const { targetCountries } = req.body;

    if (!Array.isArray(targetCountries)) {
      return sendErrorResponse(res, 'Target countries must be an array', 400);
    }

    const profile = await MenteeProfile.findOne({ userId });
    if (!profile) {
      return sendErrorResponse(res, 'Mentee profile not found', 404);
    }

    profile.targetCountries = targetCountries;
    await profile.save();

    return sendSuccessResponse(res, 'Target countries updated successfully', {
      targetCountries: profile.targetCountries
    });
  } catch (error) {
    return sendErrorResponse(res, 'Failed to update target countries', 500);
  }
};

// Update academic interests
const updateAcademicInterests = async (req, res) => {
  try {
    const userId = req.user.id;
    const { academicInterests } = req.body;

    if (!Array.isArray(academicInterests)) {
      return sendErrorResponse(res, 'Academic interests must be an array', 400);
    }

    const profile = await MenteeProfile.findOne({ userId });
    if (!profile) {
      return sendErrorResponse(res, 'Mentee profile not found', 404);
    }

    profile.academicInterests = academicInterests;
    await profile.save();

    return sendSuccessResponse(res, 'Academic interests updated successfully', {
      academicInterests: profile.academicInterests
    });
  } catch (error) {
    return sendErrorResponse(res, 'Failed to update academic interests', 500);
  }
};

// Update career goals
const updateCareerGoals = async (req, res) => {
  try {
    const userId = req.user.id;
    const { careerGoals } = req.body;

    if (!Array.isArray(careerGoals)) {
      return sendErrorResponse(res, 'Career goals must be an array', 400);
    }

    const profile = await MenteeProfile.findOne({ userId });
    if (!profile) {
      return sendErrorResponse(res, 'Mentee profile not found', 404);
    }

    profile.careerGoals = careerGoals;
    await profile.save();

    return sendSuccessResponse(res, 'Career goals updated successfully', {
      careerGoals: profile.careerGoals
    });
  } catch (error) {
    return sendErrorResponse(res, 'Failed to update career goals', 500);
  }
};

// Update preferences  
const updatePreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const { preferences } = req.body;

    if (!preferences || typeof preferences !== 'object') {
      return sendErrorResponse(res, 'Preferences must be an object', 400);
    }

    const profile = await MenteeProfile.findOne({ userId });
    if (!profile) {
      return sendErrorResponse(res, 'Mentee profile not found', 404);
    }

    profile.preferences = { ...profile.preferences, ...preferences };
    await profile.save();

    return sendSuccessResponse(res, 'Preferences updated successfully', {
      preferences: profile.preferences
    });
  } catch (error) {
    return sendErrorResponse(res, 'Failed to update preferences', 500);
  }
};

// Update challenges
const updateChallenges = async (req, res) => {
  try {
    const userId = req.user.id;
    const { challenges } = req.body;

    if (!Array.isArray(challenges)) {
      return sendErrorResponse(res, 'Challenges must be an array', 400);
    }

    const profile = await MenteeProfile.findOne({ userId });
    if (!profile) {
      return sendErrorResponse(res, 'Mentee profile not found', 404);
    }

    profile.challenges = challenges;
    await profile.save();

    return sendSuccessResponse(res, 'Challenges updated successfully', {
      challenges: profile.challenges
    });
  } catch (error) {
    return sendErrorResponse(res, 'Failed to update challenges', 500);
  }
};

// Get profile completeness
const getProfileCompleteness = async (req, res) => {
  try {
    const userId = req.user.id;

    const profile = await MenteeProfile.findOne({ userId });
    if (!profile) {
      return sendSuccessResponse(res, 'Profile completeness retrieved', {
        completeness: 0,
        missingFields: ['educationLevel', 'studyGoals', 'targetCountries']
      });
    }

    const completeness = profile.profileCompleteness || 0;
    const missingFields = [];

    if (!profile.educationLevel) missingFields.push('educationLevel');
    if (!profile.studyGoals || profile.studyGoals.length === 0) missingFields.push('studyGoals');
    if (!profile.targetCountries || profile.targetCountries.length === 0) missingFields.push('targetCountries');
    if (!profile.academicInterests || profile.academicInterests.length === 0) missingFields.push('academicInterests');
    if (!profile.careerGoals || profile.careerGoals.length === 0) missingFields.push('careerGoals');

    return sendSuccessResponse(res, 'Profile completeness retrieved', {
      completeness,
      missingFields
    });
  } catch (error) {
    return sendErrorResponse(res, 'Failed to get profile completeness', 500);
  }
};

module.exports = {
  createMenteeProfile,
  getMenteeProfile,
  getMenteeProfileById,
  updateMenteeProfile,
  updateStudyGoals,
  updateTargetCountries,
  updateAcademicInterests,
  updateCareerGoals,
  updatePreferences,
  updateChallenges,
  getProfileCompleteness
};
