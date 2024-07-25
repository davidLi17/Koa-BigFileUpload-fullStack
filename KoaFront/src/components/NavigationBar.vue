<template>
	<nav class="navbar">
		<div class="navbar-container">
			<router-link
				to="/"
				class="navbar-logo"
				>{{ route.name }}</router-link
			>
			<div class="navbar-links">
				<router-link
					to="/"
					class="navbar-item"
					>首页</router-link
				>
				<router-link
					to="/fileupload"
					class="navbar-item"
					>文件上传</router-link
				>
			</div>
		</div>
	</nav>
</template>

<script setup>
	// 这里可以添加任何需要的逻辑
	import { useRoute } from "vue-router";
	import { watch } from "vue";
	const route = useRoute();
	watch(route, () => {
		console.log("当前路由:", route.path);
	});
</script>

<style scoped>
	.navbar {
		background-color: #625555;
		padding: 1rem 0;
	}

	.navbar-container {
		max-width: 1200px;
		margin: 0 auto;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0 1rem;
	}

	.navbar-logo {
		color: #fff;
		font-size: 1.5rem;
		font-weight: bold;
		text-decoration: none;
	}

	.navbar-links {
		display: flex;
		gap: 1rem;
	}

	.navbar-item {
		color: #fff;
		text-decoration: none;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		transition: background-color 0.3s ease;
	}

	.navbar-item:hover {
		background-color: #555;
	}
</style>
