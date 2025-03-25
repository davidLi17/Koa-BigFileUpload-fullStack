const jwt = require('jsonwebtoken');
const Koa = require('koa');

// 将配置移到单独的配置文件
const config = {
	JWT_SECRET: process.env.JWT_SECRET || 'LHG666',
	TOKEN_EXPIRES_IN: '24h',
	TOKEN_PREFIX: 'Bearer'
};

/**
 * 统一的错误响应处理
 */
const createErrorResponse = (status, message) => ({
	status,
	error: {
		message,
		timestamp: new Date().toISOString()
	}
});

/**
 * Token 验证工具函数
 */
const verifyToken = async (token, secret) => {
	try {
		return await jwt.verify(token, secret);
	} catch (error) {
		if (error.name === 'TokenExpiredError') {
			throw new Error('Token has expired');
		}
		throw new Error('Invalid token');
	}
};

/**
 * JWT Authentication Middleware for Koa
 * 
 * This middleware verifies the JWT token in the Authorization header.
 * If the token is valid, the decoded user information is added to ctx.state.user
 * and the request continues to the next middleware.
 * If the token is invalid or missing, the middleware responds with a 401 Unauthorized status.
 *
 * @param {Koa.Context} ctx - Koa context object，表示当前请求的上下文
 * @param {() => Promise<void>} next - Function to invoke the next middleware in the stack
 * @returns {Promise<void>} - A Promise that resolves when the middleware completes
 * @throws {Error} - If token verification fails
 * 
 * @example
 * // Apply the middleware to a specific route
 * router.get('/protected', authMiddleware, (ctx) => {
 *   const user = ctx.state.user;
 *   ctx.body = { message: `Hello ${user.username}!` };
 * });
 * 
 * // Apply the middleware to all routes
 * app.use(authMiddleware);
 */
module.exports = async (ctx, next) => {
	const authHeader = ctx.headers.authorization;
	if (!authHeader) {
		ctx.status = 401;
		ctx.body = createErrorResponse(401, 'No token provided');
		return;
	}

	const [prefix, token] = authHeader.split(' ');

	if (prefix !== config.TOKEN_PREFIX || !token) {
		ctx.status = 401;
		ctx.body = createErrorResponse(401, 'Invalid token format');
		return;
	}

	try {
		const decoded = await verifyToken(token, config.JWT_SECRET);

		// 添加用户信息到上下文
		ctx.state.user = {
			id: decoded.id,
			username: decoded.username,
			role: decoded.role,
			tokenIssueTime: decoded.iat
		};

		// 记录访问日志
		console.log(`User ${decoded.username} accessed ${ctx.path} at ${new Date().toISOString()}`);

		await next();
	} catch (error) {
		ctx.status = 401;
		ctx.body = createErrorResponse(401, error.message);
	}
};
