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
			v-if="downloading"
			@click="downloading = false"
			class="button">
			继续下载
		</button>
	</div>
</template>
<script setup>
	import { toRefs, ref } from "vue";
	import axios from "axios";

	const emits = defineEmits(["fileDeleted"]);
	const props = defineProps({
		file: Object,
	});

	const { file } = toRefs(props);
	const progress = ref(0);
	const speed = ref(0);
	const downloading = ref(false);

	const formatSize = (size) => {
		const i = Math.floor(Math.log(size) / Math.log(1024));
		return (
			(size / Math.pow(1024, i)).toFixed(2) * 1 +
			" " +
			["B", "kB", "MB", "GB", "TB"][i]
		);
	};

	const formatDate = (dateString) => {
		const date = new Date(dateString);
		return date.toLocaleString();
	};

	const formatSpeed = (bytesPerSecond) => {
		return `${(bytesPerSecond / 1024 / 1024).toFixed(2)} MB/s`;
	};
	const updateProgress = (p, s) => {
		progress.value = p;
		speed.value = s;
	};
	const downloadFile = async (filename) => {
		downloading.value = true;
		try {
			const response = await axios.get(`/api/download/${filename}`, {
				responseType: "blob",
				onDownloadProgress: (progressEvent) => {
					const { event } = progressEvent;

					if (progressEvent.lengthComputable) {
						const percentCompleted = Math.round(
							(progressEvent.loaded * 100) / progressEvent.total
						);
						const speed = progressEvent.loaded / (event.timeStamp / 1000);
						updateProgress(percentCompleted, speed);
						console.log(
							`Download progress: ${percentCompleted}%, Speed: ${speed.toFixed(
								2
							)} bytes/sec`
						);
					} else {
						const fileSize = event.target.getResponseHeader("X-File-Size");
						console.log("In FileItem.vue fileSize::: ", fileSize);
						if (fileSize) {
							const percentCompleted = Math.round(
								(progressEvent.loaded * 100) / fileSize
							);
							const speed = progressEvent.loaded / (event.timeStamp / 1000);
							updateProgress(percentCompleted, speed);
							console.log(
								`Download progress: ${percentCompleted}%, Speed: ${speed.toFixed(
									2
								)} bytes/sec`
							);
						} else {
							console.log(`Downloaded ${progressEvent.loaded} bytes`);
						}
					}
				},
			});

			// 创建 Blob 对象
			const blob = new Blob([response.data]);

			// 使用 file-saver 库来自动触发下载
			import("file-saver")
				.then((FileSaver) => {
					FileSaver.saveAs(blob, filename);
				})
				.then(() => {
					progress.value = 100;
					speed.value = 0;
				});
		} catch (error) {
			console.error("下载文件失败:", error);
		}
	};
	const deleteFile = async (filename) => {
		if (confirm("确定要删除文件吗？")) {
			try {
				const response = await axios.post(`/api/delete/${filename}`);
				if (response.data.message === "success") {
					emits("fileDeleted", filename);
				}
			} catch (error) {
				console.error("删除文件失败:", error);
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
