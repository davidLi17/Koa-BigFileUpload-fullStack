import Config from "@/config/config";
const CHUNK_SIZE = Config.CHUNK_SIZE;
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
export { calculateMD5, formatFileSize };
