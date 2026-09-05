import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import dotenv from "dotenv";

dotenv.config();

// This middleware protects routes by verifying the JWT token
export const protect = async (req, res, next) => {
  console.log("protect headers:", req.headers);

  const authorizationHeader = Object.entries(req.headers).find(
    ([name]) => name.toLowerCase() === "authorization",
  )?.[1];
  const tokenMatch = String(authorizationHeader || "")
    .trim()
    .match(/^Bearer\s+(\S+)$/i);
  const token = tokenMatch?.[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        const error = new Error("User not found");
        error.status = 404;
        throw error;
      }

      next();
    } catch (error) {
      console.error("❌ Token verification failed:", error.message);
      const authError = new Error("Not authorized, token failed or expired");
      authError.status = 401;
      next(authError);
    }
  } else {
    const authError = new Error("Not authorized, no token provided");
    authError.status = 401;
    next(authError);
  }
};
