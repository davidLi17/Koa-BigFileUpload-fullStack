<template>
	<h1>文件上传页面</h1>
	<div>
		<FileDownLoad></FileDownLoad>
	</div>
</template>

<script setup>
	import { ref, onMounted } from "vue";
	import axios from "axios";
	import FileDownLoad from "@/components/Files/FileDownLoad.vue";
</script>

<style scoped>
	h1 {
		text-align: center;
		margin-bottom: 20px;
	}
</style>
