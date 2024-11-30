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

const errorHandler = require('./middleware/error');
const DBConnection = require('./config/db');

// Load environment variables
dotenv.config({ path: './config/.env' });

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

const app = express();

// Body parser
app.use(express.json());

// Cookie parser
app.use(cookieParser());

// Dev logging middleware
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// File uploading
app.use(
    fileupload({
        createParentPath: true,
    })
);

// Sanitize data
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

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

// API versioning
const versionOne = (routeName) => `/api/v1/${routeName}`;

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

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log(
        `We are live in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow.bold
    );
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`.red);
    // Close server & exit process
    server.close(() => process.exit(1));
});
