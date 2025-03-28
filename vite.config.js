import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
	server: {
		proxy: {
			// 将所有以 /api 开头的请求代理到你的 Koa 服务器
			"/api": {
				target: "http://localhost:5321", // 假设你的 Koa 服务器运行在 3000 端口
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api/, ""),
			},
		},
	},
});
