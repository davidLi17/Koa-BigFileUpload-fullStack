const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");
const archiver = require("archiver");

const uploadDir = path.join(__dirname, "../uploads");
const tempDir = path.join(__dirname, "../temp");

// 确保上传和临时目录存在
fs.mkdir(uploadDir, { recursive: true }).catch(console.error);
fs.mkdir(tempDir, { recursive: true }).catch(console.error);

/**
 * 获取上传进度
 * @param {Object} ctx - Koa 上下文对象
 * @returns {Promise<void>}
 */
const getUploadProgress = async (ctx) => {
	const { fileId } = ctx.params;
	const chunkDir = path.join(tempDir, fileId);

	try {
		const chunks = await fs.readdir(chunkDir);
		ctx.body = {
			success: true,
			uploadedChunks: chunks.map(Number),
		};
	} catch (error) {
		ctx.status = 404;
		ctx.body = { success: false, message: "No upload progress found" };
	}
};

/**
 * 上传文件块
 * @param {Object} ctx - Koa 上下文对象
 * @returns {Promise<void>}
 */
const upload = async (ctx) => {
	const { index, fileId, totalChunks } = ctx.request.body;
	const chunk = ctx.request.files.chunk;

	if (!chunk) {
		ctx.throw(400, "No file chunk provided");
		return;
	}

	const chunkDir = path.join(tempDir, fileId);

	try {
		await fs.mkdir(chunkDir, { recursive: true });
		const targetPath = path.join(chunkDir, index);

		// Check if chunk already exists
		if (
			await fs
				.access(targetPath)
				.then(() => true)
				.catch(() => false)
		) {
			ctx.body = {
				success: true,
				message: "Chunk already exists",
				progress: (
					((parseInt(index) + 1) / parseInt(totalChunks)) *
					100
				).toFixed(2),
			};
			return;
		}

		await fs.copyFile(chunk.filepath, targetPath);
		await fs.unlink(chunk.filepath);

		ctx.body = {
			success: true,
			message: "Chunk uploaded successfully",
			progress: (((parseInt(index) + 1) / parseInt(totalChunks)) * 100).toFixed(
				2
			),
		};
	} catch (error) {
		console.error("Error uploading chunk:", error);
		ctx.status = 500;
		ctx.body = { success: false, message: "Failed to upload chunk" };
	}
};

/**
 * 完成文件上传
 * @param {Object} ctx - Koa 上下文对象
 * @returns {Promise<void>}
 */
const completeUpload = async (ctx) => {
	const { fileId, fileName } = ctx.request.body;
	const chunkDir = path.join(tempDir, fileId);
	const filePath = path.join(uploadDir, fileName);

	try {
		const chunks = await fs.readdir(chunkDir);
		chunks.sort((a, b) => Number(a) - Number(b));

		await fs.writeFile(filePath, "");

		for (const chunk of chunks) {
			const chunkPath = path.join(chunkDir, chunk);
			const chunkData = await fs.readFile(chunkPath);
			await fs.appendFile(filePath, chunkData);
			await fs.unlink(chunkPath);
		}

		await fs.rmdir(chunkDir);
		ctx.body = { success: true, message: "File upload completed" };
	} catch (error) {
		console.error("Error completing upload:", error);
		ctx.status = 500;
		ctx.body = { success: false, message: "Failed to complete upload" };
	}
};

/**
 * 下载指定文件
 * @param {Object} ctx - Koa 上下文对象
 * @returns {Promise<void>}
 */
const download = async (ctx) => {
	const filename = ctx.params.filename;
	const filePath = path.join(uploadDir, filename);

	async function getFileInfo(file) {
		const { size, mtime } = await fs.stat(file);
		const timestamp = Number(mtime);
		return { size, timestamp };
	}

	try {
		if (
			await fs
				.access(filePath)
				.then(() => true)
				.catch(() => false)
		) {
			const { size: fileSize, timestamp } = await getFileInfo(filePath);
			const encodedFilename = encodeURIComponent(filename);

			ctx.set({
				"Content-Disposition": `attachment; filename="${encodedFilename}"`,
				"Content-Type": "application/octet-stream",
				"Transfer-Encoding": "chunked",
				"Content-Length": fileSize, // 发送文件大小
			});

			ctx.body = fsSync.createReadStream(filePath);
			ctx.body.highWaterMark = 64 * 1024; // 64KB chunks
		} else {
			ctx.status = 404;
			ctx.body = "文件未找到";
		}
	} catch (err) {
		ctx.status = 500;
		ctx.body = "服务器内部错误";
		console.error(err);
	}
};

/**
 * 下载多个文件并将它们打包为 ZIP 文件
 * @param {Object} ctx - Koa 上下文对象
 * @returns {Promise<void>}
 */
const downloadMulti = async (ctx) => {
	const filenames = ctx.query.filenames.split(",");
	const zipFilename = `downloads-${Date.now()}.zip`;

	ctx.set({
		"Content-Disposition": `attachment; filename="${zipFilename}"`,
		"Content-Type": "application/zip",
		"Transfer-Encoding": "chunked",
	});

	const archive = archiver("zip", {
		zlib: { level: 9 },
	});

	ctx.body = archive;

	archive.on("warning", (err) => {
		if (err.code === "ENOENT") {
			console.warn(err);
		} else {
			throw err;
		}
	});

	archive.on("error", (err) => {
		throw err;
	});

	for (const filename of filenames) {
		const filePath = path.join(uploadDir, filename);
		if (
			await fs
				.access(filePath)
				.then(() => true)
				.catch(() => false)
		) {
			archive.file(filePath, { name: filename });
		} else {
			console.warn(`文件未找到: ${filename}`);
		}
	}

	archive.finalize();
};

/**
 * 获取上传目录中所有文件的列表
 * @param {Object} ctx - Koa 上下文对象
 * @returns {Promise<void>}
 */
const getFileList = async (ctx) => {
	try {
		const files = await fs.readdir(uploadDir);

		const filePromises = files.map(async (file) => {
			const filePath = path.join(uploadDir, file);
			const stats = await fs.stat(filePath);
			return {
				name: file,
				size: stats.size,
				lastModified: stats.mtime,
				isDirectory: stats.isDirectory(),
			};
		});

		const fileList = await Promise.all(filePromises);

		ctx.body = {
			message: "success",
			files: fileList,
		};
	} catch (error) {
		console.error("读取目录时出错:", error);
		ctx.status = 500;
		ctx.body = {
			message: "读取文件列表出错",
			error: error.message,
		};
	}
};

/**
 * 删除指定文件
 * @param {Object} ctx - Koa 上下文对象
 * @returns {Promise<void>}
 */
const deleteFile = async (ctx) => {
	const filename = ctx.params.filename;
	const filePath = path.join(uploadDir, filename);

	try {
		if (
			await fs
				.access(filePath)
				.then(() => true)
				.catch(() => false)
		) {
			await fs.unlink(filePath);
			ctx.body = {
				message: "success",
				filename: filename,
			};
		} else {
			ctx.status = 404;
			ctx.body = {
				message: "文件未找到",
				filename: filename,
			};
		}
	} catch (error) {
		console.error("删除文件时出错:", error);
		ctx.status = 500;
		ctx.body = {
			message: "删除文件出错",
			error: error.message,
		};
	}
};

module.exports = {
	upload,
	completeUpload,
	download,
	downloadMulti,
	getFileList,
	deleteFile,
	getUploadProgress,
};
