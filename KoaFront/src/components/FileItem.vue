<template>
	<div class="file-item">
		<h2>{{ file.name }}</h2>
		<p>文件大小: {{ formatSize(file.size) }}</p>
		<p>最后修改时间: {{ formatDate(file.lastModified) }}</p>
		<p>是否为目录: {{ file.isDirectory ? "是" : "否" }}</p>
	</div>
</template>

<script setup>
	import { toRefs } from "vue";

	const props = defineProps({
		file: Object,
	});

	const { file } = toRefs(props);

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
</script>

<style scoped>
	.file-item {
		border: 1px solid #ccc;
		padding: 10px;
		margin: 10px 0;
	}
</style>
