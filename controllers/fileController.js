const fs = require("fs");
const path = require("path");
const archiver = require("archiver");
const { deleteFileAsync } = require("../utils/file");

const uploadDir = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadDir)) {
	fs.mkdirSync(uploadDir);
}

const upload = async (ctx) => {
	const { files } = ctx.request;

	const uploadedFiles = files.files; // 确保你的前端以"files"作为字段名

	if (!uploadedFiles) {
		ctx.throw(400, "No files provided");
		return;
	}

	// 处理单个文件和多个文件的情况,是单文件就转换成数组
	const filesArray = Array.isArray(uploadedFiles)
		? uploadedFiles
		: [uploadedFiles];

	filesArray.forEach((file) => {
		console.log({
			originalFilename: file.originalFilename,
			filepath: file.filepath,
			size: file.size,
			mimetype: file.mimetype,
			lastModifiedDate: file.lastModifiedDate,
			newFilename: file.newFilename,
			hash: file.hash,
		});
	});
	for (const file of filesArray) {
		const reader = fs.createReadStream(file.filepath);
		const stream = fs.createWriteStream(
			path.join(uploadDir, file.originalFilename)
		);
		//定义一个变量来存储已上传的文件大小
		let uploadedSize = 0;
		const totalSize = file.size;

		// 监听data事件以获取写入的进度
		reader.on("data", (chunk) => {
			uploadedSize += chunk.length;
			const progress = ((uploadedSize / totalSize) * 100).toFixed(2);
			console.log(`File ${file.originalFilename} is ${progress}% uploaded.`);
		});

		// 监听写入完成事件
		stream.on("finish", () => {
			console.log(
				`File ${file.originalFilename} has been written successfully`
			);
		});

		// 监听错误事件
		stream.on("error", (err) => {
			console.error(`Error writing file ${file.originalFilename}:`, err);
		});

		// 将文件流写入
		reader.pipe(stream);
	}

	ctx.body = {
		message: "success",
		files: `文件已上传: ${filesArray
			.map((file) => file.originalFilename)
			.join(", ")}`,
	};
};

const download = async (ctx) => {
	const filename = ctx.params.filename;
	const filePath = path.join(uploadDir, filename);
	if (fs.existsSync(filePath)) {
		ctx.body = fs.createReadStream(filePath);
		ctx.set("Content-Disposition", `attachment; filename=${filename}`);
	} else {
		ctx.status = 404;
		ctx.body = "File not found";
	}
};
const downloadMulti = async (ctx) => {
	const filenames = ctx.query.filenames.split(","); // 以逗号分隔的文件名
	const zipFilename = `downloads-${Date.now()}.zip`; // 生成一个zip文件
	const zipFilePath = path.join(uploadDir, zipFilename); // zip文件的路径

	console.log(`Creating ZIP file: ${zipFilePath}`);

	const archive = archiver("zip", {
		zlib: { level: 9 }, // Sets the compression level.
	}); // 创建一个zip压缩文件

	const output = fs.createWriteStream(zipFilePath); // 创建一个可写流

	// 使用Promise包装，以便我们可以await
	await new Promise((resolve, reject) => {
		output.on("close", () => {
			// 监听close事件
			console.log(`${archive.pointer()} total bytes`);
			console.log(
				"Archiver has been finalized and the output file descriptor has closed."
			);
			ctx.set("Content-Disposition", `attachment; filename=${zipFilename}`);
			ctx.body = fs.createReadStream(zipFilePath); // 返回一个可读流
			deleteFileAsync(zipFilePath); // 删除zip文件
			resolve();
		}); // 监听close事件

		output.on("end", () => {
			console.log("Data has been drained");
		}); // 监听end事件

		archive.on("warning", (err) => {
			if (err.code === "ENOENT") {
				console.warn(err);
			} else {
				reject(err);
			}
		}); //	监听warning事件

		archive.on("error", (err) => {
			reject(err);
		}); // 监听error事件

		archive.pipe(output); // 管道输出到output

		for (const filename of filenames) {
			const filePath = path.join(uploadDir, filename); // 拼接文件路径
			if (fs.existsSync(filePath)) {
				// 判断文件是否存在
				archive.file(filePath, { name: filename }); // 将文件添加到zip文件
				// console.log(`Added file to ZIP: ${filePath}`);
			} else {
				console.warn(`File not found: ${filename}`);
			}
		}

		archive.finalize(); // 完成压缩
		// console.log("ZIP file creation finalized");
	});
};
const getFileList = async (ctx) => {
	try {
		const files = await fs.promises.readdir(uploadDir);

		const filePromises = files.map(async (file) => {
			const filePath = path.join(uploadDir, file);
			const stats = await fs.promises.stat(filePath);
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
		console.error("Error reading directory:", error);
		ctx.status = 500;
		ctx.body = {
			message: "Error reading file list",
			error: error.message,
		};
	}
};
module.exports = { upload, download, downloadMulti, getFileList };
