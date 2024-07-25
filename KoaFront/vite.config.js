import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueDevTools from "vite-plugin-vue-devtools";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [vue(), vueDevTools()],
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
	},
	server: {
		proxy: {
			// 将所有以 /api 开头的请求代理到你的 Koa 服务器
			"/api": {
				target: "http://localhost:5321", // 假设你的 Koa 服务器运行在 3000 端口
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api/, ""),
			},
			// 单独处理上传请求
			"/upload": {
				target: "http://localhost:5321",
				changeOrigin: true,
			},
		},
	},
});
