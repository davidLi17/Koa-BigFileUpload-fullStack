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
						<span>上传进度: {{ fileItem.progress }}%</span>
						<button
							class="remove-btn"
							@click="removeFile(index)">
							&times;
						</button>
					</div>
				</li>
			</ul>
		</div>
		<div class="btn-container">
			<button
				@click="resumeUpload"
				class="upload-btn"
				v-if="!isUploading && files.length > 0">
				恢复上传
			</button>
			<button
				v-if="files.length > 0"
				@click="uploadFiles"
				class="upload-btn">
				上传文件
			</button>
		</div>
	</div>
</template>

<script setup>
	import { ref } from "vue";
	import SparkMD5 from "spark-md5";
	import axios from "axios";

	const API_URL = "/api";
	const files = ref([]);
	const isDragActive = ref(false);
	const fileInput = ref(null);
	const CHUNK_SIZE = 20 * 1024 * 1024; // 20MB

	const isUploading = ref(false);
	const uploadStatus = ref({});

	/**
	 * @param {Event} event
	 * @returns {void}
	 * 当文件选择框的文件发生变化时，将新选择的文件添加到 files 数组中
	 */
	const handleFileChange = (event) => {
		const newFiles = Array.from(event.target.files).map((file) => ({
			file,
			progress: 0,
		}));
		files.value = [...files.value, ...newFiles];
	};

	/**
	 * @param {Event} event
	 * @returns {void}
	 * 当文件拖拽到 drop-zone 区域时，将拖拽的文件添加到 files 数组中
	 */
	const handleDrop = (event) => {
		isDragActive.value = false;
		const droppedFiles = Array.from(event.dataTransfer.files).map((file) => ({
			file,
			progress: 0,
		}));
		files.value = [...files.value, ...droppedFiles];
	};

	const toggleDragActive = () => {
		isDragActive.value = !isDragActive.value;
	};

	const triggerFileInput = () => {
		fileInput.value.click();
	};

	const removeFile = (index) => {
		isUploading.value = false;
		files.value.splice(index, 1);
	};

	const formatFileSize = (bytes) => {
		if (bytes === 0) return "0 Bytes";
		const k = 1024;
		const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
	};

	/**
	 * @param {File} file
	 * @returns {Promise<string>}
	 * 计算文件的 MD5 值
	 */
	const calculateMD5 = (file) => {
		console.log("开始计算文件的 MD5 值");
		return new Promise((resolve, reject) => {
			const startTime = performance.now(); // 开始计时

			const chunks = [];
			const fileSize = file.size;

			// 读取前20MB
			chunks.push(file.slice(0, CHUNK_SIZE));

			// 如果文件大小超过40MB，还要读取后20MB
			if (fileSize > 2 * CHUNK_SIZE) {
				chunks.push(file.slice(fileSize - CHUNK_SIZE));
			}

			const worker = new Worker("md5Worker.js");

			worker.onmessage = (e) => {
				const { result } = e.data;
				worker.terminate();
				const endTime = performance.now(); // 结束计时
				const duration = endTime - startTime; // 计算时间差
				console.log(`MD5 计算耗时: ${duration} 毫秒`);
				resolve(result);
			};

			worker.onerror = reject;

			const readChunks = (index) => {
				if (index >= chunks.length) {
					worker.postMessage({ fileChunks: chunks });
					return;
				}

				const reader = new FileReader();
				reader.onload = (e) => {
					chunks[index] = e.target.result;
					readChunks(index + 1);
				};
				reader.onerror = reject;
				reader.readAsArrayBuffer(chunks[index]);
			};

			readChunks(0);
		});
	};
	/**
	 * @param {Blob} chunk
	 * @param {number} index
	 * @param {string} fileId
	 * @param {number} totalChunks
	 * @param {string} fileName
	 * @returns {Promise<Object>}
	 * 上传单个文件块
	 */
	const uploadChunk = async (chunk, index, fileId, totalChunks, fileName) => {
		const formData = new FormData();
		formData.append("chunk", chunk);
		formData.append("index", index);
		formData.append("fileId", fileId);
		formData.append("totalChunks", totalChunks);
		formData.append("fileName", fileName);

		const response = await axios.post(`${API_URL}/upload`, formData);
		console.log("In FileUpLoad.vue uploadChunk response::: ", response.data);

		if (response.status !== 200) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		return response.data;
	};

	/**
	 * @param {File} file
	 * @returns {Promise<void>}
	 * 上传文件，支持断点续传
	 */
	const uploadFile = async (file) => {
		isUploading.value = true;
		const fileId = await calculateMD5(file);
		const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

		// 获取已上传的块
		let uploadedChunks = new Set(getSavedProgress(fileId));
		console.log("In FileUpLoad.vue uploadedChunks::: ", uploadedChunks);

		for (let i = 0; i < totalChunks; i++) {
			if (uploadedChunks.has(i)) {
				console.log(`Chunk ${i} already uploaded, skipping`);
				updateProgress(file.name, ((i + 1) / totalChunks) * 100);
				continue;
			}

			// 如果上传被暂停，退出循环
			if (!isUploading.value) {
				console.log("上传已暂停");
				saveProgress(fileId, Array.from(uploadedChunks));
				return;
			}

			const start = i * CHUNK_SIZE;
			const end = Math.min(file.size, start + CHUNK_SIZE);
			const chunk = file.slice(start, end);

			try {
				const result = await uploadChunk(
					chunk,
					i,
					fileId,
					totalChunks,
					file.name
				);
				uploadedChunks.add(i);
				saveProgress(fileId, Array.from(uploadedChunks));
				updateProgress(file.name, result.progress);
			} catch (error) {
				console.error(`上传分块 ${i} 失败:`, error);
				// 这里可以实现重试逻辑
				throw error;
			}
		}

		// 上传完成后，通知服务器合并文件
		await axios.post(`${API_URL}/upload/complete`, {
			fileId,
			fileName: file.name,
		});

		clearProgress(fileId);
		isUploading.value = false;
	};
	/**
	 * @returns {Promise<void>}
	 * 恢复上传所有文件
	 * 从本地存储中获取已上传的块，然后继续上传
	 */
	const resumeUpload = async () => {
		for (const fileItem of files.value) {
			try {
				await uploadFile(fileItem.file);
			} catch (error) {
				console.error(`恢复上传文件 ${fileItem.file.name} 失败:`, error);
			}
		}
	};
	/**
	 * @returns {Promise<void>}
	 * 上传所有文件
	 */
	const uploadFiles = async () => {
		for (const fileItem of files.value) {
			try {
				await uploadFile(fileItem.file);
			} catch (error) {
				console.error(`上传文件 ${fileItem.file.name} 失败:`, error);
			}
		}
	};

	/**
	 * @param {string} filename
	 * @param {number} progress
	 * @returns {void}
	 * 更新指定文件的上传进度
	 */
	const updateProgress = (filename, progress) => {
		const file = files.value.find((f) => f.file.name === filename);
		if (file) {
			file.progress = progress;
		}
	};

	/**
	 * @param {string} fileId
	 * @returns {Promise<Object>}
	 * 获取文件的上传进度
	 */
	async function getUploadProgress(fileId) {
		try {
			const response = await axios.get(`${API_URL}/upload-progress/${fileId}`);
			return response.data;
		} catch (error) {
			console.error("Error getting upload progress:", error);
			return { uploadedChunks: [] };
		}
	}

	/**
	 * @param {File} file
	 * @returns {string}
	 * 生成文件的唯一标识符
	 */
	function generateFileId(file) {
		return `${file.name}-${file.size}-${file.lastModified}`;
	}

	/**
	 * @param {string} fileId
	 * @param {Array<number>} uploadedChunks
	 * @returns {void}
	 * 保存上传进度到本地存储
	 */
	function saveProgress(fileId, uploadedChunks) {
		localStorage.setItem(fileId, JSON.stringify(uploadedChunks));
	}

	function getSavedProgress(fileId) {
		const progress = localStorage.getItem(fileId);
		return progress ? JSON.parse(progress) : [];
	}
	/**
	 * @param {string} fileId
	 * @returns {void}
	 * 清除本地存储中的上传进度
	 */
	function clearProgress(fileId) {
		localStorage.removeItem(fileId);
	}
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
	.btn-container {
		display: flex;
		justify-content: space-between;
	}
</style>
