import express from 'express';
import {
  authUser,
  registerUser,
  logoutUser,
  getUserProfile,
  updateUserProfile,
  getartwork,
  addSubscription,
  getSubscription,
  deleteSubscription,
  getUsers,
  deleteUser,
  resetPassword,
  updatePassword
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';
import { sendContactEmail } from '../controllers/userController.js';
import nodemailer from 'nodemailer';


const router = express.Router();

router.post('/', registerUser);
router.post('/auth', authUser);
router.post('/logout', logoutUser);
router
  .route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);
router.post('/contact', sendContactEmail);
router.post('/addsubscription', addSubscription);
router.get('/getsubscription/:userid', getSubscription)
router.delete('/deletesubscription/:userid', deleteSubscription);
router.get('/getartworks', getartwork)
router.get('/getusers', getUsers)
router.delete('/deleteuser/:userid', deleteUser)
router.post('/forgetpassword', resetPassword)
router.put('/updatepassword', updatePassword); // Add this route for updating the password
export default router;
