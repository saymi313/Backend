const mongoose = require('mongoose');
const MentorService = require('../models/Service');
const { processUploadedFiles, cleanupFiles } = require('../../shared/middlewares/upload');
const { sendSuccessResponse, sendErrorResponse } = require('../../shared/utils/helpers/responseHelpers');

// Create new service
const createMentorService = async (req, res) => {
  try {
    const mentorId = req.user.id;
    const { title, description, category, packages, tags, location, availability } = req.body;

    console.log('🔧 Creating mentor service:', { mentorId, title, category });

    // Validate required fields
    if (!title || !description || !category || !packages || packages.length === 0) {
      return sendErrorResponse(res, 'Title, description, category, and at least one package are required', 400);
    }

    // Process uploaded images
    const uploadedFiles = processUploadedFiles(req, 'images');
    let imageUrls = uploadedFiles.map(file => file.url);

    // Get images from body (if pre-uploaded)
    if (req.body.images) {
      const bodyImages = typeof req.body.images === 'string'
        ? JSON.parse(req.body.images)
        : req.body.images;
      if (Array.isArray(bodyImages)) {
        imageUrls = [...bodyImages, ...imageUrls];
      }
    }

    // Create service data
    const serviceData = {
      mentorId,
      title,
      description,
      category,
      packages: typeof packages === 'string' ? JSON.parse(packages) : packages,
      images: imageUrls,
      tags: tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : [],
      location: location ? (typeof location === 'string' ? JSON.parse(location) : location) : {},
      availability: availability ? (typeof availability === 'string' ? JSON.parse(availability) : availability) : {}
    };

    const service = new MentorService(serviceData);
    await service.save();

    // Populate mentor information
    await service.populate('mentorId', 'profile firstName lastName');

    return sendSuccessResponse(res, 'MentorService created successfully', { service }, 201);
  } catch (error) {

    // Clean up uploaded files on error
    if (req.files) {
      cleanupFiles(req.files);
    }

    return sendErrorResponse(res, error.message || 'Failed to create service', 500);
  }
};

// Get mentor's own services
const getMyMentorServices = async (req, res) => {
  try {
    const mentorId = req.user.id;
    const { status, page = 1, limit = 10 } = req.query;

    const query = { mentorId };
    if (status) {
      query.status = status;
    }

    const services = await MentorService.find(query)
      .populate('mentorId', 'profile firstName lastName')
      .sort({ createdAt: -1 })
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
    const mentorId = req.user.id;

    const service = await MentorService.findOne({ _id: id, mentorId })
      .populate('mentorId', 'profile firstName lastName');

    if (!service) {
      return sendErrorResponse(res, 'MentorService not found', 404);
    }

    return sendSuccessResponse(res, 'MentorService retrieved successfully', { service });
  } catch (error) {
    return sendErrorResponse(res, 'Failed to retrieve service', 500);
  }
};

// Update service
const updateMentorService = async (req, res) => {
  try {
    const { id } = req.params;
    const mentorId = req.user.id;
    const updateData = req.body;

    console.log('🔧 Updating mentor service:', { id, mentorId, updateData });
    console.log('🔧 Update data types:', {
      title: typeof updateData.title,
      description: typeof updateData.description,
      category: typeof updateData.category,
      packages: typeof updateData.packages,
      tags: typeof updateData.tags
    });

    // Check if service exists and belongs to mentor
    const existingMentorService = await MentorService.findOne({ _id: id, mentorId });
    if (!existingMentorService) {
      return sendErrorResponse(res, 'MentorService not found', 404);
    }

    // Handle images: combination of existing (if not replaced by body), body images, and new uploads
    let finalImages = existingMentorService.images;

    // If images provided in body, they become the base (this supports reordering or removing images)
    if (updateData.images) {
      const bodyImages = typeof updateData.images === 'string'
        ? JSON.parse(updateData.images)
        : updateData.images;
      if (Array.isArray(bodyImages)) {
        finalImages = bodyImages;
        // Update updateData.images to the parsed array to ensure it's saved correctly
        updateData.images = bodyImages;
      }
    }

    // Process new uploaded images if any
    if (req.files && req.files.length > 0) {
      const uploadedFiles = processUploadedFiles(req, 'images');
      if (uploadedFiles.length > 0) {
        const newImageUrls = uploadedFiles.map(file => file.url);
        // Append new uploads to the final list
        finalImages = [...finalImages, ...newImageUrls];
        updateData.images = finalImages;
      }
    }

    // Parse JSON fields if they exist and are strings
    if (updateData.packages && typeof updateData.packages === 'string') {
      updateData.packages = JSON.parse(updateData.packages);
    }
    if (updateData.tags && typeof updateData.tags === 'string') {
      updateData.tags = JSON.parse(updateData.tags);
    }
    if (updateData.location && typeof updateData.location === 'string') {
      updateData.location = JSON.parse(updateData.location);
    }
    if (updateData.availability && typeof updateData.availability === 'string') {
      updateData.availability = JSON.parse(updateData.availability);
    }

    const service = await MentorService.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('mentorId', 'profile firstName lastName');

    if (!service) {
      return sendErrorResponse(res, 'Service not found after update', 404);
    }

    console.log('✅ Service updated successfully:', service.title);
    return sendSuccessResponse(res, 'MentorService updated successfully', { service });
  } catch (error) {
    console.error('❌ MentorService update error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    // Clean up uploaded files on error
    if (req.files) {
      cleanupFiles(req.files);
    }

    return sendErrorResponse(res, error.message || 'Failed to update service', 500);
  }
};

// Delete service
const deleteMentorService = async (req, res) => {
  try {
    const { id } = req.params;
    const mentorId = req.user.id;

    console.log('🗑️ Deleting mentor service:', { id, mentorId });

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log('❌ Invalid ObjectId format:', id);
      return sendErrorResponse(res, 'Invalid service ID format', 400);
    }

    const service = await MentorService.findOne({ _id: id, mentorId });
    if (!service) {
      console.log('❌ Service not found for deletion:', { id, mentorId });
      return sendErrorResponse(res, 'MentorService not found', 404);
    }

    console.log('✅ Service found for deletion:', service.title);

    // Actually delete the service from database
    const deletedService = await MentorService.findByIdAndDelete(id);

    if (!deletedService) {
      console.log('❌ Service not deleted from database');
      return sendErrorResponse(res, 'Failed to delete service from database', 500);
    }

    console.log('✅ Service deleted successfully:', deletedService.title);
    console.log('📤 Sending delete response...');
    return sendSuccessResponse(res, 'MentorService deleted successfully');
  } catch (error) {
    console.error('❌ MentorService delete error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return sendErrorResponse(res, error.message || 'Failed to delete service', 500);
  }
};

// Upload service images
const uploadMentorServiceImages = async (req, res) => {
  try {
    const { id } = req.params;
    const mentorId = req.user.id;

    // Check if service exists and belongs to mentor
    const service = await MentorService.findOne({ _id: id, mentorId });
    if (!service) {
      return sendErrorResponse(res, 'MentorService not found', 404);
    }

    // Process uploaded images
    const uploadedFiles = processUploadedFiles(req, 'images');
    const imageUrls = uploadedFiles.map(file => file.url);

    // Add new images to existing ones
    service.images = [...service.images, ...imageUrls];
    await service.save();

    return sendSuccessResponse(res, 'Images uploaded successfully', {
      images: service.images,
      newImages: imageUrls
    });
  } catch (error) {

    // Clean up uploaded files on error
    if (req.files) {
      cleanupFiles(req.files);
    }

    return sendErrorResponse(res, 'Failed to upload images', 500);
  }
};

// Remove service image
const removeMentorServiceImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { imageUrl } = req.body;
    const mentorId = req.user.id;

    const service = await MentorService.findOne({ _id: id, mentorId });
    if (!service) {
      return sendErrorResponse(res, 'MentorService not found', 404);
    }

    // Remove image from array
    service.images = service.images.filter(img => img !== imageUrl);
    await service.save();

    return sendSuccessResponse(res, 'Image removed successfully', {
      images: service.images
    });
  } catch (error) {
    return sendErrorResponse(res, 'Failed to remove image', 500);
  }
};

// Get service statistics
const getMentorServiceStats = async (req, res) => {
  try {
    const mentorId = req.user.id;

    const stats = await MentorService.aggregate([
      { $match: { mentorId: mentorId } },
      {
        $group: {
          _id: null,
          totalMentorServices: { $sum: 1 },
          activeMentorServices: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
          approvedMentorServices: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
          pendingMentorServices: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: '$totalReviews' }
        }
      }
    ]);

    return sendSuccessResponse(res, 'MentorService statistics retrieved successfully', {
      stats: stats[0] || {
        totalMentorServices: 0,
        activeMentorServices: 0,
        approvedMentorServices: 0,
        pendingMentorServices: 0,
        averageRating: 0,
        totalReviews: 0
      }
    });
  } catch (error) {
    return sendErrorResponse(res, 'Failed to retrieve service statistics', 500);
  }
};

module.exports = {
  createMentorService,
  getMyMentorServices,
  getMentorServiceById,
  updateMentorService,
  deleteMentorService,
  uploadMentorServiceImages,
  removeMentorServiceImage,
  getMentorServiceStats
};
