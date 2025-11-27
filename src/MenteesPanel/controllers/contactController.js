const ContactMessage = require('../../shared/models/ContactMessage');
const { sendSuccessResponse, sendErrorResponse, sendValidationError } = require('../../shared/utils/helpers/responseHelpers');
const { validationResult } = require('express-validator');

// Create contact message
const createContactMessage = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendValidationError(res, errors.array());
    }

    const { firstName, lastName, email, phone, subject, message } = req.body;

    // Get userId if user is authenticated
    const userId = req.user ? req.user.id : null;

    // Create contact message
    const contactMessage = new ContactMessage({
      name: `${firstName} ${lastName}`.trim(),
      email: email.toLowerCase().trim(),
      phone: phone || '',
      subject: subject.trim(),
      message: message.trim(),
      userId: userId
    });

    await contactMessage.save();

    return sendSuccessResponse(res, 'Contact message submitted successfully', {
      contactMessage: {
        id: contactMessage._id,
        name: contactMessage.name,
        email: contactMessage.email,
        subject: contactMessage.subject
      }
    });
  } catch (error) {
    console.error('Error creating contact message:', error);
    return sendErrorResponse(res, 'Failed to submit contact message', 500);
  }
};

module.exports = {
  createContactMessage
};

