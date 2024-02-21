import { Router } from "express";
import {upload} from "../middlewares/multer.middleware.js";
import {register as userRegister, login as userLogin, logout as userLogout} from "../controllers/user.controller.js";
import verifyJWT from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        }
    ]),
    userRegister
);
router.route("/login").post(userLogin);
router.route("/logout").post(
    verifyJWT,
    userLogout
)

export default router;
