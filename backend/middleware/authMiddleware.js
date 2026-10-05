const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Authorization header check
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    // Get token
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Authentication token missing",
      });
    }

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    /*
      Different login implementations may store
      user ID as:
      - _id
      - id
      - userId
    */

    const userId =
      decoded._id ||
      decoded.id ||
      decoded.userId;

    if (!userId) {
      return res.status(401).json({
        message: "User ID not found in authentication token",
      });
    }

    /*
      Keep all decoded information and normalize
      the user ID to req.user._id
    */

    req.user = {
      ...decoded,
      _id: userId,
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error.message);

    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};

module.exports = authMiddleware;