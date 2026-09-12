// This middleware checks if the logged-in user has the correct role
export const checkRole = (...allowedRoles) => {
    return (req, res, next) => {
        // req.user was attached by the 'protect' middleware, so 'protect' MUST run first
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            const error = new Error(`Access denied. Required role: ${allowedRoles.join(' or ')}`);
            error.status = 403; // 403 means Forbidden
            return next(error);
        }
        
        // User has the correct role, proceed
        next();
    };
};