const MenteeProfile = require('../../MenteesPanel/models/MenteeProfile');

class MenteeProfileService {
  // Create a new mentee profile
  static async createProfile(userId, profileData) {
    try {
      // Check if profile already exists
      const existingProfile = await MenteeProfile.findOne({ userId });
      if (existingProfile) {
        throw new Error('Mentee profile already exists');
      }

      // Create new profile with default values
      const menteeProfile = new MenteeProfile({
        userId,
        educationLevel: profileData.educationLevel,
        currentInstitution: profileData.currentInstitution || '',
        studyGoals: profileData.studyGoals || [],
        targetCountries: profileData.targetCountries || [],
        budget: profileData.budget || 0,
        budgetCurrency: profileData.budgetCurrency || 'USD',
        preferences: profileData.preferences || {
          mentorGender: 'Any',
          communicationStyle: 'Mixed',
          preferredLanguage: 'English',
          timezone: 'UTC'
        },
        academicInterests: profileData.academicInterests || [],
        careerGoals: profileData.careerGoals || [],
        timeline: profileData.timeline || 'Flexible',
        previousExperience: profileData.previousExperience || '',
        challenges: profileData.challenges || []
      });

      await menteeProfile.save();
      return await menteeProfile.populate('userId', 'profile.firstName profile.lastName profile.avatar email');
    } catch (error) {
      throw error;
    }
  }

  // Get mentee profile by user ID
  static async getProfileByUserId(userId) {
    try {
      const profile = await MenteeProfile.findOne({ userId })
        .populate('userId', 'profile.firstName profile.lastName profile.avatar email');
      
      if (!profile) {
        throw new Error('Mentee profile not found');
      }
      
      return profile;
    } catch (error) {
      throw error;
    }
  }

  // Update mentee profile
  static async updateProfile(userId, updateData) {
    try {
      const profile = await MenteeProfile.findOne({ userId });
      if (!profile) {
        throw new Error('Mentee profile not found');
      }

      // Update simple fields
      if (updateData.educationLevel) profile.educationLevel = updateData.educationLevel;
      if (updateData.currentInstitution !== undefined) profile.currentInstitution = updateData.currentInstitution;
      if (updateData.budget !== undefined) profile.budget = updateData.budget;
      if (updateData.budgetCurrency) profile.budgetCurrency = updateData.budgetCurrency;
      if (updateData.timeline) profile.timeline = updateData.timeline;
      if (updateData.previousExperience !== undefined) profile.previousExperience = updateData.previousExperience;

      // Update array fields with full replacement
      if (updateData.studyGoals !== undefined) profile.studyGoals = updateData.studyGoals;
      if (updateData.targetCountries !== undefined) profile.targetCountries = updateData.targetCountries;
      if (updateData.academicInterests !== undefined) profile.academicInterests = updateData.academicInterests;
      if (updateData.careerGoals !== undefined) profile.careerGoals = updateData.careerGoals;
      if (updateData.challenges !== undefined) profile.challenges = updateData.challenges;

      // Update social links
      if (updateData.socialLinks) profile.socialLinks = updateData.socialLinks;

      // Update preferences
      if (updateData.preferences) {
        profile.preferences = { ...profile.preferences, ...updateData.preferences };
      }

      await profile.save();
      return await profile.populate('userId', 'profile.firstName profile.lastName profile.avatar email');
    } catch (error) {
      throw error;
    }
  }

  // Add study goal using model method
  static async addStudyGoal(userId, goal) {
    try {
      const profile = await MenteeProfile.findOne({ userId });
      if (!profile) {
        throw new Error('Mentee profile not found');
      }
      
      return await profile.addStudyGoal(goal);
    } catch (error) {
      throw error;
    }
  }

  // Remove study goal using model method
  static async removeStudyGoal(userId, goal) {
    try {
      const profile = await MenteeProfile.findOne({ userId });
      if (!profile) {
        throw new Error('Mentee profile not found');
      }
      
      return await profile.removeStudyGoal(goal);
    } catch (error) {
      throw error;
    }
  }

  // Add target country using model method
  static async addTargetCountry(userId, country) {
    try {
      const profile = await MenteeProfile.findOne({ userId });
      if (!profile) {
        throw new Error('Mentee profile not found');
      }
      
      return await profile.addTargetCountry(country);
    } catch (error) {
      throw error;
    }
  }

  // Remove target country using model method
  static async removeTargetCountry(userId, country) {
    try {
      const profile = await MenteeProfile.findOne({ userId });
      if (!profile) {
        throw new Error('Mentee profile not found');
      }
      
      return await profile.removeTargetCountry(country);
    } catch (error) {
      throw error;
    }
  }

  // Get all mentee profiles with pagination
  static async getAllProfiles(page = 1, limit = 10, filters = {}) {
    try {
      const skip = (page - 1) * limit;
      const query = { isActive: true };

      // Apply filters
      if (filters.educationLevel) {
        query.educationLevel = filters.educationLevel;
      }
      if (filters.targetCountries && filters.targetCountries.length > 0) {
        query.targetCountries = { $in: filters.targetCountries };
      }

      const profiles = await MenteeProfile.find(query)
        .populate('userId', 'profile.firstName profile.lastName profile.avatar email')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      const total = await MenteeProfile.countDocuments(query);

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

  // Search mentee profiles
  static async searchProfiles(searchTerm, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;
      
      const profiles = await MenteeProfile.find({
        $text: { $search: searchTerm },
        isActive: true
      })
        .populate('userId', 'profile.firstName profile.lastName profile.avatar email')
        .skip(skip)
        .limit(limit)
        .sort({ score: { $meta: 'textScore' } });

      const total = await MenteeProfile.countDocuments({
        $text: { $search: searchTerm },
        isActive: true
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

  // Deactivate mentee profile
  static async deactivateProfile(userId) {
    try {
      const profile = await MenteeProfile.findOne({ userId });
      if (!profile) {
        throw new Error('Mentee profile not found');
      }

      profile.isActive = false;
      await profile.save();
      return profile;
    } catch (error) {
      throw error;
    }
  }

  // Reactivate mentee profile
  static async reactivateProfile(userId) {
    try {
      const profile = await MenteeProfile.findOne({ userId });
      if (!profile) {
        throw new Error('Mentee profile not found');
      }

      profile.isActive = true;
      await profile.save();
      return profile;
    } catch (error) {
      throw error;
    }
  }

  // Get profile statistics
  static async getProfileStats() {
    try {
      const totalProfiles = await MenteeProfile.countDocuments();
      const activeProfiles = await MenteeProfile.countDocuments({ isActive: true });
      const completedProfiles = await MenteeProfile.countDocuments({ 
        profileCompleteness: { $gte: 80 } 
      });

      const educationLevelStats = await MenteeProfile.aggregate([
        { $group: { _id: '$educationLevel', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      const targetCountryStats = await MenteeProfile.aggregate([
        { $unwind: '$targetCountries' },
        { $group: { _id: '$targetCountries', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);

      return {
        totalProfiles,
        activeProfiles,
        completedProfiles,
        educationLevelStats,
        targetCountryStats
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = MenteeProfileService;
