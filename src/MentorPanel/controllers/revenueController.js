const mongoose = require('mongoose');
const Payment = require('../../shared/models/Payment');
const Booking = require('../../shared/models/Booking');
const User = require('../../shared/models/User');
const { sendSuccessResponse, sendErrorResponse } = require('../../shared/utils/helpers/responseHelpers');

const toObjectId = (id) => new mongoose.Types.ObjectId(id);

const getMentorRevenueDashboard = async (req, res) => {
  try {
    // Check feature flag for payouts
    const Settings = require('../../shared/models/Settings');
    const settings = await Settings.getSettings();
    const payoutsEnabled = settings.featureFlags?.enablePayouts ?? true;

    if (!payoutsEnabled) {
      console.log('⚠️  Revenue/payouts feature is disabled');
      return sendErrorResponse(res, 'Payout features are currently disabled by administrator', 403);
    }

    const mentorId = req.user.id;
    const mentorObjectId = toObjectId(mentorId);

    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startOfWindow = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const succeededMatch = {
      mentorId: mentorObjectId,
      status: 'succeeded',
    };

    const [
      statsAgg,
      activeStudentsCount,
      completedSessions,
      pendingRevenueAgg,
      salesActivity,
      visitorInsights,
      topServices,
      recentTransactions,
      recentStudents,
    ] = await Promise.all([
      Payment.aggregate([
        { $match: { mentorId: mentorObjectId } },
        {
          $facet: {
            total: [
              { $match: { status: 'succeeded' } },
              { $group: { _id: null, total: { $sum: '$mentorAmount' } } },
            ],
            currentPeriod: [
              {
                $match: {
                  status: 'succeeded',
                  createdAt: { $gte: startOfThisMonth },
                },
              },
              { $group: { _id: null, total: { $sum: '$mentorAmount' } } },
            ],
            previousPeriod: [
              {
                $match: {
                  status: 'succeeded',
                  createdAt: { $gte: startOfLastMonth, $lt: startOfThisMonth },
                },
              },
              { $group: { _id: null, total: { $sum: '$mentorAmount' } } },
            ],
          },
        },
      ]),
      Payment.distinct('menteeId', succeededMatch),
      Booking.countDocuments({ mentorId: mentorObjectId, status: 'completed' }),
      Payment.aggregate([
        {
          $match: {
            mentorId: mentorObjectId,
            status: { $in: ['pending', 'processing'] },
          },
        },
        { $group: { _id: null, total: { $sum: '$mentorAmount' } } },
      ]),
      Payment.aggregate([
        {
          $match: {
            ...succeededMatch,
            createdAt: { $gte: startOfWindow },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            revenue: { $sum: '$mentorAmount' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      Payment.aggregate([
        {
          $match: {
            mentorId: mentorObjectId,
            createdAt: { $gte: startOfWindow },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            succeeded: {
              $sum: {
                $cond: [{ $eq: ['$status', 'succeeded'] }, 1, 0],
              },
            },
            pending: {
              $sum: {
                $cond: [{ $in: ['$status', ['pending', 'processing']] }, 1, 0],
              },
            },
            refunded: {
              $sum: {
                $cond: [{ $eq: ['$status', 'refunded'] }, 1, 0],
              },
            },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      Payment.aggregate([
        { $match: succeededMatch },
        {
          $group: {
            _id: '$serviceId',
            serviceTitle: { $first: '$serviceTitle' },
            revenue: { $sum: '$mentorAmount' },
            sales: { $sum: 1 },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 4 },
      ]),
      Payment.find({ mentorId: mentorObjectId })
        .sort({ createdAt: -1 })
        .limit(6)
        .populate('menteeId', 'profile.firstName profile.lastName profile.avatar email')
        .lean(),
      Payment.aggregate([
        { $match: succeededMatch },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: '$menteeId',
            lastPaymentAt: { $first: '$createdAt' },
          },
        },
        { $limit: 8 },
      ]),
    ]);

    const totals = statsAgg[0] || {};
    const totalRevenue = totals.total?.[0]?.total || 0;
    const currentRevenue = totals.currentPeriod?.[0]?.total || 0;
    const previousRevenue = totals.previousPeriod?.[0]?.total || 0;
    const revenueChange =
      previousRevenue === 0
        ? currentRevenue > 0
          ? 100
          : 0
        : ((currentRevenue - previousRevenue) / previousRevenue) * 100;

    const stats = {
      totalRevenue,
      currentRevenue,
      revenueChange,
      activeStudents: activeStudentsCount.length,
      completedSessions,
      pendingRevenue: pendingRevenueAgg?.[0]?.total || 0,
      currency: 'usd',
    };

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const makeLabel = (item) => `${monthNames[item._id.month - 1]} ${item._id.year}`;

    const salesActivityData = salesActivity.map((item) => ({
      label: makeLabel(item),
      revenue: item.revenue,
    }));

    const visitorInsightsData = visitorInsights.map((item) => ({
      label: makeLabel(item),
      succeeded: item.succeeded,
      pending: item.pending,
      refunded: item.refunded,
    }));

    const mapServiceTitle = (service) =>
      (service.serviceTitle && service.serviceTitle.trim()) || 'Unnamed Service';

    const topServicesData = topServices.map((service, index) => ({
      rank: index + 1,
      serviceId: service._id,
      name: mapServiceTitle(service),
      revenue: service.revenue,
      sales: service.sales,
    }));

    const recentTransactionsData = recentTransactions.map((payment) => ({
      id: payment._id,
      mentee: payment.menteeId
        ? `${payment.menteeId.profile?.firstName || ''} ${payment.menteeId.profile?.lastName || ''}`.trim()
        : 'Unknown mentee',
      avatar: payment.menteeId?.profile?.avatar || '',
      serviceTitle: payment.serviceTitle || payment.metadata?.get?.('serviceTitle') || 'Service',
      amount: payment.mentorAmount,
      status: payment.status,
      createdAt: payment.createdAt,
    }));

    const menteeIds = recentStudents.map((item) => item._id);
    const menteeProfiles = menteeIds.length
      ? await User.find({ _id: { $in: menteeIds } })
        .select('profile.firstName profile.lastName profile.country profile.avatar')
        .lean()
      : [];

    const menteeProfileMap = menteeProfiles.reduce((acc, mentee) => {
      acc[mentee._id.toString()] = mentee;
      return acc;
    }, {});

    const recentStudentsData = recentStudents.map((student) => {
      const profile = menteeProfileMap[student._id.toString()];
      const firstName = profile?.profile?.firstName || '';
      const lastName = profile?.profile?.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim() || 'Student';

      return {
        menteeId: student._id,
        name: fullName,
        country: profile?.profile?.country || 'Unknown',
        avatar: profile?.profile?.avatar || '',
        lastPaymentAt: student.lastPaymentAt,
      };
    });

    return sendSuccessResponse(res, 'Mentor revenue dashboard data', {
      stats,
      salesActivity: salesActivityData,
      visitorInsights: visitorInsightsData,
      topServices: topServicesData,
      recentTransactions: recentTransactionsData,
      recentStudents: recentStudentsData,
    });
  } catch (error) {
    console.error('Error generating mentor revenue dashboard:', error);
    return sendErrorResponse(res, 'Failed to load revenue dashboard', 500);
  }
};

module.exports = {
  getMentorRevenueDashboard,
};

