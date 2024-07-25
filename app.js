const Koa = require("koa");
const router = require("./routes");
const koaStatic = require("koa-static");
const path = require("path");
const koaBody = require("koa-body").default;
const chalk = require("chalk");

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

	const startMessage = `${formatter.format(start)} - ${ctx.method} ${
		ctx.path
	} - 开始`;
	console.log(chalk.blue(startMessage));

	await next();

	const end = new Date();
	const duration = end.getTime() - start.getTime();
	const endMessage = `${formatter.format(end)} - ${ctx.method} ${
		ctx.path
	} - 完成 (${duration} ms)`;

	if (ctx.status >= 500) {
		console.log(chalk.red(endMessage));
	} else if (ctx.status >= 400) {
		console.log(chalk.yellow(endMessage));
	} else if (ctx.status >= 300) {
		console.log(chalk.cyan(endMessage));
	} else {
		console.log(chalk.green(endMessage));
	}
});

app.use(koaBody());
app.use(router.routes()).use(router.allowedMethods());
app.use(koaStatic(path.join(__dirname, "uploads")));

app.listen(5321, () => {
	console.log(chalk.magenta("Server is running on http://localhost:5321"));
});
