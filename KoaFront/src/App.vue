<template>
	<div>
		<NavigationBar />
		<router-view></router-view>
	</div>
</template>

<script setup>
	import { ref, onMounted } from "vue";
	import axios from "axios";
	import NavigationBar from "@/components/NavigationBar.vue";

	const files = ref([]);

	onMounted(async () => {
		try {
			const response = await axios.get("/api/files");
			files.value = response.data.files;
		} catch (error) {
			console.error("获取文件列表失败:", error);
		}
	});
</script>

<style scoped>
	h1 {
		text-align: center;
		margin-bottom: 20px;
	}
</style>
