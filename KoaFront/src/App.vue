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
	//边调试边写代码才是最快的,response.data.files[0]可以直接复制表达式
	onMounted(async () => {
		try {
			const response = await axios.get("/api/files");
			files.value = response.data.files;
			console.log("获取文件列表成功:", files.value);
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
