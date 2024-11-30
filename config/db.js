const mongoose = require('mongoose');

// Enable strict query filtering for Mongoose
mongoose.set('strictQuery', true);

const DBconnection = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline.bold);
    } catch (err) {
        console.error(`Database connection failed: ${err.message}`.red.bold);
        process.exit(1); // Exit process with failure
    }
};

module.exports = DBconnection;
