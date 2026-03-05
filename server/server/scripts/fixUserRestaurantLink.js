const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Restaurant = require('../models/Restaurant');

const fixUserRestaurantLink = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('MongoDB connected');

    const user = await User.findOne({ email: 'test@restaurant.com' });
    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }

    const restaurant = await Restaurant.findOne({ ownerId: user._id });

    if (restaurant) {
      console.log('Found restaurant:', restaurant.name);
      console.log('Restaurant ID:', restaurant._id);

      // Update user with restaurant reference
      user.restaurant = restaurant._id;
      await user.save();

      console.log('✅ User updated with restaurant reference');
    } else {
      console.log('❌ No restaurant found for this user');
    }

    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

fixUserRestaurantLink();
