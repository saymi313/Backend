const MentorService = require('../../MentorPanel/models/Service');
const { sendSuccessResponse, sendErrorResponse } = require('../../shared/utils/helpers/responseHelpers');

// Get all services
const getAllServices = async (req, res) => {
  try {
    const { status = 'all' } = req.query;

    // Build query
    const query = { isActive: true };
    if (status !== 'all') {
      query.status = status;
    }

    // Fetch services with mentor population
    const services = await MentorService.find(query)
      .populate('mentorId', 'firstName lastName')
      .sort({ createdAt: -1 });

    // Format response
    const formattedServices = services.map(service => ({
      id: service._id.toString(),
      title: service.title,
      mentor: service.mentorId 
        ? `${service.mentorId.firstName} ${service.mentorId.lastName}` 
        : 'Unknown Mentor',
      category: service.category,
      rating: service.rating ? service.rating.toFixed(1) : '0.0',
      status: service.status,
      createdAt: new Date(service.createdAt).toLocaleDateString()
    }));

    return sendSuccessResponse(res, 'Services retrieved successfully', {
      services: formattedServices,
      total: formattedServices.length
    });
  } catch (error) {
    console.error('Error getting services:', error);
    return sendErrorResponse(res, 'Failed to retrieve services', 500);
  }
};

// Get services grouped by category
const getServicesByCategory = async (req, res) => {
  try {
    const categoryData = await MentorService.aggregate([
      {
        $match: { isActive: true }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          category: '$_id',
          count: 1,
          _id: 0
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    return sendSuccessResponse(res, 'Services by category retrieved successfully', {
      data: categoryData
    });
  } catch (error) {
    console.error('Error getting services by category:', error);
    return sendErrorResponse(res, 'Failed to retrieve services by category', 500);
  }
};

module.exports = {
  getAllServices,
  getServicesByCategory
};

