const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const colors = require('colors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const fileupload = require('express-fileupload');
const helmet = require('helmet');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const cors = require('cors');
const getPort = require('get-port');

const errorHandler = require('./middleware/error');
const DBConnection = require('./config/db');

// Load environment variables
dotenv.config({ path: './config/.env' });

// Validate environment variables
const validateEnv = () => {
    const requiredVars = ['MONGO_URI', 'JWT_SECRET'];
    requiredVars.forEach((envVar) => {
        if (!process.env[envVar]) {
            console.error(`Missing environment variable: ${envVar}`.red);
            process.exit(1); // Exit process if required variables are missing
        }
    });
};
validateEnv();

// Connect to database
DBConnection();

// Route files
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const categoryRoutes = require('./routes/categories');
const videoRoutes = require('./routes/videos');
const commentRoutes = require('./routes/comments');
const replyRoutes = require('./routes/replies');
const feelingRoutes = require('./routes/feelings');
const subscriptionRoutes = require('./routes/subscriptions');
const historiesRoutes = require('./routes/histories');
const searchRoutes = require('./routes/search');

// Initialize express app
const app = express();

// Middleware
app.use(express.json()); // Body parser
app.use(cookieParser()); // Cookie parser

// Logging middleware for development
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// File uploading
app.use(
    fileupload({
        createParentPath: true,
    })
);

// Sanitize data to prevent NoSQL injection
app.use(mongoSanitize());

// Set security headers
app.use(helmet());

// Prevent XSS attacks
app.use(xss());

// Enable CORS
app.use(cors());

// Rate limiting
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Prevent HTTP param pollution
app.use(hpp());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API versioning
const versionOne = (routeName) => `/api/v1/${routeName}`;

// Mount routes
app.use(versionOne('auth'), authRoutes);
app.use(versionOne('users'), userRoutes);
app.use(versionOne('categories'), categoryRoutes);
app.use(versionOne('videos'), videoRoutes);
app.use(versionOne('comments'), commentRoutes);
app.use(versionOne('replies'), replyRoutes);
app.use(versionOne('feelings'), feelingRoutes);
app.use(versionOne('subscriptions'), subscriptionRoutes);
app.use(versionOne('histories'), historiesRoutes);
app.use(versionOne('search'), searchRoutes);

// Error handler middleware
app.use(errorHandler);

// Dynamic port assignment
(async () => {
    const PORT = await getPort({ port: parseInt(process.env.PORT, 10) || 5000 });

    const server = app.listen(PORT, () => {
        console.log(
            `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold
        );
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
        console.error(`Unhandled Rejection: ${err.message}`.red);
        server.close(() => process.exit(1));
    });

    // Graceful shutdown for termination signals
    const shutdownHandler = (signal) => {
        console.log(`${signal} received: shutting down gracefully.`.yellow);
        server.close(() => {
            console.log('Server closed.'.green);
            process.exit(0);
        });
    };

    process.on('SIGTERM', shutdownHandler);
    process.on('SIGINT', shutdownHandler);

    // Handle server errors
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`Port ${PORT} is already in use.`.red);
            process.exit(1);
        } else {
            console.error(`Server error: ${err.message}`.red);
        }
    });
})();
