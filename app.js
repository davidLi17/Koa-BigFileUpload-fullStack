const Koa = require("koa");
const router = require("./routes");
const koaStatic = require("koa-static");
const path = require("path");
const koaBody = require("koa-body").default;

const app = new Koa();

// 日志中间件
app.use(async (ctx, next) => {
	const start = new Date();
	const formatter = new Intl.DateTimeFormat("zh-CN", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});
	console.log(`${formatter.format(start)} - ${ctx.method} ${ctx.path} - 开始`);

	await next();

	const end = new Date();
	const duration = end.getTime() - start.getTime();
	console.log(
		`${formatter.format(end)} - ${ctx.method} ${
			ctx.path
		} - 完成 (${duration} ms)`
	);
});

app.use(koaBody());
app.use(router.routes()).use(router.allowedMethods());
app.use(koaStatic(path.join(__dirname, "uploads")));

app.listen(5000, () => {
	console.log("Server is running on http://localhost:5000");
});
