const fs = require("fs"); // 引入文件系统模块
const path = require("path"); // 引入路径模块
const archiver = require("archiver"); // 引入压缩模块
const { PassThrough } = require("stream");
const { deleteFileAsync } = require("../utils/file"); // 引入删除文件的异步函数

const uploadDir = path.join(__dirname, "../uploads"); // 设置上传文件目录路径

if (!fs.existsSync(uploadDir)) {
	fs.mkdirSync(uploadDir); // 如果上传目录不存在则创建
}

const upload = async (ctx) => {
	// 获取上传的文件
	const { files } = ctx.request;
	const uploadedFiles = files.files;

	// 如果没有上传文件，则抛出错误
	if (!uploadedFiles) {
		ctx.throw(400, "未提供文件");
		return;
	}

	// 如果上传的文件是一个数组，则直接使用，否则将其转换为一个数组
	const filesArray = Array.isArray(uploadedFiles)
		? uploadedFiles
		: [uploadedFiles];

	// 设置 SSE 头
	ctx.set({
		"Content-Type": "text/event-stream",
		"Cache-Control": "no-cache",
		Connection: "keep-alive",
	});

	// 定义发送进度的函数
	const sendProgress = (filename, progress) => {
		// console.log(`文件 ${filename} 上传进度: ${progress}%`);
		const data = `data: ${JSON.stringify({ filename, progress })}\n\n`;
		ctx.res.write(data);
	};

	// 记录已完成的文件数量
	let completedFiles = 0;

	for (const file of filesArray) {
		const reader = fs.createReadStream(file.filepath);
		const stream = fs.createWriteStream(
			path.join(uploadDir, file.originalFilename)
		);

		let uploadedSize = 0;
		const totalSize = file.size;

		for await (const chunk of reader) {
			uploadedSize += chunk.length;
			const progress = ((uploadedSize / totalSize) * 100).toFixed(2);
			sendProgress(file.originalFilename, progress);

			await new Promise((resolve) => stream.write(chunk, resolve));
		}

		await new Promise((resolve) => stream.end(resolve));

		console.log(`文件 ${file.originalFilename} 已成功写入`);
		sendProgress(file.originalFilename, 100);
		completedFiles++;

		if (completedFiles === filesArray.length) {
			ctx.res.write("event: close\ndata: 所有文件上传完成\n\n");
		}
	}

	ctx.res.end();
};

const download = async (ctx) => {
	const filename = ctx.params.filename; // 获取文件名
	const filePath = path.join(uploadDir, filename); // 拼接文件路径

	try {
		if (fs.existsSync(filePath)) {
			// 如果文件存在
			const stat = fs.statSync(filePath);
			const totalSize = stat.size;
			const encodedFilename = encodeURIComponent(filename); // 对文件名进行编码

			// 检查 Range 请求头
			const range = ctx.headers["range"];

			if (range) {
				const parts = range.replace(/bytes=/, "").split("-");
				const start = parseInt(parts[0], 10);
				const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
				const chunksize = end - start + 1;

				ctx.status = 206; // Partial Content
				ctx.set({
					"Content-Range": `bytes ${start}-${end}/${totalSize}`,
					"Accept-Ranges": "bytes",
					"Content-Length": chunksize,
					"Content-Type": "application/octet-stream",
					"Content-Disposition": `attachment; filename="${encodedFilename}"`,
				});

				const stream = fs.createReadStream(filePath, { start, end }); //让可读流从start到end读取
				ctx.body = stream;
			} else {
				ctx.set({
					"Content-Disposition": `attachment; filename="${encodedFilename}"`,
					"Content-Type": "application/octet-stream",
					"Content-Length": totalSize,
				});

				ctx.body = fs.createReadStream(filePath);
			}
		} else {
			// 如果文件不存在
			ctx.status = 404;
			ctx.body = "File not found";
		}
	} catch (err) {
		ctx.status = 500;
		ctx.body = "Internal server error";
		console.error(err);
	}
};

const downloadMulti = async (ctx) => {
	const filenames = ctx.query.filenames.split(","); // 以逗号分隔的文件名
	const zipFilename = `downloads-${Date.now()}.zip`; // 生成zip文件名
	const zipFilePath = path.join(uploadDir, zipFilename); // zip文件路径

	const archive = archiver("zip", {
		zlib: { level: 9 }, // 设置压缩级别
	}); // 创建zip压缩对象

	const output = fs.createWriteStream(zipFilePath); // 创建可写流

	await new Promise((resolve, reject) => {
		output.on("close", async () => {
			// 监听close事件
			console.log(`${archive.pointer()} total bytes`);
			console.log(
				"Archiver has been finalized and the output file descriptor has closed."
			);
			//configuring the response headers
			ctx.set("Content-Disposition", `attachment; filename=${zipFilename}`);
			ctx.set("Content-Type", "application/octet-stream"); // 设置内容类型
			ctx.set("Content-Length", fs.statSync(filePath).size); // 设置内容长度

			ctx.body = fs.createReadStream(zipFilePath); // 返回可读流

			// 等待文件传输完成后删除临时ZIP文件
			await deleteFileAsync(zipFilePath);
			resolve();
		});

		output.on("end", () => {
			// 监听end事件
			console.log("Data has been drained");
		});

		archive.on("warning", (err) => {
			// 监听warning事件
			if (err.code === "ENOENT") {
				console.warn(err);
			} else {
				reject(err);
			}
		});

		archive.on("error", (err) => {
			// 监听error事件
			reject(err);
		});

		archive.pipe(output); // 管道输出到output

		for (const filename of filenames) {
			const filePath = path.join(uploadDir, filename); // 拼接文件路径
			if (fs.existsSync(filePath)) {
				archive.file(filePath, { name: filename }); // 添加文件到zip
			} else {
				console.warn(`File not found: ${filename}`);
			}
		}

		archive.finalize(); // 完成压缩
	});
};

const getFileList = async (ctx) => {
	// 尝试执行以下代码块
	try {
		// 异步读取uploadDir目录下的文件
		const files = await fs.promises.readdir(uploadDir);

		// 为每个文件创建一个Promise，用于获取文件的详细信息
		const filePromises = files.map(async (file) => {
			const filePath = path.join(uploadDir, file);
			// 异步获取文件信息
			const stats = await fs.promises.stat(filePath);
			return {
				name: file, // 文件名
				size: stats.size, // 文件大小
				lastModified: stats.mtime, // 最后修改时间
				isDirectory: stats.isDirectory(), // 是否为目录
			};
		});

		// 等待所有文件信息Promise完成
		const fileList = await Promise.all(filePromises);

		// 设置响应体内容为成功信息和文件列表
		ctx.body = {
			message: "success",
			files: fileList,
		};
	} catch (error) {
		// 捕获读取目录或文件信息过程中发生的错误并打印
		console.error("Error reading directory:", error);
		// 设置响应状态码为500
		ctx.status = 500;
		// 设置响应体内容为错误信息
		ctx.body = {
			message: "Error reading file list",
			error: error.message,
		};
	}
};
const deleteFile = async (ctx) => {
	const filename = ctx.params.filename; //获取文件名
	const filePath = path.join(uploadDir, filename); //拼接文件路径

	try {
		if (fs.existsSync(filePath)) {
			await fs.promises.unlink(filePath); //等待异步事件完成,删除文件
			ctx.body = {
				message: "success", //封装一个成功类,然后返回
				filename: filename,
			};
		} else {
			ctx.status = 404;
			ctx.body = {
				message: "File not found",
				filename: filename,
			};
		}
	} catch (error) {
		console.error("Error deleting file:", error);
		ctx.status = 500;
		ctx.body = {
			message: "Error deleting file",
			error: error.message,
		};
	}
};
module.exports = { upload, download, downloadMulti, getFileList, deleteFile }; // 导出上传、下载、批量下载和获取文件列表的方法
