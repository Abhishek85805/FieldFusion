import moment from 'moment';
import nodemailer from 'nodemailer'
import { User } from "../models/user.model.js";
import { Slot } from "../models/slot.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

const convertStringToHours = (startTime, endTime) => {
    let startTimeAdjusted = parseInt(startTime.slice(0, -2)); 
    const startTimeMeridiem = startTime.slice(-2); 
    let endTimeAdjusted = parseInt(endTime.slice(0, -2));
    const endTimeMeridiem = endTime.slice(-2); 

    if (startTimeMeridiem === 'PM' && startTimeAdjusted !== 12) {
        startTimeAdjusted += 12;
    }
    if (endTimeMeridiem === 'PM' && endTimeAdjusted !== 12) {
        endTimeAdjusted += 12;
    }

    return {startTimeAdjusted, endTimeAdjusted};
}

const createSlotsForDay = (date) => {
    const startTime = moment(`${date}T05:00:00`); 
    const endTime = moment(`${date}T23:00:00`);

    const interval = 1;
    const slots = [];

    while (startTime.isBefore(endTime)) {
        const slot = {
            date: startTime.format('YYYY-MM-DD'),
            startTime: startTime.hour(),
            endTime: startTime.add(interval, 'hours').hour(),
            status: 'available', 
        };
        slots.push(slot);
    }

    return slots;
}

const bookSlot = asyncHandler(async(req, res) => {
    const {date, startTime, endTime, status} = req.body;
    if([date, startTime, endTime, status].some(field => field.trim()==="")){
        throw new ApiError(400, "All the fields are required!!");
    }

    const {startTimeAdjusted, endTimeAdjusted} = convertStringToHours(startTime, endTime);
    console.log(startTimeAdjusted, endTimeAdjusted);

    const existingSlots = await Slot.find({
        $or: [
            { $and: [{ date: date }, { startTime: { $lt: endTimeAdjusted } }, { endTime: { $gt: startTimeAdjusted} }] }, // New slot starts before existing slot ends and ends after existing slot starts
            { $and: [{ date: date }, { startTime: { $gte: startTimeAdjusted } }, { endTime: { $lte: endTimeAdjusted } }] } // Existing slot is completely within the new slot's timing
        ]
    });

    if(existingSlots.length > 0){
        throw new ApiError(409, "Slot is already booked");
    }

    const slot = await Slot.create({
        date,
        startTime : startTimeAdjusted,
        endTime : endTimeAdjusted,
        status : "booked",
        owner: req.user._id
    });
    if(!slot){
        throw new ApiError(500, "Something went wrong while booking for slot");
    }

    const user = await User.findById(req.user._id);
    user.bookingHistory.push(slot?._id);
    user.save({validateBeforeSave: true});

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            slot,
            "Slot booked successfully"
        )
    )
});

const getAllSlots = asyncHandler(async(req, res) => {
    const slots = await Slot.find({});

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            slots,
            "Slots fetched successfully"
        )
    );
})

const getAvailableSlots = asyncHandler(async(req, res) => {
    const {date} = req.body;
    if(!date) throw new ApiError(400, "date is required");

    const bookedSlots = await Slot.find({date: date})

    const allSlots = createSlotsForDay(date);

    const availableSlots = allSlots.filter(slot => {
        for (const bookedSlot of bookedSlots) {
          if (
            slot.date === bookedSlot.date &&
            slot.startTime >= bookedSlot.startTime &&
            slot.endTime <= bookedSlot.endTime
          ) {
            return false;
          }
        }
        return true;
    });

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            availableSlots,
            "Available Slots fetched successfully"
        )
    )
})

const mail = asyncHandler(async(req, res) => {
    const {mailId} = req.body;
    if(!mailId) throw new ApiError(400, "Mail Id is required");

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.MAIL_ID,
            pass: process.env.MAIL_ID_PASS
        },
    });

    const info = await transporter.sendMail({
        from: process.env.MAIL_ID,
        to: mailId,
        subject: "Confirmation",
        text: "Slot is booked successfully",
    });

    return res.status(200).json({
        status: "success",
        data: info,
        message: "Email sent successfully"
    });
});

export {
    bookSlot,
    getAllSlots,
    getAvailableSlots,
    mail
}