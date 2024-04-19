import { Router } from "express";
import verifyJWT from "../middlewares/auth.middleware.js";
import {
    bookSlot,
    getAllSlots
} from "../controllers/slot.controller.js"

const router = Router();

router.route("/book-slot").post(verifyJWT, bookSlot);
router.route("/get-all-slots").get(getAllSlots);

export default router;
