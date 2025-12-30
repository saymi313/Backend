# Input Sanitization - Testing Guide

## Quick Test Commands

### Test Valid Slugs (should work)
```bash
curl http://localhost:5000/api/mentees/mentors/soban-ahsan
curl http://localhost:5000/api/mentees/services/details/soban-ahsan/comprehensive-counselling
```

### Test Invalid Slugs (should return 400 Bad Request)

**Special characters:**
```bash
curl http://localhost:5000/api/mentees/mentors/john_doe
curl http://localhost:5000/api/mentees/mentors/John-Doe
curl http://localhost:5000/api/mentees/mentors/john..doe
```

**NoSQL Injection attempts:**
```bash
curl "http://localhost:5000/api/mentees/mentors/{\"\$gt\":\"\"}"
curl http://localhost:5000/api/mentees/mentors/;drop%20table
curl http://localhost:5000/api/mentees/mentors/../admin
```

**Too long:**
```bash
curl http://localhost:5000/api/mentees/mentors/$(python3 -c "print('a'*101)")
```

### Expected Responses

✅ **Valid slug**:
- Status: 200 OK
- Returns mentor/service data

❌ **Invalid slug**:
- Status: 400 Bad Request
- Message: "Invalid slug: only lowercase letters, numbers, and hyphens allowed"

❌ **Not found**:
- Status: 404 Not Found
- Message: "Mentor not found"

## Browser Testing

1. Open: `http://localhost:3000/mentees/mentor-details/soban-ahsan`
   - Should load correctly

2. Try injection: `http://localhost:3000/mentees/mentor-details/{"$gt":""}`
   - Should show error message about invalid slug

3. Try special chars: `http://localhost:3000/mentees/mentor-details/John_Doe`
   - Should show error message

## Implementation Summary

✅ Created sanitization utility (`sanitization.js`)
✅ Updated `mentorController.js` to sanitize slug inputs
✅ Updated `serviceController.js` to sanitize slug inputs
✅ Added validation for ObjectId and slug formats
✅ Added proper error handling (400 vs 404 vs 500)

**Security Features:**
- Whitelist validation (only `a-z`, `0-9`, `-`)
- Length limits (max 100 chars)
- Type checking
- Structure validation (no leading/trailing/consecutive hyphens)
- Protection against NoSQL injection
- Clear error messages for debugging
