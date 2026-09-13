const mongoose = require('mongoose');
const dns = require('dns');

// Some networks/ISPs don't resolve the DNS SRV records that mongodb+srv:// URIs
// need, causing "querySrv ECONNREFUSED" even with correct credentials.
// Forcing Node to use Google's public DNS avoids that.
dns.setServers(['8.8.8.8', '1.1.1.1']);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);

    mongoose.connection.on('error', (err) => {
      console.error(`MongoDB connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected');
    });
  } catch (error) {
    console.error(`Failed to connect to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
