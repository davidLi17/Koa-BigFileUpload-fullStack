const Koa = require("koa");
const Router = require("koa-router");

const app = new Koa();
const router = new Router();

// 处理查询参数
router.get("/search", async (ctx) => {
	const query = ctx.query;
	ctx.body = `You searched for: ${query.req}`;
});

// 处理路径参数
router.get("/users/:id", async (ctx) => {
	const id = ctx.params.id;
	ctx.body = `User ID: ${id}`;
});
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

	await next(); // 等待后续中间件和路由处理完成

	const end = new Date();
	const duration = end.getTime() - start.getTime(); // 计算总时长（毫秒）
	console.log(
		`${formatter.format(end)} - ${ctx.method} ${
			ctx.path
		} - 完成 (${duration} ms)`
	);
});

app.use(router.routes()).use(router.allowedMethods());

app.listen(3000, () => {
	console.log("Server is running on http://localhost:3000");
});
