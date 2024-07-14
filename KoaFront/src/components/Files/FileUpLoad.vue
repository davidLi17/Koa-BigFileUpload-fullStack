<template>
	<div class="file-upload-container">
		<div
			class="drop-zone"
			@dragenter.prevent="toggleDragActive"
			@dragleave.prevent="toggleDragActive"
			@dragover.prevent
			@drop.prevent="handleDrop"
			:class="{ 'drag-active': isDragActive }">
			<input
				type="file"
				ref="fileInput"
				@change="handleFileChange"
				multiple
				class="file-input" />
			<div class="drop-zone-content">
				<svg
					class="upload-icon"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round">
					<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
					<polyline points="17 8 12 3 7 8" />
					<line
						x1="12"
						y1="3"
						x2="12"
						y2="15" />
				</svg>
				<p>拖拽文件到这里，或者点击选择文件</p>
				<button
					class="select-files-btn"
					@click="triggerFileInput">
					选择文件
				</button>
			</div>
		</div>

		<div
			v-if="files.length > 0"
			class="file-list">
			<h3>已经选择的文件</h3>
			<ul>
				<li
					v-for="(fileItem, index) in files"
					:key="index"
					class="file-item">
					<div class="file-info">
						<span class="file-name">{{ fileItem.file.name }}</span>
						<span class="file-size">{{
							formatFileSize(fileItem.file.size)
						}}</span>
					</div>
					<div class="file-progress">
						<div class="progress-bar">
							<div
								class="progress"
								:style="{ width: fileItem.progress + '%' }"></div>
						</div>
						<button
							class="remove-btn"
							@click="removeFile(index)">
							&times;
						</button>
					</div>
				</li>
			</ul>
		</div>

		<button
			v-if="files.length > 0"
			@click="uploadFiles"
			class="upload-btn">
			上传文件
		</button>
	</div>
</template>

<script setup>
	import { ref } from "vue";

	const files = ref([]);
	const isDragActive = ref(false);
	const fileInput = ref(null);

	const handleFileChange = (event) => {
		const newFiles = Array.from(event.target.files).map((file) => ({
			file,
			progress: 0,
		}));
		files.value = [...files.value, ...newFiles];
		console.log(
			"In FileUpLoad.vue files.value handleFileChange::: ",
			files.value
		);
	};

	const handleDrop = (event) => {
		isDragActive.value = false;
		const droppedFiles = Array.from(event.dataTransfer.files).map((file) => ({
			file,
			progress: 0,
		}));
		files.value = [...files.value, ...droppedFiles];
		console.log("In FileUpLoad.vue files.value handleDrop::: ", files.value);
	};

	const toggleDragActive = () => {
		isDragActive.value = !isDragActive.value;
	};

	const triggerFileInput = () => {
		fileInput.value.click();
	};

	const removeFile = (index) => {
		files.value.splice(index, 1);
	};

	const formatFileSize = (bytes) => {
		if (bytes === 0) return "0 Bytes";
		const k = 1024;
		const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
	}; //格式化文件大小, 1024字节为1KB, 1024KB为1MB, 1024MB为1GB, 1024GB为1TB,经典格式化代码.

	const uploadFiles = async () => {
		const formData = new FormData();
		for (const { file } of files.value) {
			formData.append("files", file);
		}

		try {
			const response = await fetch("/upload", {
				method: "POST",
				body: formData,
			});

			const reader = response.body.getReader();
			const decoder = new TextDecoder();

			const read = async () => {
				const { done, value } = await reader.read();
				if (done) return;

				const chunk = decoder.decode(value, { stream: true });
				const lines = chunk.split("\n");

				lines.forEach((line) => {
					if (line.startsWith("data: ")) {
						try {
							const data = JSON.parse(line.slice(6));
							updateProgress(data.filename, data.progress);
						} catch (e) {
							console.error("Invalid JSON:", line.slice(6));
						}
					}
				});

				read();
			};

			read();
		} catch (error) {
			// console.error("Upload failed:", error);
		}
	};

	const updateProgress = (filename, progress) => {
		const file = files.value.find((f) => f.file.name === filename);
		if (file) {
			file.progress = progress;
		}
	};
</script>

<style scoped>
	.file-upload-container {
		font-family: Arial, sans-serif;
		max-width: 500px;
		margin: 0 auto;
		padding: 20px;
	}

	.drop-zone {
		border: 2px dashed #ccc;
		border-radius: 4px;
		padding: 20px;
		text-align: center;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.drag-active {
		border-color: #4caf50;
		background-color: #e8f5e9;
	}

	.drop-zone-content {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.upload-icon {
		width: 48px;
		height: 48px;
		color: #757575;
		margin-bottom: 10px;
	}

	.file-input {
		display: none;
	}

	.select-files-btn {
		background-color: #2196f3;
		color: white;
		padding: 10px 20px;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		margin-top: 10px;
		transition: background-color 0.3s ease;
	}

	.select-files-btn:hover {
		background-color: #1976d2;
	}

	.file-list {
		margin-top: 20px;
	}

	.file-list h3 {
		margin-bottom: 10px;
	}

	.file-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 10px;
		border: 1px solid #e0e0e0;
		border-radius: 4px;
		margin-bottom: 10px;
	}

	.file-info {
		display: flex;
		flex-direction: column;
	}

	.file-name {
		font-weight: bold;
	}

	.file-size {
		font-size: 0.8em;
		color: #757575;
	}

	.file-progress {
		display: flex;
		align-items: center;
	}

	.progress-bar {
		width: 100px;
		height: 8px;
		background-color: #f0f0f0;
		border-radius: 4px;
		overflow: hidden;
		margin-right: 10px;
	}

	.progress {
		height: 100%;
		background-color: #4caf50;
		transition: width 0.5s;
	}

	.remove-btn {
		background-color: #f44336;
		color: white;
		border: none;
		border-radius: 50%;
		width: 24px;
		height: 24px;
		font-size: 16px;
		cursor: pointer;
		display: flex;
		justify-content: center;
		align-items: center;
		transition: background-color 0.3s ease;
	}

	.remove-btn:hover {
		background-color: #d32f2f;
	}

	.upload-btn {
		background-color: #4caf50;
		color: white;
		padding: 10px 20px;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		margin-top: 20px;
		transition: background-color 0.3s ease;
	}

	.upload-btn:hover {
		background-color: #45a049;
	}
</style>
