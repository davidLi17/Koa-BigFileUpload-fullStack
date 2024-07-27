<template>
	<div class="file-item">
		<h2 class="green ellipsis-wrap">{{ file.name }}</h2>
		<p>文件大小: {{ formatSize(file.size) }}</p>
		<p>最后修改时间: {{ formatDate(file.lastModified) }}</p>
		<p>是否为目录: {{ file.isDirectory ? "是" : "否" }}</p>
		<button
			class="button"
			@click="downloadFile(file.name)"
			:disabled="file.isDirectory || downloading">
			{{ downloading ? "下载中" : "下载" }}
		</button>
		<button
			class="button delete-button"
			@click="deleteFile(file.name)"
			:disabled="file.isDirectory || downloading">
			删除
		</button>
		<div
			v-if="downloading"
			class="progress-container">
			<div
				class="progress-bar"
				:style="{ width: `${progress}%` }"></div>
			<span class="progress-text">{{ progress.toFixed(2) }}%</span>
		</div>
		<p
			v-if="downloading"
			class="speed-text">
			下载速度: {{ formatSpeed(speed) }}
		</p>
		<button
			v-if="paused"
			@click="resumeDownload"
			class="button">
			继续下载
		</button>
		<button
			v-if="downloading && !paused"
			@click="pauseDownload"
			class="button">
			暂停下载
		</button>
	</div>
</template>

<script setup>
	// 从 Vue 引入必要的函数
	import { toRefs, ref } from "vue";
	import axios from "axios"; // 引入 Axios 用于处理 HTTP 请求
	import Config from "@/config/config";

	const downLoadChunkSize = Config.DOWNLOAD_CHUNK_SIZE; // 定义下载块的大小为10MB
	// 定义 emit 事件，使父组件能够监听 'fileDeleted' 事件
	const emits = defineEmits(["fileDeleted"]);
	// 定义 props，接收父组件传递的文件对象
	const props = defineProps({
		file: Object,
	});

	// 使用 toRefs 将 props 解构，确保响应式
	const { file } = toRefs(props);
	// 定义响应式变量以跟踪下载状态和进度
	const progress = ref(0);
	const speed = ref(0);
	const downloading = ref(false);
	const paused = ref(false);
	const downloadedSize = ref(0);
	const fileSize = ref(0);
	const controller = ref(null); // 用于控制下载的 AbortController

	// 格式化文件大小以适应可读性
	const formatSize = (size) => {
		const i = Math.floor(Math.log(size) / Math.log(1024));
		return (
			(size / Math.pow(1024, i)).toFixed(2) * 1 +
			" " +
			["B", "kB", "MB", "GB", "TB"][i] // 返回合适的单位
		);
	};

	// 格式化日期字符串为本地时间字符串
	const formatDate = (dateString) => {
		const date = new Date(dateString);
		return date.toLocaleString();
	};

	// 格式化下载速度为可读的 MB/s
	const formatSpeed = (bytesPerSecond) => {
		return `${bytesPerSecond.toFixed(2)} MB/s`;
		return `${(bytesPerSecond / 1024 / 1024).toFixed(2)} MB/s`;
	};

	// 更新下载进度和速度
	const updateProgress = (p, s) => {
		// console.log(`now progress: ${p}, speed: ${s}`); // 控制台输出当前进度和速度
		progress.value = p; // 更新进度
		speed.value = s; // 更新速度
	};

	const downloadFile = async (filename) => {
		downloading.value = true; // 设置为正在下载
		paused.value = false; // 重置暂停状态
		controller.value = new AbortController(); // 创建新的 AbortController

		try {
			// 请求获取文件总大小
			const { data: totalSize } = await axios.get(`/api/file-size/${filename}`);
			fileSize.value = parseInt(totalSize); // 解析并存储总大小
			console.log(`Total file size: ${fileSize.value} Bytes`);

			// 如果文件小于最大下载块，直接下载
			if (fileSize.value <= downLoadChunkSize) {
				const response = await axios.get(`/api/download/${filename}`, {
					responseType: "blob",
					signal: controller.value.signal,
					onDownloadProgress: (progressEvent) => {
						const { loaded } = progressEvent;
						const currentProgress = (loaded / fileSize.value) * 100;
						updateProgress(currentProgress, loaded); // 使用 loaded 来更新速度
					},
				});
				const blob = response.data;
				downloadBlobAndReset(blob, filename);
				return;
			}

			// 循环下载文件，直到下载完成或被暂停
			while (downloading.value && !paused.value) {
				const response = await axios.get(`/api/download/${filename}`, {
					headers: {
						Range: `bytes=${downloadedSize.value}-${
							downloadedSize.value + downLoadChunkSize - 1
						}`,
					},
					responseType: "blob",
					signal: controller.value.signal,
					onDownloadProgress: (progressEvent) => {
						const { loaded } = progressEvent;
						const currentProgress =
							((downloadedSize.value + loaded) / fileSize.value) * 100;
						updateProgress(currentProgress, loaded);
					},
				});

				const blob = response.data;
				combineBlobs(blob); // 处理 Blob 合并逻辑
				downloadedSize.value += blob.size; // 更新已下载的大小

				// 如果下载的大小已达到或超过总大小，结束循环
				if (downloadedSize.value >= fileSize.value) {
					break;
				}
			}

			// 下载完成，触发下载文件到浏览器
			if (downloadedSize.value >= fileSize.value) {
				const completeBlob = window.downloadBlob; // 获取完整的 Blob
				downloadBlobAndReset(completeBlob, filename);
			}
		} catch (error) {
			handleDownloadError(error); // 处理下载错误
		}
	};

	// 处理 Blob 下载和重置
	const downloadBlobAndReset = (blob, filename) => {
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.style.display = "none";
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		window.URL.revokeObjectURL(url);

		// 重置状态
		downloading.value = false;
		paused.value = false;
		downloadedSize.value = 0;
		fileSize.value = 0;
		window.downloadBlob = null; // 清除下载的 Blob
	};

	// 处理 Blob 合并逻辑
	const combineBlobs = (blob) => {
		if (!window.downloadBlob) {
			window.downloadBlob = blob; // 第一个块直接赋值
		} else {
			window.downloadBlob = new Blob([window.downloadBlob, blob], {
				type: blob.type,
			});
		}
	};

	// 处理下载错误
	const handleDownloadError = (error) => {
		if (error.name === "AbortError") {
			console.log("Download paused");
		} else {
			console.error("Failed to download file:", error);
			downloading.value = false;
			paused.value = false; // 下载失败，重置状态
		}
	};
	// 暂停下载的函数
	const pauseDownload = () => {
		paused.value = true; // 设置为暂停状态
		controller.value.abort(); // 触发 AbortController 中止下载
	};

	// 恢复下载的函数
	const resumeDownload = () => {
		paused.value = false; // 设置为非暂停状态
		downloadFile(file.value.name); // 重新调用下载函数
	};

	// 删除文件的函数
	const deleteFile = async (filename) => {
		if (confirm("Are you sure you want to delete this file?")) {
			// 确认删除操作
			try {
				// 发送删除请求
				const response = await axios.post(`/api/delete/${filename}`);
				if (response.data.message === "success") {
					emits("fileDeleted", filename); // 触发 fileDeleted 事件，将文件名传回
				}
			} catch (error) {
				console.error("Failed to delete file:", error); // 处理删除失败的错误
			}
		}
	};
</script>
<style scoped>
	.file-item {
		flex: 1 1 calc(33.33% - 1rem);
		box-sizing: border-box;
		border: 1px solid #ccc;
		padding: 10px;
		margin: 10px 0;
	}

	.green {
		text-decoration: none;
		color: hsla(160, 100%, 37%, 1);
		transition: 0.4s;
		padding: 3px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.ellipsis-wrap {
		display: inline-block;
		max-width: 200px; /* 可以根据需要调整最大宽度 */
		white-space: normal;
		word-wrap: break-word;
		word-break: break-all;
	}

	.button {
		display: inline-block;
		padding: 10px 20px;
		font-size: 16px;
		font-weight: bold;
		text-align: center;
		text-decoration: none;
		background-color: #4caf50;
		color: white;
		border-radius: 5px;
		transition: background-color 0.3s ease;
		cursor: pointer;
		margin-right: 10px;
	}

	.button:hover {
		background-color: #45a049;
	}

	.button:active {
		background-color: #3e8e41;
		box-shadow: 0 5px #666;
		transform: translateY(4px);
	}

	.button:disabled {
		background-color: #cccccc;
		cursor: not-allowed;
	}

	.delete-button {
		background-color: #f44336;
	}

	.delete-button:hover {
		background-color: #d32f2f;
	}

	.delete-button:active {
		background-color: #b71c1c;
	}

	.progress-container {
		width: 100%;
		height: 20px;
		background-color: #f0f0f0;
		border-radius: 10px;
		margin-top: 10px;
		position: relative;
		overflow: hidden;
	}

	.progress-bar {
		height: 100%;
		background-color: #4caf50;
		transition: width 0.1s ease;
	}

	.progress-text {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		color: #000;
		font-weight: bold;
	}

	.speed-text {
		margin-top: 5px;
		font-weight: bold;
	}
</style>
