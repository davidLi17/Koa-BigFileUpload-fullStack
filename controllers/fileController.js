const fs = require("fs"); // 引入文件系统模块
const path = require("path"); // 引入路径模块
const archiver = require("archiver"); // 引入压缩模块
const util = require("util");
const { pipeline } = require("stream");
const pipelineAsync = util.promisify(pipeline);
const { deleteFileAsync } = require("../utils/file"); // 引入删除文件的异步函数

const uploadDir = path.join(__dirname, "../uploads"); // 设置上传文件目录路径

if (!fs.existsSync(uploadDir)) {
	fs.mkdirSync(uploadDir); // 如果上传目录不存在则创建
}

const upload = async (ctx) => {
	const { files } = ctx.request;
	const uploadedFiles = files.files;

	if (!uploadedFiles) {
		ctx.throw(400, "No files provided");
		return;
	}

	const filesArray = Array.isArray(uploadedFiles)
		? uploadedFiles
		: [uploadedFiles];

	// 设置 SSE 头
	ctx.set({
		"Content-Type": "text/event-stream",
		"Cache-Control": "no-cache",
		Connection: "keep-alive",
	});

	const sendProgress = (filename, progress) => {
		ctx.res.write(`data: ${JSON.stringify({ filename, progress })}\n\n`);
	};

	for (const file of filesArray) {
		const reader = fs.createReadStream(file.filepath);
		const stream = fs.createWriteStream(
			path.join(uploadDir, file.originalFilename)
		);

		let uploadedSize = 0;
		const totalSize = file.size;

		reader.on("data", (chunk) => {
			uploadedSize += chunk.length;
			const progress = ((uploadedSize / totalSize) * 100).toFixed(2);
			sendProgress(file.originalFilename, progress);
		});

		await pipelineAsync(reader, stream).catch((err) => {
			console.error(`Error writing file ${file.originalFilename}:`, err);
			sendProgress(file.originalFilename, -1); // 使用负值表示错误
		});

		console.log(`File ${file.originalFilename} has been written successfully`);
		sendProgress(file.originalFilename, 100);
	}

	ctx.res.write("event: close\ndata: upload complete\n\n");
	ctx.res.end();
};

const download = async (ctx) => {
	const filename = ctx.params.filename; // 获取文件名
	const filePath = path.join(uploadDir, filename); // 拼接文件路径
	if (fs.existsSync(filePath)) {
		ctx.body = fs.createReadStream(filePath); // 返回可读流
		ctx.set("Content-Disposition", `attachment; filename=`); // 设置响应头
	} else {
		ctx.status = 404;
		ctx.body = "File not found";
	}
};

const downloadMulti = async (ctx) => {
	const filenames = ctx.query.filenames.split(","); // 以逗号分隔的文件名
	const zipFilename = `downloads-${Date.now()}.zip`; // 生成zip文件名
	const zipFilePath = path.join(uploadDir, zipFilename); // zip文件路径

	console.log(`Creating ZIP file: `);

	const archive = archiver("zip", {
		zlib: { level: 9 }, // 设置压缩级别
	}); // 创建zip压缩对象

	const output = fs.createWriteStream(zipFilePath); // 创建可写流

	await new Promise((resolve, reject) => {
		output.on("close", () => {
			// 监听close事件
			console.log(`${archive.pointer()} total bytes`);
			console.log(
				"Archiver has been finalized and the output file descriptor has closed."
			);
			ctx.set("Content-Disposition", `attachment; filename=`);
			ctx.body = fs.createReadStream(zipFilePath); // 返回可读流
			deleteFileAsync(zipFilePath); // 删除zip文件
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
				console.warn(`File not found: `);
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
module.exports = { upload, download, downloadMulti, getFileList }; // 导出上传、下载、批量下载和获取文件列表的方法
