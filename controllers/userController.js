import asyncHandler from 'express-async-handler';
import User from '../models/userModel.js';
import generateToken from '../utils/generateToken.js';
import nodemailer from 'nodemailer';
import Subscription from '../models/subscriptionModel.js';
import axios from 'axios'
import redis from "redis"
import crypto from 'crypto';

const redisclient = redis.createClient({ // Corrected variable name to redisclient
  host: '127.0.0.1',
  port: 6379,
});
redisclient.connect()
redisclient.on('connect', () => {
  console.log('Connected to Redis server');
});

redisclient.on('error', (err) => {
  console.error('Redis Error:', err);
});


// @desc    Auth user & get token
// @route   POST /api/users/auth
// @access  Public
const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    generateToken(res, user._id);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      preference: user.preference,
    });
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, phone, preference, password, cpassword } = req.body;
  const userExists = await User.findOne({ email });

  // console.log({name, email, phone, preference, password, cpassword})
  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }
  if (!name || !email || !phone || !preference || !password || !cpassword) {
    return res.status(400).json({ error: 'Please provide all required fields' });
  }
  const user = await User.create({
    name, email, phone, preference, password, cpassword,
  });

  if (user) {
    generateToken(res, user._id);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      preference: user.preference,
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

// @desc    Logout user / clear cookie
// @route   POST /api/users/ out
// @access  Public
const logoutUser = (req, res) => {
  res.clearCookie('jwt', '', {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).json({ message: 'Logged out successfully' });
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,         // Include the 'phone' field
      preference: user.preference,   // Include the 'preference' field
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});


// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.phone = req.body.phone || user.phone;
    user.preference = req.body.preference || user.preference;

    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});



// @desc    Send contact form email
// @route   POST /api/users/contact
// @access  Public
const sendContactEmail = asyncHandler(async (req, res) => {
  const { name, email, subject, message } = req.body;
  // console.log({ name, email, message })

  // Create a transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'shivampatel868@gmail.com',
      pass: 'cskkcvfzdswlcwkp',
    },
  });

  const mailOptions = {
    from: 'Magicentertainment@FUN.com',
    to: 'shivampatel868@yahoo.com',
    subject: subject,
    text: `New Message From:
    Name: ${name},
    Email: ${email},
    Message: ${message}`,
  };

  transporter
    .sendMail(mailOptions)
    .then((info) => {
      res.status(200).json({ message: 'Email Sent successfully' });
    })
    .catch((error) => {
      console.log(error);
    });

});

const addSubscription = asyncHandler(async (req, res) => {
  const { userid, startDate, endDate, active } = req.body;

  try {
    let existingSubscription = await Subscription.findOne({ userid });

    if (existingSubscription) {
      // Check if the endDate from req.body is provided and valid
      if (endDate && new Date(endDate) > new Date()) {
        const existingEndDate = new Date(existingSubscription.endDate);
        const endDateToAdd = new Date(endDate);

        // Calculate the time difference in milliseconds
        const timeDifference = endDateToAdd - new Date();

        // Add the time difference to the existing endDate
        existingEndDate.setTime(existingEndDate.getTime() + timeDifference);
        existingSubscription.endDate = existingEndDate;
      }

      existingSubscription.active = active;

      const updatedSubscription = await existingSubscription.save();
      res.status(200).json(updatedSubscription);
    } else {
      // Create a new subscription
      if (!userid || !startDate || !active) {
        return res.status(400).json({ error: 'userid, startDate, and active are required fields' });
      }

      const newSubscription = await Subscription.create({
        userid,
        startDate,
        endDate: endDate ? new Date(endDate) : null, // Convert endDate to Date if provided
        active,
      });
      res.status(201).json(newSubscription);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

const getSubscription = asyncHandler(async (req, res) => {
  const userId = req.params.userid;

  try {
    const data = await Subscription.findOne({ userid: userId });
    if (!data) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    res.json(data);


  } catch (err) {
    res.status(500).json({ error: 'Error fetching data from the database' });
  }
});


const deleteSubscription = asyncHandler(async (req, res) => {
  const userId = req.params.userid;

  try {
    const deletedSubscription = await Subscription.deleteOne({ userid: userId });

    if (deletedSubscription.deletedCount === 0) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    res.json({ message: 'Subscription deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting subscription' });
  }
});

const getartwork = asyncHandler(async (req, res) => {
  try {
    const cachedData = await redisclient.get('artworks'); // Use a unique key (e.g., 'artworks') for the Redis cache

    if (cachedData) {
      const responseDataRedis = JSON.parse(cachedData); // Parse the cached data back to an array of objects
      res.json(responseDataRedis);
    } else {
      const apiKey = '1XhjQJNH';
      const apiUrl = 'https://www.rijksmuseum.nl/api/en/collection';

      const response = await axios.get(apiUrl, {
        params: {
          key: apiKey,
          format: 'json',
          imgonly: true,
          ps: 500000,
        },
      });

      const responseData = response.data.artObjects || [];
      await redisclient.set('artworks', JSON.stringify(responseData)); // Store the data in the Redis cache with the key 'artworks'

      res.json(responseData);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while fetching data.', apiError: error.message });
  }
});

const getUsers = asyncHandler(async (req, res) => {
  try {
    const excludedUserId = "64be7487c7e3c685cd39cb1d"; // The user ID to exclude
    const data = await User.find({ _id: { $ne: excludedUserId } });

    if (!data) {
      return res.status(404).json({ error: 'No Users not found' });
    }
    res.json(data);

  } catch (err) {
    res.status(500).json({ error: 'Error fetching data from the database' });
  }
})

const deleteUser = asyncHandler(async (req, res) => {
  const userId = req.params.userid;

  try {
    const deleteUserResult = await User.deleteOne({ _id: userId });

    if (deleteUserResult.deletedCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    // console.error(err);
    res.status(500).json({ error: 'Error deleting user' });
  }
});

const resetPassword = asyncHandler(async (req, res) => {
  const { resetemail } = req.body;

  // 1. Find the user in the database based on the provided email address.
  const user = await User.findOne({ email: resetemail });

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // 2. Generate a password reset token and store it in the user's document in the database.
  const token = crypto.randomBytes(20).toString('hex');
  user.resetPasswordToken = token;
  user.resetPasswordExpires = Date.now() + 3600000; // Token valid for 1 hour

  await user.save();

  // Create a transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'shivampatel868@gmail.com',
      pass: 'cskkcvfzdswlcwkp',
    },
  });

  const mailOptions = {
    from: 'Magicentertainment@FUN.com',
    to: resetemail,
    subject: 'Password Reset',
    text: `Reset Your Password with the given link: http://localhost:3000/updatepassword/${token}`,
  };

  transporter
    .sendMail(mailOptions)
    .then((info) => {
      res.status(200).json({ message: 'Password reset email sent successfully' });
    })
    .catch((error) => {
      console.log(error);
      res.status(500).json({ message: 'Failed to send reset password email' });
    });
});

const updatePassword = asyncHandler(async (req, res) => {
  const {token, password } = req.body;
  // const token = 'f377c3bfe25467f203cc793925a353f9f2bf39ed'
  // console.log({ token, password })

  try {
    // Find the user with the matching reset token and resetPasswordExpires not expired
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    // Update the user's password and resetPasswordToken fields
    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to reset password. Please try again.' });
  }
});



export {
  authUser,
  registerUser,
  logoutUser,
  getUserProfile,
  updateUserProfile,
  sendContactEmail,
  addSubscription,
  getSubscription,
  deleteSubscription,
  getartwork,
  getUsers,
  deleteUser,
  resetPassword,
  updatePassword,
};
