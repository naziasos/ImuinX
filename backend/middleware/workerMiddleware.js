const workerMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== "worker") {
    return res.status(403).json({
      message: "Access denied. Health worker only.",
    });
  }

  next();
};

module.exports = workerMiddleware;