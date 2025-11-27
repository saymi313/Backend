const User = require('../../shared/models/User');
const Booking = require('../../shared/models/Booking');
const ServiceFeedback = require('../../shared/models/ServiceFeedback');
const { sendSuccessResponse, sendErrorResponse } = require('../../shared/utils/helpers/responseHelpers');
const { USER_ROLES } = require('../../shared/utils/constants/roles');

// Get all users (mentees)
const getAllUsers = async (req, res) => {
  try {
    const { country = 'all', status = 'all', search = '' } = req.query;

    // Build query for mentees
    const query = { role: USER_ROLES.MENTEE };

    // Filter by status (active/inactive)
    if (status !== 'all') {
      query.isActive = status === 'active';
    }

    // Filter by country
    if (country !== 'all') {
      query['profile.country'] = country;
    }

    // Add search filter
    if (search) {
      const searchConditions = [
        { 'profile.firstName': { $regex: search, $options: 'i' } },
        { 'profile.lastName': { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];

      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          { $or: searchConditions }
        ];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    // Fetch users
    const users = await User.find(query)
      .select('email profile isActive createdAt')
      .sort({ createdAt: -1 });

    // Format response
    const formattedUsers = users.map(user => ({
      id: user._id.toString(),
      name: `${user.profile.firstName} ${user.profile.lastName}`,
      email: user.email,
      country: user.profile.country || 'N/A',
      status: user.isActive ? 'active' : 'inactive',
      createdAt: new Date(user.createdAt).toLocaleDateString()
    }));

    return sendSuccessResponse(res, 'Users retrieved successfully', {
      users: formattedUsers,
      total: formattedUsers.length
    });
  } catch (error) {
    console.error('Error getting all users:', error);
    return sendErrorResponse(res, 'Failed to retrieve users', 500);
  }
};

// Get user by ID with detailed information
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findOne({ _id: id, role: USER_ROLES.MENTEE });
    if (!user) {
      return sendErrorResponse(res, 'User not found', 404);
    }

    // Get user statistics
    const [bookingsCount, feedbacksCount, totalSpent] = await Promise.all([
      Booking.countDocuments({ menteeId: user._id }),
      ServiceFeedback.countDocuments({ menteeId: user._id }),
      Booking.aggregate([
        {
          $match: {
            menteeId: user._id,
            paymentStatus: 'paid'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalAmount' }
          }
        }
      ])
    ]);

    const totalSpentAmount = totalSpent.length > 0 ? totalSpent[0].total : 0;

    const userData = {
      id: user._id.toString(),
      name: `${user.profile.firstName} ${user.profile.lastName}`,
      email: user.email,
      phone: user.profile.phone || 'N/A',
      country: user.profile.country || 'N/A',
      timezone: user.profile.timezone || 'UTC',
      avatar: user.profile.avatar || '',
      status: user.isActive ? 'active' : 'inactive',
      isVerified: user.isVerified,
      bookingsCount,
      feedbacksCount,
      totalSpent: Math.round(totalSpentAmount * 100) / 100,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    return sendSuccessResponse(res, 'User retrieved successfully', { user: userData });
  } catch (error) {
    console.error('Error getting user:', error);
    return sendErrorResponse(res, 'Failed to retrieve user', 500);
  }
};

// Update user status (activate/deactivate)
const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return sendErrorResponse(res, 'isActive must be a boolean value', 400);
    }

    const user = await User.findOne({ _id: id, role: USER_ROLES.MENTEE });
    if (!user) {
      return sendErrorResponse(res, 'User not found', 404);
    }

    user.isActive = isActive;
    await user.save();

    return sendSuccessResponse(res, `User ${isActive ? 'activated' : 'deactivated'} successfully`, {
      user: {
        id: user._id.toString(),
        name: `${user.profile.firstName} ${user.profile.lastName}`,
        email: user.email,
        status: user.isActive ? 'active' : 'inactive'
      }
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    return sendErrorResponse(res, 'Failed to update user status', 500);
  }
};

// Get users by country for charts/statistics
const getUsersByCountry = async (req, res) => {
  try {
    const countryData = await User.aggregate([
      {
        $match: {
          role: USER_ROLES.MENTEE,
          isActive: true,
          'profile.country': { $exists: true, $ne: '' }
        }
      },
      {
        $group: {
          _id: '$profile.country',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          country: '$_id',
          count: 1,
          _id: 0
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    return sendSuccessResponse(res, 'Users by country retrieved successfully', {
      data: countryData
    });
  } catch (error) {
    console.error('Error getting users by country:', error);
    return sendErrorResponse(res, 'Failed to retrieve users by country', 500);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUserStatus,
  getUsersByCountry
};

