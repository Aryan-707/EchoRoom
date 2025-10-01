
import { getMessages, uploadFile } from "../controllers/MessagesControllers.js";

import { verifyToken } from "../middlewares/AuthMiddleware.js";
import { Router } from "express";
import upload, { upload1 } from "../middlewares/multer.js";


export const messagesRoutes=Router();
messagesRoutes.post("/get-messages",verifyToken,getMessages)
messagesRoutes.post("/upload-file",verifyToken,upload1.single("file"),uploadFile)