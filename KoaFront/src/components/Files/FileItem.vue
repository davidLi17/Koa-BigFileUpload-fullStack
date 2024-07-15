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
		<div v-if="progress !== null">
			<p>文件下载进度: {{ progress }}%</p>
		</div>
	</div>
</template>

<script setup>
	import { toRefs } from "vue";
	import axios from "axios";
	const emits = defineEmits(["fileDeleted"]);
	const props = defineProps({
		file: Object,
	});

	const { file } = toRefs(props);
	let progress = null;

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

	const downloadFile = (filename) => {
		const xhr = new XMLHttpRequest();
		xhr.open("GET", `/api/download/${filename}`, true);
		xhr.responseType = "blob";

		xhr.onprogress = (event) => {
			if (event.lengthComputable) {
				progress = ((event.loaded / event.total) * 100).toFixed(2);
			}
		};

		xhr.onload = () => {
			if (xhr.status === 200) {
				const url = window.URL.createObjectURL(new Blob([xhr.response]));
				const link = document.createElement("a");
				link.href = url;
				link.setAttribute("download", filename);
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
				progress = null;
			} else {
				console.error("下载文件失败:", xhr.statusText);
			}
		};

		xhr.onerror = () => {
			console.error("下载文件失败:", xhr.statusText);
		};

		xhr.send();
	};

	const deleteFile = async (filename) => {
		if (confirm("确定要删除文件吗？")) {
			try {
				const response = await axios.post(`/api/delete/${filename}`);
				if (response.data.message === "success") {
					// 通知父组件文件已被删除，以更新文件列表
					emits("fileDeleted", filename);
				} else {
					console.error("删除文件失败:", response.data.message);
				}
			} catch (error) {
				console.error("删除文件失败:", error);
			}
		} else {
			console.log("取消删除文件", filename);
		}
	};
</script>
