import axios from "axios";

const API_URL = "/api";

async function uploadFile(file) {
	const chunkSize = 1024 * 1024; // 1MB chunks
	const fileId = generateFileId(file);
	const totalChunks = Math.ceil(file.size / chunkSize);

	// Check for existing progress
	const existingProgress = await getUploadProgress(fileId);
	const uploadedChunks = new Set(existingProgress.uploadedChunks);

	for (let i = 0; i < totalChunks; i++) {
		if (uploadedChunks.has(i)) {
			console.log(`Chunk ${i} already uploaded, skipping`);
			continue;
		}

		const chunk = file.slice(i * chunkSize, (i + 1) * chunkSize);
		const formData = new FormData();
		formData.append("chunk", chunk);
		formData.append("index", i);
		formData.append("fileId", fileId);
		formData.append("totalChunks", totalChunks);

		try {
			await axios.post(`${API_URL}/upload`, formData);
			uploadedChunks.add(i);
			saveProgress(fileId, Array.from(uploadedChunks));
		} catch (error) {
			console.error(`Error uploading chunk ${i}:`, error);
			// Implement retry logic here
		}
	}

	// Complete the upload
	await axios.post(`${API_URL}/complete-upload`, {
		fileId,
		fileName: file.name,
	});
	clearProgress(fileId);
}

async function getUploadProgress(fileId) {
	try {
		const response = await axios.get(`${API_URL}/upload-progress/${fileId}`);
		return response.data;
	} catch (error) {
		console.error("Error getting upload progress:", error);
		return { uploadedChunks: [] };
	}
}

function generateFileId(file) {
	return `${file.name}-${file.size}-${file.lastModified}`;
}

function saveProgress(fileId, uploadedChunks) {
	localStorage.setItem(fileId, JSON.stringify(uploadedChunks));
}

function clearProgress(fileId) {
	localStorage.removeItem(fileId);
}
