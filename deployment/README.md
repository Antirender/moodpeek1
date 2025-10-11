# MoodPeek Deployment Package

This folder contains the production-ready files for deploying the MoodPeek application.

## Structure

```
deployment/
├── client-dist/          # Production build of React frontend
│   ├── index.html       # Entry HTML file
│   └── assets/          # Bundled CSS, JS, and other assets
├── index.js             # Main server entry point
├── models/              # MongoDB data models
├── routes/              # API route handlers
├── services/            # Business logic and external services
├── package.json         # Server dependencies
├── package-lock.json    # Locked dependency versions
├── .env.example         # Environment variable template
└── README.md           # This file
```

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root of the deployment folder with the following variables:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/moodpeek
WEATHER_API_KEY=your_openweathermap_api_key_here
```

See `.env.example` for a template.

### 3. Start the Server

For production:
```bash
node index.js
```

The server will:
- Serve the React frontend from `client-dist/` folder
- Provide API endpoints at `/api/*`
- Connect to MongoDB using the provided URI

### 4. Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

## Deployment Options

### Option 1: Traditional Hosting (VPS/Cloud Server)

1. Upload the entire `deployment/` folder to your server
2. Install Node.js on the server
3. Run `npm install --production`
4. Set up environment variables
5. Use PM2 or similar to run `node index.js` as a service
6. Configure Nginx or Apache as a reverse proxy (optional)

### Option 2: Platform-as-a-Service (Heroku, Render, Railway)

1. Push the deployment folder to a Git repository
2. Connect your repository to the platform
3. Set environment variables in the platform dashboard
4. The platform will automatically detect `package.json` and run `node index.js`

### Option 3: Docker

Create a `Dockerfile` in the deployment folder:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]
```

Build and run:
```bash
docker build -t moodpeek .
docker run -p 3000:3000 --env-file .env moodpeek
```

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Server port | No | 3000 |
| `MONGODB_URI` | MongoDB connection string | Yes | - |
| `WEATHER_API_KEY` | OpenWeatherMap API key | Yes | - |

## Production Considerations

- **Database**: Ensure MongoDB is properly secured and backed up
- **API Keys**: Keep your `.env` file secure and never commit it to version control
- **HTTPS**: Use a reverse proxy (Nginx) with SSL certificates for HTTPS
- **Monitoring**: Consider adding logging and monitoring services
- **Scaling**: For high traffic, consider load balancing and database replication

## Troubleshooting

### Server won't start
- Check that all environment variables are set in `.env`
- Verify MongoDB is running and accessible
- Check that port 3000 is not already in use

### Frontend not loading
- Ensure `client-dist/` folder is present and contains `index.html`
- Check server logs for any static file serving errors

### API errors
- Verify MongoDB connection string is correct
- Check that all required collections are created
- Review server logs for detailed error messages

## Support

For issues or questions, please refer to the main project repository or documentation.

---

**Generated**: October 2025  
**Version**: 1.0.0
