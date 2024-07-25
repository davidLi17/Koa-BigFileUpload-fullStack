import axios from "axios";

const LHG = axios.create({
	baseURL: "/api",
	timeout: 5000,
});

LHG.interceptors.request.use(
	(config) => {
		// 请求拦截器逻辑
		return config;
	},
	(error) => {
		// 请求错误处理逻辑
		return Promise.reject(error);
	}
);

LHG.interceptors.response.use(
	(response) => {
		// 响应拦截器逻辑
		return response.data;
	},
	(error) => {
		// 响应错误处理逻辑
		return Promise.reject(error);
	}
);

export default LHG;
