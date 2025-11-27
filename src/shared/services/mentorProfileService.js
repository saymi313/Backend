const MentorProfile = require('../../MentorPanel/models/MentorProfile');

class MentorProfileService {
  // Create a new mentor profile
  static async createProfile(userId, profileData) {
    try {
      // Check if profile already exists
      const existingProfile = await MentorProfile.findOne({ userId });
      if (existingProfile) {
        throw new Error('Mentor profile already exists');
      }

      // Create new profile with default values
      const mentorProfile = new MentorProfile({
        userId,
        specialization: profileData.specialization || [],
        experience: profileData.experience || 0,
        education: profileData.education || [],
        certifications: profileData.certifications || [],
        languages: profileData.languages || [],
        availability: profileData.availability || {
          timezone: 'UTC',
          workingHours: '9 AM - 5 PM',
          workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        },
        hourlyRate: profileData.hourlyRate || 0,
        currency: profileData.currency || 'USD',
        bio: profileData.bio || '',
        isActive: true,
        isVerified: false
      });

      await mentorProfile.save();
      return await mentorProfile.populate('userId', 'profile.firstName profile.lastName profile.avatar email');
    } catch (error) {
      throw error;
    }
  }

  // Get mentor profile by user ID
  static async getProfileByUserId(userId) {
    try {
      const profile = await MentorProfile.findOne({ userId })
        .populate('userId', 'profile.firstName profile.lastName profile.avatar email');
      
      if (!profile) {
        throw new Error('Mentor profile not found');
      }
      
      return profile;
    } catch (error) {
      throw error;
    }
  }

  // Update mentor profile
  static async updateProfile(userId, updateData) {
    try {
      const profile = await MentorProfile.findOne({ userId });
      if (!profile) {
        throw new Error('Mentor profile not found');
      }

      // Update fields
      if (updateData.specialization) profile.specialization = updateData.specialization;
      if (updateData.experience !== undefined) profile.experience = updateData.experience;
      if (updateData.education) profile.education = updateData.education;
      if (updateData.certifications) profile.certifications = updateData.certifications;
      if (updateData.languages) profile.languages = updateData.languages;
      if (updateData.availability) profile.availability = updateData.availability;
      if (updateData.hourlyRate !== undefined) profile.hourlyRate = updateData.hourlyRate;
      if (updateData.currency) profile.currency = updateData.currency;
      if (updateData.bio !== undefined) profile.bio = updateData.bio;

      await profile.save();
      return await profile.populate('userId', 'profile.firstName profile.lastName profile.avatar email');
    } catch (error) {
      throw error;
    }
  }

  // Get all mentor profiles with pagination
  static async getAllProfiles(page = 1, limit = 10, filters = {}) {
    try {
      const skip = (page - 1) * limit;
      const query = { isActive: true, isVerified: true };

      // Apply filters
      if (filters.specialization && filters.specialization.length > 0) {
        query.specialization = { $in: filters.specialization };
      }
      if (filters.minExperience) {
        query.experience = { $gte: filters.minExperience };
      }
      if (filters.maxHourlyRate) {
        query.hourlyRate = { $lte: filters.maxHourlyRate };
      }
      if (filters.languages && filters.languages.length > 0) {
        query.languages = { $in: filters.languages };
      }

      const profiles = await MentorProfile.find(query)
        .populate('userId', 'profile.firstName profile.lastName profile.avatar email')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      const total = await MentorProfile.countDocuments(query);

      return {
        profiles,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Search mentor profiles
  static async searchProfiles(searchTerm, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const profiles = await MentorProfile.find({
        $text: { $search: searchTerm },
        isActive: true,
        isVerified: true
      })
        .populate('userId', 'profile.firstName profile.lastName profile.avatar email')
        .skip(skip)
        .limit(limit)
        .sort({ score: { $meta: 'textScore' } });

      const total = await MentorProfile.countDocuments({
        $text: { $search: searchTerm },
        isActive: true,
        isVerified: true
      });

      return {
        profiles,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Verify mentor profile
  static async verifyProfile(userId) {
    try {
      const profile = await MentorProfile.findOne({ userId });
      if (!profile) {
        throw new Error('Mentor profile not found');
      }

      profile.isVerified = true;
      await profile.save();
      return profile;
    } catch (error) {
      throw error;
    }
  }

  // Deactivate mentor profile
  static async deactivateProfile(userId) {
    try {
      const profile = await MentorProfile.findOne({ userId });
      if (!profile) {
        throw new Error('Mentor profile not found');
      }

      profile.isActive = false;
      await profile.save();
      return profile;
    } catch (error) {
      throw error;
    }
  }

  // Get profile statistics
  static async getProfileStats() {
    try {
      const totalProfiles = await MentorProfile.countDocuments();
      const activeProfiles = await MentorProfile.countDocuments({ isActive: true });
      const verifiedProfiles = await MentorProfile.countDocuments({ isVerified: true });

      const specializationStats = await MentorProfile.aggregate([
        { $unwind: '$specialization' },
        { $group: { _id: '$specialization', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);

      const experienceStats = await MentorProfile.aggregate([
        {
          $group: {
            _id: {
              $switch: {
                branches: [
                  { case: { $lt: ['$experience', 1] }, then: '0-1 years' },
                  { case: { $lt: ['$experience', 3] }, then: '1-3 years' },
                  { case: { $lt: ['$experience', 5] }, then: '3-5 years' },
                  { case: { $lt: ['$experience', 10] }, then: '5-10 years' }
                ],
                default: '10+ years'
              }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);

      return {
        totalProfiles,
        activeProfiles,
        verifiedProfiles,
        specializationStats,
        experienceStats
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = MentorProfileService;
