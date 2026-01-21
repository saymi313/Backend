const User = require('../../shared/models/User');
const Booking = require('../../shared/models/Booking');
const Meeting = require('../../shared/models/Meeting');
const MentorService = require('../../MentorPanel/models/Service');
const MentorProfile = require('../../MentorPanel/models/MentorProfile');
const PayoutRequest = require('../../shared/models/PayoutRequest');
const { sendSuccessResponse, sendErrorResponse } = require('../../shared/utils/helpers/responseHelpers');
const { USER_ROLES } = require('../../shared/utils/constants/roles');

// Get dashboard metrics
const getDashboardMetrics = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Revenue MTD: Sum of totalAmount from paid bookings in current month
    const revenueMTDResult = await Booking.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          createdAt: { $gte: startOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' }
        }
      }
    ]);
    const revenueMTD = revenueMTDResult.length > 0 ? revenueMTDResult[0].total : 0;

    // Mentees: Count of active mentees
    const mentees = await User.countDocuments({
      role: USER_ROLES.MENTEE,
      isActive: true
    });

    // Active Mentors: Count of active mentors with approved profiles
    const activeMentors = await User.countDocuments({
      role: USER_ROLES.MENTOR,
      isActive: true
    });

    // Active Services: Count of approved and active services
    const activeServices = await MentorService.countDocuments({
      status: 'approved',
      isActive: true
    });

    // Pending Payouts: Count of pending withdrawal requests
    const payoutsPending = await PayoutRequest.countDocuments({
      status: 'pending'
    });

    return sendSuccessResponse(res, 'Dashboard metrics retrieved successfully', {
      revenueMTD: Math.round(revenueMTD * 100) / 100, // Round to 2 decimal places
      mentees,
      activeMentors,
      activeServices,
      payoutsPending
    });
  } catch (error) {
    console.error('Error getting dashboard metrics:', error);
    return sendErrorResponse(res, 'Failed to retrieve dashboard metrics', 500);
  }
};

// Get revenue chart data
const getRevenueChart = async (req, res) => {
  try {
    const { range = '7d' } = req.query;
    const now = new Date();
    let data = [];

    if (range === '7d') {
      // Last 7 days
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const startOfDay = new Date(d.setHours(0, 0, 0, 0));
        const endOfDay = new Date(d.setHours(23, 59, 59, 999));

        days.push({
          date: new Date(startOfDay),
          label: d.toLocaleDateString('en-US', { weekday: 'short' }),
          key: d.toISOString().slice(0, 10)
        });
      }

      // Aggregate data for each day
      for (const day of days) {
        const startOfDay = new Date(day.date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(day.date);
        endOfDay.setHours(23, 59, 59, 999);

        // Calculate user load: active users (users involved in meetings/bookings) + new registrations
        // Get distinct user IDs from meetings and bookings in this period
        const [meetingMentorIds, meetingMenteeIds, bookingMentorIds, bookingMenteeIds, newUsersCount] = await Promise.all([
          Meeting.distinct('mentorId', { createdAt: { $gte: startOfDay, $lte: endOfDay } }),
          Meeting.distinct('menteeId', { createdAt: { $gte: startOfDay, $lte: endOfDay } }),
          Booking.distinct('mentorId', { createdAt: { $gte: startOfDay, $lte: endOfDay } }),
          Booking.distinct('menteeId', { createdAt: { $gte: startOfDay, $lte: endOfDay } }),
          User.countDocuments({ createdAt: { $gte: startOfDay, $lte: endOfDay } })
        ]);

        // Combine all user IDs and get unique count
        const allActiveUserIds = [...new Set([
          ...meetingMentorIds.map(id => id.toString()),
          ...meetingMenteeIds.map(id => id.toString()),
          ...bookingMentorIds.map(id => id.toString()),
          ...bookingMenteeIds.map(id => id.toString())
        ])];

        // Count active users (users who participated in meetings or bookings)
        const activeUsersCount = allActiveUserIds.length;

        // User load = active users + new registrations
        const userLoad = activeUsersCount + newUsersCount;

        data.push({
          m: day.label,
          v: userLoad || 0
        });
      }
    } else if (range === 'monthly') {
      // Last 12 months
      const months = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
          date: d,
          label: d.toLocaleDateString('en-US', { month: 'short' }),
          key: `${d.getFullYear()}-${d.getMonth()}`
        });
      }

      for (const month of months) {
        const startOfMonth = new Date(month.date.getFullYear(), month.date.getMonth(), 1);
        const endOfMonth = new Date(month.date.getFullYear(), month.date.getMonth() + 1, 0, 23, 59, 59, 999);

        // Calculate user load for monthly view
        const [meetingMentorIds, meetingMenteeIds, bookingMentorIds, bookingMenteeIds, newUsersCount] = await Promise.all([
          Meeting.distinct('mentorId', { createdAt: { $gte: startOfMonth, $lte: endOfMonth } }),
          Meeting.distinct('menteeId', { createdAt: { $gte: startOfMonth, $lte: endOfMonth } }),
          Booking.distinct('mentorId', { createdAt: { $gte: startOfMonth, $lte: endOfMonth } }),
          Booking.distinct('menteeId', { createdAt: { $gte: startOfMonth, $lte: endOfMonth } }),
          User.countDocuments({ createdAt: { $gte: startOfMonth, $lte: endOfMonth } })
        ]);

        const allActiveUserIds = [...new Set([
          ...meetingMentorIds.map(id => id.toString()),
          ...meetingMenteeIds.map(id => id.toString()),
          ...bookingMentorIds.map(id => id.toString()),
          ...bookingMenteeIds.map(id => id.toString())
        ])];

        const activeUsersCount = allActiveUserIds.length;
        const userLoad = activeUsersCount + newUsersCount;

        data.push({
          m: month.label,
          v: userLoad || 0
        });
      }
    } else if (range === 'yearly') {
      // Last 5 years
      const years = [];
      for (let i = 4; i >= 0; i--) {
        const year = now.getFullYear() - i;
        years.push({
          year,
          label: String(year),
          key: String(year)
        });
      }

      for (const yearData of years) {
        const startOfYear = new Date(yearData.year, 0, 1);
        const endOfYear = new Date(yearData.year, 11, 31, 23, 59, 59, 999);

        // Calculate user load for yearly view
        const [meetingMentorIds, meetingMenteeIds, bookingMentorIds, bookingMenteeIds, newUsersCount] = await Promise.all([
          Meeting.distinct('mentorId', { createdAt: { $gte: startOfYear, $lte: endOfYear } }),
          Meeting.distinct('menteeId', { createdAt: { $gte: startOfYear, $lte: endOfYear } }),
          Booking.distinct('mentorId', { createdAt: { $gte: startOfYear, $lte: endOfYear } }),
          Booking.distinct('menteeId', { createdAt: { $gte: startOfYear, $lte: endOfYear } }),
          User.countDocuments({ createdAt: { $gte: startOfYear, $lte: endOfYear } })
        ]);

        const allActiveUserIds = [...new Set([
          ...meetingMentorIds.map(id => id.toString()),
          ...meetingMenteeIds.map(id => id.toString()),
          ...bookingMentorIds.map(id => id.toString()),
          ...bookingMenteeIds.map(id => id.toString())
        ])];

        const activeUsersCount = allActiveUserIds.length;
        const userLoad = activeUsersCount + newUsersCount;

        data.push({
          m: yearData.label,
          v: userLoad || 0
        });
      }
    }

    return sendSuccessResponse(res, 'Revenue chart data retrieved successfully', { data });
  } catch (error) {
    console.error('Error getting revenue chart data:', error);
    return sendErrorResponse(res, 'Failed to retrieve revenue chart data', 500);
  }
};

// Get users by country
const getUsersByCountry = async (req, res) => {
  try {
    const countryData = await User.aggregate([
      {
        $match: {
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
        $sort: { count: -1 }
      }
    ]);

    // Calculate total for percentage calculation
    const total = countryData.reduce((sum, item) => sum + item.count, 0);
    const threshold = total * 0.05; // 5% threshold

    // Group small countries into "Others"
    const result = [];
    let othersCount = 0;

    for (const item of countryData) {
      if (item.count >= threshold) {
        result.push({
          country: item._id,
          count: item.count
        });
      } else {
        othersCount += item.count;
      }
    }

    if (othersCount > 0) {
      result.push({
        country: 'Others',
        count: othersCount
      });
    }

    return sendSuccessResponse(res, 'Users by country retrieved successfully', { data: result });
  } catch (error) {
    console.error('Error getting users by country:', error);
    return sendErrorResponse(res, 'Failed to retrieve users by country', 500);
  }
};

// Get top services
const getTopServices = async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    // Get services with booking counts, grouped by service title
    const topServices = await Booking.aggregate([
      {
        $match: {
          paymentStatus: 'paid'
        }
      },
      {
        $lookup: {
          from: 'mentorservices',
          localField: 'serviceId',
          foreignField: '_id',
          as: 'service'
        }
      },
      {
        $unwind: {
          path: '$service',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $match: {
          'service.status': 'approved',
          'service.isActive': true
        }
      },
      {
        $group: {
          _id: '$service.title',
          soldCount: { $sum: 1 },
          category: { $first: '$service.category' },
          mentorIds: { $addToSet: '$service.mentorId' }
        }
      },
      {
        $project: {
          title: '$_id',
          category: 1,
          soldCount: 1,
          mentorsCount: { $size: '$mentorIds' }
        }
      },
      {
        $sort: { soldCount: -1 }
      },
      {
        $limit: parseInt(limit)
      }
    ]);

    return sendSuccessResponse(res, 'Top services retrieved successfully', {
      data: topServices
    });
  } catch (error) {
    console.error('Error getting top services:', error);
    return sendErrorResponse(res, 'Failed to retrieve top services', 500);
  }
};

// Get transactions chart data (revenue over time)
const getTransactionsChart = async (req, res) => {
  try {
    const { range = '7d' } = req.query;
    const now = new Date();
    let data = [];

    if (range === '7d') {
      // Last 7 days
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const startOfDay = new Date(d);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(d);
        endOfDay.setHours(23, 59, 59, 999);

        const result = await Booking.aggregate([
          {
            $match: {
              paymentStatus: 'paid',
              createdAt: { $gte: startOfDay, $lte: endOfDay }
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$totalAmount' }
            }
          }
        ]);

        const total = result.length > 0 ? result[0].total : 0;
        data.push({
          x: d.toLocaleDateString('en-US', { weekday: 'short' }),
          y: Math.round(total * 100) / 100
        });
      }
    } else if (range === 'monthly') {
      // Last 12 months
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
        const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

        const result = await Booking.aggregate([
          {
            $match: {
              paymentStatus: 'paid',
              createdAt: { $gte: startOfMonth, $lte: endOfMonth }
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$totalAmount' }
            }
          }
        ]);

        const total = result.length > 0 ? result[0].total : 0;
        data.push({
          x: d.toLocaleDateString('en-US', { month: 'short' }),
          y: Math.round(total * 100) / 100
        });
      }
    } else if (range === 'yearly') {
      // Last 5 years
      for (let i = 4; i >= 0; i--) {
        const year = now.getFullYear() - i;
        const startOfYear = new Date(year, 0, 1);
        const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);

        const result = await Booking.aggregate([
          {
            $match: {
              paymentStatus: 'paid',
              createdAt: { $gte: startOfYear, $lte: endOfYear }
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$totalAmount' }
            }
          }
        ]);

        const total = result.length > 0 ? result[0].total : 0;
        data.push({
          x: String(year),
          y: Math.round(total * 100) / 100
        });
      }
    }

    return sendSuccessResponse(res, 'Transactions chart data retrieved successfully', { data });
  } catch (error) {
    console.error('Error getting transactions chart data:', error);
    return sendErrorResponse(res, 'Failed to retrieve transactions chart data', 500);
  }
};

// Get mentor leaderboard
const getMentorLeaderboard = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Get all mentors with their services and revenue
    const mentors = await User.find({
      role: USER_ROLES.MENTOR,
      isActive: true
    }).populate('profile');

    const leaderboardData = await Promise.all(
      mentors.map(async (mentor) => {
        // Get approved services count
        const servicesSold = await MentorService.countDocuments({
          mentorId: mentor._id,
          status: 'approved',
          isActive: true
        });

        // Get revenue from paid bookings
        const revenueResult = await Booking.aggregate([
          {
            $match: {
              mentorId: mentor._id,
              paymentStatus: 'paid'
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$totalAmount' }
            }
          }
        ]);
        const revenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

        // Get mentor profile for rating and badge
        const mentorProfile = await MentorProfile.findOne({ userId: mentor._id });

        return {
          id: mentor._id.toString(),
          name: `${mentor.profile.firstName} ${mentor.profile.lastName}`,
          email: mentor.email,
          rating: mentorProfile?.rating || 0,
          badges: mentorProfile?.badge ? [mentorProfile.badge] : [],
          servicesSold,
          revenue: Math.round(revenue * 100) / 100
        };
      })
    );

    // Sort by services sold, then revenue, then rating
    leaderboardData.sort((a, b) => {
      if (b.servicesSold !== a.servicesSold) {
        return b.servicesSold - a.servicesSold;
      }
      if (b.revenue !== a.revenue) {
        return b.revenue - a.revenue;
      }
      return b.rating - a.rating;
    });

    // Limit results
    const limitedData = leaderboardData.slice(0, parseInt(limit));

    return sendSuccessResponse(res, 'Mentor leaderboard retrieved successfully', {
      data: limitedData
    });
  } catch (error) {
    console.error('Error getting mentor leaderboard:', error);
    return sendErrorResponse(res, 'Failed to retrieve mentor leaderboard', 500);
  }
};

module.exports = {
  getDashboardMetrics,
  getRevenueChart,
  getUsersByCountry,
  getTopServices,
  getMentorLeaderboard,
  getTransactionsChart
};

