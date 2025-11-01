const mongoose = require('mongoose');
require('dotenv').config();

async function resetDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/music-app', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    await mongoose.connection.dropDatabase();
    console.log('Database reset successfully');
  } catch (error) {
    console.error('Error resetting database:', error);
  } finally {
    mongoose.connection.close();
  }
}

resetDatabase();