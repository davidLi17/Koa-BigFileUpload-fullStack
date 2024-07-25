<template>
	<div class="file-list">
		<div class="header">
			<h1>文件列表</h1>
			<button
				class="refresh-button"
				@click="handleRefreshData">
				刷新文件列表
			</button>
		</div>
		<div class="file-container">
			<FileItem
				v-for="file in files"
				:key="file.name"
				:file="file"
				@fileDeleted="handleFileDeleted" />
		</div>
	</div>
</template>

<script setup>
	import { ref, onMounted } from "vue";
	import axios from "axios";
	import FileItem from "./FileItem.vue";

	const files = ref([]);

	const handleFileDeleted = (filename) => {
		files.value = files.value.filter((file) => file.name !== filename);
	};

	const handleRefreshData = async () => {
		const res = await axios.get("/api/files");
		files.value = res.data.files;
	};

	onMounted(async () => {
		try {
			const response = await axios.get("/api/files");
			files.value = response.data.files;
			// console.log(
			// 	"In FileList.vue response.data.files::: ",
			// 	response.data.files
			// );
		} catch (error) {
			console.error("获取文件列表失败:", error);
		}
	});
</script>

<style scoped>
	.file-list {
		max-width: 1200px;
		margin: 0 auto;
		padding: 20px;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 30px;
	}

	h1 {
		font-size: 28px;
		color: #333;
	}

	.refresh-button {
		padding: 10px 20px;
		font-size: 16px;
		font-weight: bold;
		color: white;
		background-color: #4caf50;
		border: none;
		border-radius: 5px;
		cursor: pointer;
		transition: background-color 0.3s ease;
	}

	.refresh-button:hover {
		background-color: #45a049;
	}

	.file-container {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		grid-gap: 25px;
	}
</style>
