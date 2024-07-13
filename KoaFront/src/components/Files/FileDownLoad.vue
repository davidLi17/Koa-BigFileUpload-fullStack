<template>
	<div>
		<input
			type="file"
			@change="handleFileChange"
			multiple />
		<button @click="uploadFiles">Upload</button>
		<div id="progressContainer">
			<div
				v-for="file in files"
				:key="file.name">
				<div>{{ file.name }}</div>
				<div class="progress-bar">
					<div
						class="progress"
						:id="'progress-' + file.name"></div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
	import { ref } from "vue";

	const files = ref([]);

	const handleFileChange = (event) => {
		files.value = Array.from(event.target.files);
	};

	const uploadFiles = () => {
		const formData = new FormData();
		for (const file of files.value) {
			formData.append("files", file);
		}

		const progressContainer = document.getElementById("progressContainer");
		progressContainer.innerHTML = "";

		for (const file of files.value) {
			const progressBar = document.createElement("div");
			progressBar.className = "progress-bar";
			progressBar.innerHTML = `<div class="progress" id="progress-${file.name}"></div>`;
			const label = document.createElement("div");
			label.textContent = file.name;
			progressContainer.appendChild(label);
			progressContainer.appendChild(progressBar);
		}

		fetch("/api/upload", {
			method: "POST",
			body: formData,
		})
			.then((response) => {
				const reader = response.body.getReader();
				const decoder = new TextDecoder();

				const read = () => {
					reader.read().then(({ done, value }) => {
						if (done) {
							console.log("Upload completed");
							return;
						}

						const chunk = decoder.decode(value, { stream: true });
						const lines = chunk.split("\n");

						lines.forEach((line) => {
							if (line.startsWith("data: ")) {
								const data = JSON.parse(line.slice(6));
								updateProgress(data.filename, data.progress);
							}
						});

						read();
					});
				};

				read();
			})
			.catch((error) => {
				console.error("Upload failed:", error);
			});
	};

	const updateProgress = (filename, progress) => {
		const progressBar = document.getElementById(`progress-${filename}`);
		if (progressBar) {
			progressBar.style.width = `${progress}%`;
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
