const jwt = require('jsonwebtoken');
const SECRET_KEY = "LHG666";

const auth = async (ctx, next) => {
    try {
        const token = ctx.headers.authorization?.split(' ')[1];

        if (!token) {
            ctx.status = 401;
            ctx.body = { success: false, message: "Authorization token required" };
            return;
        }

        const decoded = jwt.verify(token, SECRET_KEY);
        ctx.state.user = decoded;

        await next();
    } catch (error) {
        ctx.status = 401;
        ctx.body = { success: false, message: "Invalid token" };
    }
};

module.exports = auth;
