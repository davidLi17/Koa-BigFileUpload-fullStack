const jwt = require("jsonwebtoken");
const SECRET_KEY = "LHG666";

module.exports = async (ctx, next) => {
	const token =
		ctx.headers.authorization && ctx.headers.authorization.split(" ")[1];
	if (token) {
		try {
			const decoded = jwt.verify(token, SECRET_KEY);
			ctx.state.user = decoded;
			await next();
		} catch (err) {
			ctx.status = 401;
			ctx.body = "Invalid token";
		}
	} else {
		ctx.status = 401;
		ctx.body = "No token provided";
	}
};
