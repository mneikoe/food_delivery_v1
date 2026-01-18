const roleCheck = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      // Log for debugging (user role mismatch)
      console.log(`Role check failed: User role '${req.user.role}' not in allowed roles: [${allowedRoles.join(", ")}]`);
      return res.status(403).json({ 
        error: `Insufficient permissions. Required role: ${allowedRoles.join(" or ")}` 
      });
    }

    next();
  };
};

module.exports = roleCheck;
