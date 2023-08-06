import mongoose from "mongoose";

const subscriptionSchema = mongoose.Schema(
  {
    userid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    startDate: {
      type: Date,
      required: true,

    },
    endDate: {
      type: Date,
      required: true,

    },
    active: {
      type: Boolean,
      required: true,
      default: false

    }
  },
  { timestamps: true }
);

const Subscription = mongoose.model('Subscription', subscriptionSchema);

export default Subscription;
