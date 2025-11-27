const Settings = require('../../shared/models/Settings');
const { sendSuccessResponse, sendErrorResponse } = require('../../shared/utils/helpers/responseHelpers');

// Get current settings
const getSettings = async (req, res) => {
  try {
    const settings = await Settings.getSettings();

    return sendSuccessResponse(res, 'Settings retrieved successfully', {
      settings: {
        categories: settings.categories || [],
        featureFlags: {
          enableMentorVerification: settings.featureFlags?.enableMentorVerification ?? true,
          enablePayouts: settings.featureFlags?.enablePayouts ?? true,
          autoApproveFeedbacks: settings.featureFlags?.autoApproveFeedbacks ?? false
        }
      }
    });
  } catch (error) {
    console.error('Error getting settings:', error);
    return sendErrorResponse(res, 'Failed to retrieve settings', 500);
  }
};

// Update settings
const updateSettings = async (req, res) => {
  try {
    const { categories, featureFlags } = req.body;
    const adminId = req.user.id;

    // Validate categories if provided
    if (categories !== undefined) {
      if (!Array.isArray(categories)) {
        return sendErrorResponse(res, 'Categories must be an array', 400);
      }
      // Validate each category
      for (const category of categories) {
        if (typeof category !== 'string' || category.trim().length === 0) {
          return sendErrorResponse(res, 'Each category must be a non-empty string', 400);
        }
        if (category.length > 50) {
          return sendErrorResponse(res, 'Category names cannot exceed 50 characters', 400);
        }
      }
    }

    // Validate feature flags if provided
    if (featureFlags !== undefined) {
      if (typeof featureFlags !== 'object' || featureFlags === null) {
        return sendErrorResponse(res, 'Feature flags must be an object', 400);
      }
      if (featureFlags.enableMentorVerification !== undefined && typeof featureFlags.enableMentorVerification !== 'boolean') {
        return sendErrorResponse(res, 'enableMentorVerification must be a boolean', 400);
      }
      if (featureFlags.enablePayouts !== undefined && typeof featureFlags.enablePayouts !== 'boolean') {
        return sendErrorResponse(res, 'enablePayouts must be a boolean', 400);
      }
      if (featureFlags.autoApproveFeedbacks !== undefined && typeof featureFlags.autoApproveFeedbacks !== 'boolean') {
        return sendErrorResponse(res, 'autoApproveFeedbacks must be a boolean', 400);
      }
    }

    // Build update object
    const updateData = {};
    if (categories !== undefined) {
      updateData.categories = categories.map(cat => cat.trim());
    }
    if (featureFlags !== undefined) {
      updateData.featureFlags = {
        enableMentorVerification: featureFlags.enableMentorVerification ?? true,
        enablePayouts: featureFlags.enablePayouts ?? true,
        autoApproveFeedbacks: featureFlags.autoApproveFeedbacks ?? false
      };
    }

    // Update settings
    const settings = await Settings.updateSettings(updateData, adminId);

    return sendSuccessResponse(res, 'Settings updated successfully', {
      settings: {
        categories: settings.categories || [],
        featureFlags: {
          enableMentorVerification: settings.featureFlags?.enableMentorVerification ?? true,
          enablePayouts: settings.featureFlags?.enablePayouts ?? true,
          autoApproveFeedbacks: settings.featureFlags?.autoApproveFeedbacks ?? false
        }
      }
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return sendErrorResponse(res, 'Failed to update settings', 500);
  }
};

// Add category
const addCategory = async (req, res) => {
  try {
    const { category } = req.body;
    const adminId = req.user.id;

    if (!category || typeof category !== 'string' || category.trim().length === 0) {
      return sendErrorResponse(res, 'Category name is required', 400);
    }

    const trimmedCategory = category.trim();

    // Validate category name format
    if (!/^[A-Za-z0-9 &-]{2,50}$/.test(trimmedCategory)) {
      return sendErrorResponse(res, 'Category must be 2-50 characters and contain only letters, numbers, spaces, &, or -', 400);
    }

    // Get current settings
    const settings = await Settings.getSettings();

    // Check if category already exists (case-insensitive)
    const categoryExists = settings.categories.some(
      c => c.toLowerCase() === trimmedCategory.toLowerCase()
    );

    if (categoryExists) {
      return sendErrorResponse(res, 'Category already exists', 400);
    }

    // Add category
    const updatedCategories = [...settings.categories, trimmedCategory];
    const updatedSettings = await Settings.updateSettings(
      { categories: updatedCategories },
      adminId
    );

    return sendSuccessResponse(res, 'Category added successfully', {
      settings: {
        categories: updatedSettings.categories || [],
        featureFlags: {
          enableMentorVerification: updatedSettings.featureFlags?.enableMentorVerification ?? true,
          enablePayouts: updatedSettings.featureFlags?.enablePayouts ?? true,
          autoApproveFeedbacks: updatedSettings.featureFlags?.autoApproveFeedbacks ?? false
        }
      }
    });
  } catch (error) {
    console.error('Error adding category:', error);
    return sendErrorResponse(res, 'Failed to add category', 500);
  }
};

// Remove category
const removeCategory = async (req, res) => {
  try {
    const { category } = req.body;
    const adminId = req.user.id;

    if (!category || typeof category !== 'string' || category.trim().length === 0) {
      return sendErrorResponse(res, 'Category name is required', 400);
    }

    const trimmedCategory = category.trim();

    // Get current settings
    const settings = await Settings.getSettings();

    // Check if category exists
    const categoryIndex = settings.categories.findIndex(
      c => c.toLowerCase() === trimmedCategory.toLowerCase()
    );

    if (categoryIndex === -1) {
      return sendErrorResponse(res, 'Category not found', 404);
    }

    // Remove category
    const updatedCategories = settings.categories.filter(
      c => c.toLowerCase() !== trimmedCategory.toLowerCase()
    );
    const updatedSettings = await Settings.updateSettings(
      { categories: updatedCategories },
      adminId
    );

    return sendSuccessResponse(res, 'Category removed successfully', {
      settings: {
        categories: updatedSettings.categories || [],
        featureFlags: {
          enableMentorVerification: updatedSettings.featureFlags?.enableMentorVerification ?? true,
          enablePayouts: updatedSettings.featureFlags?.enablePayouts ?? true,
          autoApproveFeedbacks: updatedSettings.featureFlags?.autoApproveFeedbacks ?? false
        }
      }
    });
  } catch (error) {
    console.error('Error removing category:', error);
    return sendErrorResponse(res, 'Failed to remove category', 500);
  }
};

module.exports = {
  getSettings,
  updateSettings,
  addCategory,
  removeCategory
};

