<template>
	<div>
		<!-- 文件上传输入框，当用户选择文件后，触发 handleFileChange 事件 -->
		<input
			type="file"
			@change="handleFileChange"
			multiple />

		<!-- 上传按钮，当用户点击按钮后，触发 uploadFiles 事件 -->
		<button @click="uploadFiles">Upload</button>

		<!-- 进度条容器，用于显示每个文件的上传进度 -->
		<div id="progressContainer">
			<!-- 遍历 files 数组，为每个文件显示一个进度条 -->
			<div
				v-for="(file, index) in files"
				:key="index">
				<!-- 文件名 -->
				<div>{{ file.file.name }}</div>
				<!-- 进度条 -->
				<div class="progress-bar">
					<!-- 进度条的实际进度 -->
					<div
						class="progress"
						:style="{ width: file.progress + '%' }"></div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
	import { ref } from "vue";

	// 定义一个响应式变量，用于存储上传的文件
	const files = ref([]);

	// 当用户选择文件后，更新 files 变量
	const handleFileChange = (event) => {
		console.log("In FileDownLoad.vue event::: ", event.target.files);
		files.value = Array.from(event.target.files).map((file) => ({
			file,
			progress: 0,
		})); //此处把文件和进度都存储到了files数组中,以对象的形式,所以提取的时候要用file.file.name
		// files.value.forEach((file) => {
		// 	console.log("In FileDownLoad.vue file::: ", file.file.name);
		// });
	};

	// 当用户点击上传按钮后，上传文件
	const uploadFiles = async () => {
		// 创建一个 FormData 对象，用于存储要上传的文件
		const formData = new FormData();
		// 遍历 files 数组，将每个文件添加到 FormData 对象中
		for (const { file } of files.value) {
			formData.append("files", file);
		}

		try {
			// 发送 POST 请求，上传文件
			const response = await fetch("/upload", {
				method: "POST",
				body: formData,
			});

			// 获取响应的 body，并创建一个可读流
			const reader = response.body.getReader();
			// 创建一个文本解码器
			const decoder = new TextDecoder();

			// 定义一个递归函数，用于读取响应的 body
			const read = async () => {
				// 读取响应的 body
				const { done, value } = await reader.read();
				// console.log("In FileDownLoad.vue value::: ", value);
				// 如果读取完成，则结束递归
				if (done) {
					// console.log("Upload completed,filename::: ", value);
					return;
				}

				// 将读取到的数据解码为文本
				const chunk = decoder.decode(value, { stream: true });
				// console.log("In FileDownLoad.vue chunk::: ", chunk);
				// 将文本按行分割
				const lines = chunk.split("\n");
				// console.log("In FileDownLoad.vue lines::: ", lines);

				// 遍历每一行
				lines.forEach((line) => {
					// 如果行以 "data: " 开头，则解析为 JSON 数据
					if (line.startsWith("data: ")) {
						try {
							const data = JSON.parse(line.slice(6));
							// console.log("In FileDownLoad.vue data::: ", data);
							// 更新文件的上传进度
							updateProgress(data.filename, data.progress);
						} catch (e) {
							// console.error("Invalid JSON:", line.slice(6));
						}
					}
				});

				// 递归调用 read 函数，继续读取响应的 body
				read();
			};

			// 调用 read 函数，开始读取响应的 body
			read();
		} catch (error) {
			console.error("Upload failed:", error);
		}
	};

	// 更新文件的上传进度
	const updateProgress = (filename, progress) => {
		// 在 files 数组中找到对应的文件
		const file = files.value.find((f) => f.file.name === filename);
		// 如果找到文件，则更新文件的上传进度
		if (file) {
			file.progress = progress;
		}
	};
</script>

<style scoped>
	.progress-bar {
		width: 300px;
		height: 20px;
		background-color: #f0f0f0;
		border-radius: 10px;
		overflow: hidden;
		margin-bottom: 10px;
	}

	.progress {
		height: 100%;
		background-color: #4caf50;
		width: 0;
		transition: width 0.5s;
	}
</style>
