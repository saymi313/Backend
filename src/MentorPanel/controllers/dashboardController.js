const mongoose = require('mongoose');
const Payment = require('../../shared/models/Payment');
const Booking = require('../../shared/models/Booking');
const Service = require('../models/Service');
const { sendSuccessResponse, sendErrorResponse } = require('../../shared/utils/helpers/responseHelpers');

const toObjectId = (id) => new mongoose.Types.ObjectId(id);

/**
 * Get mentor dashboard statistics
 */
const getMentorDashboardStats = async (req, res) => {
    try {
        const mentorId = req.user.id;
        const mentorObjectId = toObjectId(mentorId);

        // Run all queries in parallel for better performance
        const [
            totalStudents,
            totalSalesAgg,
            totalServices,
            processingOrders,
            completedOrders,
            totalOrders
        ] = await Promise.all([
            // Total unique students who made successful payments
            Payment.distinct('menteeId', {
                mentorId: mentorObjectId,
                status: 'succeeded'
            }),

            // Total sales from successful payments (mentor's amount after platform fee)
            Payment.aggregate([
                {
                    $match: {
                        mentorId: mentorObjectId,
                        status: 'succeeded'
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$mentorAmount' }
                    }
                }
            ]),

            // Total services offered by mentor
            Service.countDocuments({
                mentorId: mentorObjectId,
                isActive: true
            }),

            // Processing orders (pending, confirmed bookings)
            Booking.countDocuments({
                mentorId: mentorObjectId,
                status: { $in: ['pending', 'confirmed'] }
            }),

            // Completed orders
            Booking.countDocuments({
                mentorId: mentorObjectId,
                status: 'completed'
            }),

            // Total orders (all bookings)
            Booking.countDocuments({
                mentorId: mentorObjectId
            })
        ]);

        const stats = {
            totalStudents: totalStudents.length,
            totalSales: totalSalesAgg[0]?.total || 0,
            totalServices: totalServices,
            processingOrders: processingOrders,
            completedOrders: completedOrders,
            totalOrders: totalOrders,
            currency: 'usd'
        };

        return sendSuccessResponse(res, 'Dashboard stats fetched successfully', stats);
    } catch (error) {
        console.error('Error fetching mentor dashboard stats:', error);
        return sendErrorResponse(res, 'Failed to load dashboard stats', 500);
    }
};

/**
 * Get upcoming sessions for dashboard
 */
const getUpcomingSessions = async (req, res) => {
    try {
        const mentorId = req.user.id;
        const mentorObjectId = toObjectId(mentorId);
        const Meeting = require('../../shared/models/Meeting');
        const User = require('../../shared/models/User');

        const now = new Date();
        console.log(`📅 Fetching upcoming sessions for Mentor: ${mentorId}`);
        console.log(`🕒 Current Server Time: ${now.toISOString()}`);

        // Get upcoming meetings (next 7 days)
        const upcomingMeetings = await Meeting.find({
            mentorId: mentorObjectId,
            status: { $in: ['scheduled', 'in-progress'] },
            scheduledDate: { $gte: now }
        })
            .sort({ scheduledDate: 1 })
            .limit(5)
            .populate('menteeId', 'profile.firstName profile.lastName profile.country')
            .populate('serviceId', 'title')
            .lean();

        console.log(`✅ Found ${upcomingMeetings.length} upcoming meetings`);
        if (upcomingMeetings.length === 0) {
            // Check if there are ANY meetings for this mentor, ignoring date/status
            const allMeetings = await Meeting.countDocuments({ mentorId: mentorObjectId });
            console.log(`ℹ️  Total meetings in DB for this mentor (any status/time): ${allMeetings}`);
        }

        const sessions = upcomingMeetings.map(meeting => {
            const mentee = meeting.menteeId;
            const firstName = mentee?.profile?.firstName || '';
            const lastName = mentee?.profile?.lastName || '';
            const studentName = `${firstName} ${lastName}`.trim() || 'Unknown Student';

            const scheduledDate = new Date(meeting.scheduledDate);
            const date = scheduledDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
            const time = scheduledDate.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            });

            return {
                id: meeting._id,
                serviceName: meeting.serviceId?.title || 'Service',
                studentName: studentName,
                date: date,
                time: time,
                country: mentee?.profile?.country || 'Unknown',
                scheduledAt: meeting.scheduledDate
            };
        });

        return sendSuccessResponse(res, 'Upcoming sessions fetched successfully', sessions);
    } catch (error) {
        console.error('Error fetching upcoming sessions:', error);
        return sendErrorResponse(res, 'Failed to load upcoming sessions', 500);
    }
};

module.exports = {
    getMentorDashboardStats,
    getUpcomingSessions
};
