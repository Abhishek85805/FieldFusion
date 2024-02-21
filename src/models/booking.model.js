import mongoose, { Schema } from "mongoose";

const bookingSchema = new Schema(
    {
        date: {
            type: Date,
            required: true,
        }, 
        startTime: {
            type: Date,
            required: true,
        }, 
        endTime: {
            type: Date,
            required: true,
        },
        status: {
            type: String,
            required: true,
            trim: true
        }
    },
    {
        timestamps: true,
    }
);

export const Booking = mongoose.model("Booking", bookingSchema);