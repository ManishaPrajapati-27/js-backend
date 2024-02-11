import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema(
  {
    subscriber: {
      type: Schema.Types.ObjectId, // One Who is subscribing
      ref: "User",
    },
    chennel: {
      type: Schema.Types.ObjectId, //One to Whom "Subscriber" is subscribing
      ref: "User",
    },
  },
  { timestamps: true }
);

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
