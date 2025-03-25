const Koa = require("koa"); // 引入Koa框架
const router = require("./routes"); // 引入路由配置文件
const koaStatic = require("koa-static"); // 引入静态文件服务中间件
const path = require("path"); // 引入Node.js路径处理模块
const koaBody = require("koa-body").default; // 引入处理请求体中间件
const chalk = require("chalk"); // 引入chalk库，用于美化控制台输出
const cors = require('@koa/cors'); // 引入跨域资源共享中间件

// 配置集中管理
const config = {
	port: process.env.PORT || 5321, // 服务器端口号，优先从环境变量中获取，默认为5321
	staticDir: path.join(__dirname, "uploads"), // 静态文件目录路径
	bodyOptions: {
		multipart: true, // 启用文件上传功能
		formidable: {
			maxFileSize: 20000 * 1024 * 1024, // 设置上传文件大小限制为: 20000MB=20GB
			uploadDir: path.join(__dirname, "uploads"), // 设置上传目录
		}
	},
	corsOptions: {
		origin: '*', // 允许所有来源的跨域请求
		allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'], // 允许的HTTP方法
		allowHeaders: ['Content-Type', 'Authorization'], // 允许的请求头
	}
};

const app = new Koa(); // 创建一个Koa实例

// 错误处理中间件
app.use(async (ctx, next) => {
	try {
		await next(); // 继续执行后续中间件
	} catch (err) {
		console.error(chalk.red('Server Error:'), err); // 使用chalk库输出红色错误信息
		ctx.status = err.status || 500; // 设置响应状态码，默认为500
		ctx.body = {
			success: false, // 标记请求失败
			message: err.message || '服务器内部错误', // 错误信息
			...(process.env.NODE_ENV === 'development' && { stack: err.stack }), // 开发环境下添加错误堆栈信息
		};
		ctx.app.emit('error', err, ctx); // 触发错误事件
	}
});

// 日志中间件
app.use(async (ctx, next) => {
	const start = Date.now(); // 记录请求开始时间
	const formatter = new Intl.DateTimeFormat("zh-CN", { // 创建日期时间格式化对象
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});

	const requestTime = new Date();
	const requestLog = `${formatter.format(requestTime)} - ${ctx.method} ${ctx.url} - 开始`; // 构造请求开始日志
	console.log(chalk.blue(requestLog)); // 使用chalk库输出蓝色日志

	await next(); // 继续执行后续中间件

	const duration = Date.now() - start; // 计算请求处理时长
	let logFn = chalk.green; // 默认使用绿色输出日志

	if (ctx.status >= 500) logFn = chalk.red; // 状态码>=500，使用红色
	else if (ctx.status >= 400) logFn = chalk.yellow; // 状态码>=400，使用黄色
	else if (ctx.status >= 300) logFn = chalk.cyan; // 状态码>=300，使用青色

	const responseLog = `${formatter.format(new Date())} - ${ctx.method} ${ctx.url} - ${ctx.status} - 完成 (${duration}ms)`; // 构造响应完成日志
	console.log(logFn(responseLog)); // 输出日志
});

// 中间件注册
app.use(cors(config.corsOptions)); // 使用cors中间件处理跨域请求
app.use(koaBody(config.bodyOptions)); // 使用koaBody中间件处理请求体
app.use(router.routes()).use(router.allowedMethods()); // 使用路由中间件
app.use(koaStatic(config.staticDir, { // 使用koaStatic中间件提供静态文件服务
	maxage: 24 * 60 * 60 * 1000, // 设置缓存时间为1天
}));

// 应用启动
const server = app.listen(config.port, () => {
	console.log(chalk.magenta(`Server is running on http://localhost:${config.port}`)); // 使用chalk库输出品红色启动信息
});

// 优雅关闭
process.on('SIGINT', () => { // 监听SIGINT信号（通常是Ctrl+C）
	console.log(chalk.yellow('\n正在关闭服务器...')); // 使用chalk库输出黄色信息
	server.close(() => { // 关闭服务器
		console.log(chalk.yellow('服务器已安全关闭')); // 使用chalk库输出黄色信息
		process.exit(0); // 退出进程
	});
});

module.exports = app; // 导出app实例，供测试或其他用途