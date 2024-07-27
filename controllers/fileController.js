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
 * Get file size
 * @param {Object} ctx - Koa context object
 * @returns {Promise<void>}
 */
const getFileSize = async (ctx) => {
	const filename = ctx.params.filename;
	const filePath = path.join(uploadDir, filename);

	try {
		const stats = await fs.stat(filePath);
		ctx.body = stats.size.toString();
	} catch (err) {
		ctx.status = 404;
		ctx.body = "File not found";
	}
};
/**
 * 上传文件块
 * @param {Object} ctx - Koa 上下文对象
 * @returns {Promise<void>}
 */
const upload = async (ctx) => {
	const { index, fileId, totalChunks, fileName } = ctx.request.body;
	const chunkName = `${index}-${fileName}`;
	const chunk = ctx.request.files.chunk;

	if (!chunk) {
		ctx.throw(400, "No file chunk provided");
		return;
	}

	const chunkDir = path.join(tempDir, fileId);

	try {
		await fs.mkdir(chunkDir, { recursive: true });
		const targetPath = path.join(chunkDir, chunkName);

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

		// 新的排序逻辑
		chunks.sort((a, b) => {
			const indexA = parseInt(a.split("-")[0]); //根据-提取index
			const indexB = parseInt(b.split("-")[0]);
			return indexA - indexB;
		});

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
const download = async (ctx) => {
	// 获取请求中的文件名参数并进行解码
	const filename = decodeURIComponent(ctx.params.filename);
	// 构造文件的完整路径
	const filePath = path.join(uploadDir, filename);

	try {
		// 检查文件是否存在
		const fileExists = await fs
			.access(filePath)
			.then(() => true)
			.catch(() => false);

		if (fileExists) {
			const stats = await fs.stat(filePath);

			if (!ctx.headers.range) {
				// 设置下载文件的响应头
				const encodedFilename = encodeURIComponent(filename).replace(
					/'/g,
					"%27"
				); // 编码文件名并替换单引号

				// 添加文件名的处理，确保有正确的文件名格式
				ctx.set(
					"Content-Disposition",
					`attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`
				);
				ctx.set("Content-Length", stats.size);
				ctx.body = fsSync.createReadStream(filePath); // 创建文件读取流，并将其赋值给响应体
			} else {
				// 处理断点续传
				const range = ctx.headers.range; // 获取 Range 请求头
				const [start, end] = range.replace(/bytes=/, "").split("-"); // 解析起始和结束字节
				const fileStart = parseInt(start, 10); // 将起始字节转换为整数
				const fileEnd = end ? parseInt(end, 10) : stats.size - 1; // 计算结束字节，若未提供则默认为文件末尾
				const chunkSize = fileEnd - fileStart + 1; // 计算当前请求的字节大小

				// 设置状态码为206，指示局部内容
				ctx.status = 206;
				// 设置 Content-Range 响应头，指示实际发送的字节范围
				ctx.set("Content-Range", `bytes ${fileStart}-${fileEnd}/${stats.size}`);
				ctx.set("Accept-Ranges", "bytes"); // 指示支持字节范围请求
				ctx.set("Content-Length", chunkSize); // 设置当前发送的内容长度
				ctx.set("Content-Type", "application/octet-stream"); // 指定内容类型为二进制流

				// 创建文件读取流，并限制读取的字节范围
				ctx.body = fsSync.createReadStream(filePath, {
					start: fileStart,
					end: fileEnd,
				});
			}
		} else {
			// 如果文件不存在，设置响应状态为404并返回错误信息
			ctx.status = 404;
			ctx.body = "File not found";
		}
	} catch (err) {
		// 处理异常情况，设置响应状态为500并返回错误信息
		ctx.status = 500;
		ctx.body = "Internal server error";
		console.error(err); // 控制台输出错误信息
	}
};
/**
 * Download multiple files and package them as a ZIP file
 * @param {Object} ctx - Koa context object
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
			console.warn(`File not found: ${filename}`);
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
	getFileSize,
};
