const MentorProfile = require('../models/MentorProfile');
const User = require('../../shared/models/User');
const MentorService = require('../models/Service');
const { sendSuccessResponse, sendErrorResponse } = require('../../shared/utils/helpers/responseHelpers');

// Create mentor profile
const createMentorProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      title,
      bio,
      specializations,
      education,
      experience,
      achievements,
      availability,
      languages,
      socialLinks,
      background,
      recommendations,
      connections,
      services,
      successStory
    } = req.body;

    // Check if profile already exists
    const existingProfile = await MentorProfile.findOne({ userId });
    if (existingProfile) {
      return sendErrorResponse(res, 'Mentor profile already exists', 400);
    }

    // Validate required fields
    if (!title || !bio) {
      return sendErrorResponse(res, 'Title and bio are required', 400);
    }

    const mentorProfile = new MentorProfile({
      userId,
      title,
      bio,
      specializations: specializations || [],
      education: education || [],
      experience: experience || [],
      achievements: achievements || [],
      availability: availability || { timezone: 'UTC', workingHours: '9 AM - 5 PM' },
      languages: languages || [],
      socialLinks: socialLinks || {},
      background: background || '',
      recommendations: recommendations || [],
      connections: connections || [],
      services: services || [],
      successStory: successStory || undefined
    });

    await mentorProfile.save();

    // Populate user data
    await mentorProfile.populate('userId', 'profile.firstName profile.lastName profile.avatar email');
    await mentorProfile.populate('services');

    return sendSuccessResponse(res, 'Mentor profile created successfully', {
      profile: mentorProfile
    }, 201);
  } catch (error) {
    return sendErrorResponse(res, 'Failed to create mentor profile', 500);
  }
};

// Get mentor profile
const getMentorProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('📁 Getting mentor profile for user:', userId);

    let profile = await MentorProfile.findOne({ userId })
      .populate('userId', 'profile.firstName profile.lastName profile.avatar email')
      .populate('services')
      .populate('connections', 'profile.firstName profile.lastName profile.avatar email');

    if (!profile) {
      console.log('⚠️  Mentor profile not found for user:', userId);
      return sendErrorResponse(res, 'Mentor profile not found', 404);
    }

    // Also include computed services if not stored as refs
    if (!profile.services || profile.services.length === 0) {
      const services = await MentorService.find({ mentorId: userId, isActive: true }).sort({ createdAt: -1 });
      profile = profile.toObject();
      profile.services = services;
    }

    // Add connections count for convenience
    const connectionsCount = (profile.connections || []).length;
    console.log('✅ Profile found with', connectionsCount, 'connections');

    return sendSuccessResponse(res, 'Mentor profile retrieved successfully', { profile, connectionsCount });
  } catch (error) {
    console.error('Get mentor profile error:', error);
    return sendErrorResponse(res, 'Failed to retrieve mentor profile', 500);
  }
};

// Update mentor profile
const updateMentorProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      title,
      bio,
      specializations,
      availability,
      languages,
      socialLinks,
      background,
      recommendations,
      connections,
      services,
      successStory
    } = req.body;

    let profile = await MentorProfile.findOne({ userId });

    // If profile doesn't exist, create it first
    if (!profile) {
      console.log('Profile not found, creating new profile for user:', userId);
      profile = new MentorProfile({
        userId,
        title: title || 'Mentor',
        bio: bio || background || 'Experienced mentor ready to help students achieve their goals.',
        background: background || '',
        specializations: specializations || [],
        education: [],
        experience: [],
        achievements: [],
        availability: availability || { timezone: 'UTC', workingHours: '9 AM - 5 PM', daysAvailable: [] },
        languages: languages || [],
        socialLinks: socialLinks || {},
        recommendations: recommendations || [],
        connections: connections || [],
        services: services || [],
        successStory: successStory || undefined
      });
      await profile.save();
      await profile.populate('userId', 'profile.firstName profile.lastName profile.avatar email');

      return sendSuccessResponse(res, 'Mentor profile created successfully', { profile });
    }

    // Profile exists, update it
    if (title) profile.title = title;
    if (bio) profile.bio = bio;
    if (specializations) profile.specializations = specializations;
    if (availability) profile.availability = { ...profile.availability, ...availability };
    if (languages) profile.languages = languages;
    if (socialLinks) profile.socialLinks = { ...profile.socialLinks, ...socialLinks };
    if (background !== undefined) profile.background = background;
    if (recommendations) profile.recommendations = recommendations;
    if (connections) profile.connections = connections;
    if (services) profile.services = services;
    if (successStory !== undefined) profile.successStory = successStory;

    await profile.save();
    await profile.populate('userId', 'profile.firstName profile.lastName profile.avatar email');
    await profile.populate('services');
    await profile.populate('connections', 'profile.firstName profile.lastName profile.avatar email');

    return sendSuccessResponse(res, 'Mentor profile updated successfully', { profile });
  } catch (error) {
    console.error('Update mentor profile error:', error);
    return sendErrorResponse(res, 'Failed to update mentor profile', 500);
  }
};

// Add education entry
const addEducation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { degree, institution, year, field, gpa } = req.body;

    if (!degree || !institution || !year) {
      return sendErrorResponse(res, 'Degree, institution, and year are required', 400);
    }

    const profile = await MentorProfile.findOne({ userId });
    if (!profile) {
      return sendErrorResponse(res, 'Mentor profile not found', 404);
    }

    profile.education.push({ degree, institution, year, field, gpa });
    await profile.save();

    return sendSuccessResponse(res, 'Education added successfully', {
      education: profile.education[profile.education.length - 1]
    });
  } catch (error) {
    ('Add education error:', error);
    return sendErrorResponse(res, 'Failed to add education', 500);
  }
};

// Update education entry
const updateEducation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { educationId } = req.params;
    const { degree, institution, year, field, gpa } = req.body;

    const profile = await MentorProfile.findOne({ userId });
    if (!profile) {
      return sendErrorResponse(res, 'Mentor profile not found', 404);
    }

    const educationIndex = profile.education.findIndex(edu => edu._id.toString() === educationId);
    if (educationIndex === -1) {
      return sendErrorResponse(res, 'Education entry not found', 404);
    }

    // Update education entry
    if (degree) profile.education[educationIndex].degree = degree;
    if (institution) profile.education[educationIndex].institution = institution;
    if (year) profile.education[educationIndex].year = year;
    if (field !== undefined) profile.education[educationIndex].field = field;
    if (gpa !== undefined) profile.education[educationIndex].gpa = gpa;

    await profile.save();

    return sendSuccessResponse(res, 'Education updated successfully', {
      education: profile.education[educationIndex]
    });
  } catch (error) {
    ('Update education error:', error);
    return sendErrorResponse(res, 'Failed to update education', 500);
  }
};

// Delete education entry
const deleteEducation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { educationId } = req.params;

    const profile = await MentorProfile.findOne({ userId });
    if (!profile) {
      return sendErrorResponse(res, 'Mentor profile not found', 404);
    }

    profile.education = profile.education.filter(edu => edu._id.toString() !== educationId);
    await profile.save();

    return sendSuccessResponse(res, 'Education deleted successfully');
  } catch (error) {
    ('Delete education error:', error);
    return sendErrorResponse(res, 'Failed to delete education', 500);
  }
};

// Add experience entry
const addExperience = async (req, res) => {
  try {
    const userId = req.user.id;
    const { company, position, duration, description, startDate, endDate, isCurrent } = req.body;

    if (!company || !position || !duration) {
      return sendErrorResponse(res, 'Company, position, and duration are required', 400);
    }

    const profile = await MentorProfile.findOne({ userId });
    if (!profile) {
      return sendErrorResponse(res, 'Mentor profile not found', 404);
    }

    profile.experience.push({
      company,
      position,
      duration,
      description,
      startDate,
      endDate,
      isCurrent
    });
    await profile.save();

    return sendSuccessResponse(res, 'Experience added successfully', {
      experience: profile.experience[profile.experience.length - 1]
    });
  } catch (error) {
    ('Add experience error:', error);
    return sendErrorResponse(res, 'Failed to add experience', 500);
  }
};

// Update experience entry
const updateExperience = async (req, res) => {
  try {
    const userId = req.user.id;
    const { experienceId } = req.params;
    const { company, position, duration, description, startDate, endDate, isCurrent } = req.body;

    const profile = await MentorProfile.findOne({ userId });
    if (!profile) {
      return sendErrorResponse(res, 'Mentor profile not found', 404);
    }

    const experienceIndex = profile.experience.findIndex(exp => exp._id.toString() === experienceId);
    if (experienceIndex === -1) {
      return sendErrorResponse(res, 'Experience entry not found', 404);
    }

    // Update experience entry
    if (company) profile.experience[experienceIndex].company = company;
    if (position) profile.experience[experienceIndex].position = position;
    if (duration) profile.experience[experienceIndex].duration = duration;
    if (description !== undefined) profile.experience[experienceIndex].description = description;
    if (startDate) profile.experience[experienceIndex].startDate = startDate;
    if (endDate) profile.experience[experienceIndex].endDate = endDate;
    if (isCurrent !== undefined) profile.experience[experienceIndex].isCurrent = isCurrent;

    await profile.save();

    return sendSuccessResponse(res, 'Experience updated successfully', {
      experience: profile.experience[experienceIndex]
    });
  } catch (error) {
    ('Update experience error:', error);
    return sendErrorResponse(res, 'Failed to update experience', 500);
  }
};

// Delete experience entry
const deleteExperience = async (req, res) => {
  try {
    const userId = req.user.id;
    const { experienceId } = req.params;

    const profile = await MentorProfile.findOne({ userId });
    if (!profile) {
      return sendErrorResponse(res, 'Mentor profile not found', 404);
    }

    profile.experience = profile.experience.filter(exp => exp._id.toString() !== experienceId);
    await profile.save();

    return sendSuccessResponse(res, 'Experience deleted successfully');
  } catch (error) {
    ('Delete experience error:', error);
    return sendErrorResponse(res, 'Failed to delete experience', 500);
  }
};

// Add achievement
const addAchievement = async (req, res) => {
  try {
    const userId = req.user.id;
    const { achievement } = req.body;

    if (!achievement) {
      return sendErrorResponse(res, 'Achievement is required', 400);
    }

    const profile = await MentorProfile.findOne({ userId });
    if (!profile) {
      return sendErrorResponse(res, 'Mentor profile not found', 404);
    }

    profile.achievements.push(achievement);
    await profile.save();

    return sendSuccessResponse(res, 'Achievement added successfully', {
      achievement: profile.achievements[profile.achievements.length - 1]
    });
  } catch (error) {
    ('Add achievement error:', error);
    return sendErrorResponse(res, 'Failed to add achievement', 500);
  }
};

// Delete achievement
const deleteAchievement = async (req, res) => {
  try {
    const userId = req.user.id;
    const { achievementId } = req.params;

    const profile = await MentorProfile.findOne({ userId });
    if (!profile) {
      return sendErrorResponse(res, 'Mentor profile not found', 404);
    }

    profile.achievements = profile.achievements.filter((_, index) => index.toString() !== achievementId);
    await profile.save();

    return sendSuccessResponse(res, 'Achievement deleted successfully');
  } catch (error) {
    ('Delete achievement error:', error);
    return sendErrorResponse(res, 'Failed to delete achievement', 500);
  }
};

// Update availability
const updateAvailability = async (req, res) => {
  try {
    const userId = req.user.id;
    const { timezone, workingHours, daysAvailable } = req.body;

    const profile = await MentorProfile.findOne({ userId });
    if (!profile) {
      return sendErrorResponse(res, 'Mentor profile not found', 404);
    }

    if (timezone) profile.availability.timezone = timezone;
    if (workingHours) profile.availability.workingHours = workingHours;
    if (daysAvailable) profile.availability.daysAvailable = daysAvailable;

    await profile.save();

    return sendSuccessResponse(res, 'Availability updated successfully', {
      availability: profile.availability
    });
  } catch (error) {
    ('Update availability error:', error);
    return sendErrorResponse(res, 'Failed to update availability', 500);
  }
};

module.exports = {
  createMentorProfile,
  getMentorProfile,
  updateMentorProfile,
  addEducation,
  updateEducation,
  deleteEducation,
  addExperience,
  updateExperience,
  deleteExperience,
  addAchievement,
  deleteAchievement,
  updateAvailability
};
