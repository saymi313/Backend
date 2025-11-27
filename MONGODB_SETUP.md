# MongoDB Setup Guide

## Quick Setup Options

### Option 1: MongoDB Atlas (Recommended for Development)

1. **Create Free Account**
   - Go to https://cloud.mongodb.com
   - Sign up for a free account
   - Create a new project

2. **Create Cluster**
   - Click "Build a Database"
   - Choose "FREE" tier
   - Select a cloud provider and region
   - Name your cluster (e.g., "scholarslee-cluster")

3. **Create Database User**
   - Go to "Database Access"
   - Click "Add New Database User"
   - Choose "Password" authentication
   - Username: `scholarslee`
   - Password: `avenuescholars1234` (or your preferred password)
   - Database User Privileges: "Read and write to any database"

4. **Whitelist IP Address**
   - Go to "Network Access"
   - Click "Add IP Address"
   - For development: Add `0.0.0.0/0` (allows all IPs)
   - For production: Add your specific IP addresses

5. **Get Connection String**
   - Go to "Database" → "Connect"
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your actual password
   - Replace `<dbname>` with `scholarslee`

### Option 2: Local MongoDB

1. **Install MongoDB Community Server**
   - Download from https://www.mongodb.com/try/download/community
   - Install and start MongoDB service

2. **Update .env file**
   ```
   MONGODB_URI=mongodb://localhost:27017/scholarslee
   ```

### Option 3: MongoDB Atlas Free Tier (Quick Test)

Use this connection string for testing (replace credentials):

```
MONGODB_URI=mongodb+srv://scholarslee:avenuescholars1234@scholarslee.zrwttoj.mongodb.net/scholarslee?retryWrites=true&w=majority&appName=Scholarslee
```

**Note**: This connection string may not work if the cluster doesn't exist or credentials are incorrect.

## Testing Connection

After setting up MongoDB, test the connection:

```bash
# Start the server
npm run dev

# You should see:
# ✅ MongoDB Connected: cluster0.xxxxx.mongodb.net
# Database: scholarslee
```

## Troubleshooting

### Authentication Failed
- Check username and password in connection string
- Verify database user has correct permissions
- Ensure IP address is whitelisted in MongoDB Atlas

### Network Error
- Check internet connection
- Verify MongoDB Atlas cluster is running
- Check connection string format

### Connection Timeout
- Check firewall settings
- Verify MongoDB Atlas cluster status
- Try connecting from MongoDB Compass first

## Development Without Database

If you want to develop without setting up MongoDB:

1. The server will start successfully
2. Authentication endpoints will return errors
3. You can test the API structure and endpoints
4. Set up MongoDB when ready to test full functionality

## Production Considerations

- Use environment-specific connection strings
- Implement connection pooling
- Set up database monitoring
- Configure backup strategies
- Use MongoDB Atlas M10+ for production workloads
