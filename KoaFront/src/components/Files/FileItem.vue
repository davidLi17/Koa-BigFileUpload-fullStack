<template>
	<div class="file-item">
		<h2 class="green">{{ file.name }}</h2>
		<p>文件大小: {{ formatSize(file.size) }}</p>
		<p>最后修改时间: {{ formatDate(file.lastModified) }}</p>
		<p>是否为目录: {{ file.isDirectory ? "是" : "否" }}</p>
		<button
			class="button"
			@click="downloadFile(file.name)"
			:disabled="file.isDirectory">
			下载
		</button>
		<button
			class="button delete-button"
			@click="deleteFile(file.name)"
			:disabled="file.isDirectory">
			删除
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
	const progress = ref(null);

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
	const downloadFile = async (filename) => {
		try {
			const response = await axios.get(`/api/download/${filename}`, {
				responseType: "blob",
				onDownloadProgress: (event) => {
					console.log("In FileItem.vue event::: ", event);
					const percentCompleted = Math.round(
						(event.loaded * 100) / event.total
					);
					const speed = event.loaded / (event.event.timeStamp / 1000); // 每秒下载的字节数
					console.log(
						`Download progress: ${percentCompleted}%, Speed: ${speed.toFixed(
							2
						)} bytes/sec`
					);
				},
			});
			const url = window.URL.createObjectURL(new Blob([response.data]));
			const link = document.createElement("a");
			link.href = url;
			link.setAttribute("download", filename);
			document.body.appendChild(link);
			link.click();
		} catch (error) {
			console.error("下载文件失败:", error);
		}
	};

	const deleteFile = async (filename) => {
		if (confirm("确定要删除文件吗？")) {
			try {
				const response = await axios.post(`/api/delete/${filename}`);
				if (response.data.message === "success") {
					// 通知父组件文件已被删除，以更新文件列表
					emits("fileDeleted", filename);
				} else {
					// console.error("删除文件失败:", response.data.message);
				}
			} catch (error) {
				// console.error("删除文件失败:", error);
			}
		} else {
			// console.log("取消删除文件", filename);
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

	.delete-button {
		background-color: #f44336;
	}

	.delete-button:hover {
		background-color: #d32f2f;
	}

	.delete-button:active {
		background-color: #b71c1c;
	}
</style>
