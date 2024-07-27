const Router = require("koa-router");
const koaBody = require("koa-body").default;
const userController = require("./controllers/userController");
const fileController = require("./controllers/fileController.js");
const auth = require("./middlewares/auth");

const router = new Router();

// 用户路由
router.post("/register", userController.register);
router.post("/login", userController.login);

// 文件路由
router.post("/upload", koaBody({ multipart: true }), fileController.upload);
router.post("/upload/complete", fileController.completeUpload);
router.get("/download/:filename", fileController.download);
router.get("/file-size/:filename", fileController.getFileSize);
router.get("/download-multi", fileController.downloadMulti);
router.get("/files", fileController.getFileList);
router.post("/delete/:filename", fileController.deleteFile);
// 受保护的路由示例
router.get("/protected", auth, async (ctx) => {
	console.log(ctx.state.user);
	ctx.body = `Hello ${ctx.state.user.username}, you have access to this protected route.`;
});

// 处理所有请求方法的参数
router.all("/echo", async (ctx) => {
	console.log(ctx.request.body); // 没有包含这个中间件,所以无法进行对应的body赋值,麻了
	ctx.body = {
		method: ctx.method,
		query: ctx.query,
		params: ctx.params,
		body: ctx.request.body,
		headers: ctx.headers,
	};
});

module.exports = router;
