const fs = require("fs").promises; // 引入文件系统模块的 promise 版本，以便使用异步操作
const path = require("path"); // 引入路径处理模块

const TEMP_DIR = path.join(__dirname, "../temp"); // 定义临时文件夹的路径，__dirname 是当前文件的目录路径

async function deleteTempFiles() { // 定义一个异步函数来删除临时文件夹中的文件
	console.log(`正在尝试删除临时文件夹中的文件: ${TEMP_DIR}`); // 打印正在尝试删除的临时文件夹路径

	try {
		const files = await fs.readdir(TEMP_DIR); // 异步读取临时文件夹中的所有文件
		console.log(`找到了 ${files.length} 个文件`); // 打印找到的文件数量
		const fileLength = files.length; // 获取文件数量
		for (const file of files) { // 遍历每个文件
			const filePath = path.join(TEMP_DIR, file); // 获取每个文件的完整路径

			try {
				await fs.rm(filePath, { force: true, recursive: true }); // 异步删除文件，force: true 允许删除不存在的文件，recursive: true 允许删除文件夹及其内容
				console.log(`成功删除: ${file}`); // 打印成功删除的文件名
			} catch (err) {
				console.error(`删除 ${filePath} 时出现错误:`, err); // 打印删除文件时出现的错误
				// 如果文件不存在，这不是我们需要担心的错误
				if (err.code !== "ENOENT") {
					throw err; // 重新抛出错误，如果不是 "文件未找到" 错误
				}
			}
		}
		console.log("所有临时文件删除操作已完成"); // 打印所有临时文件删除操作已完成的提示
		return fileLength;
	} catch (error) {
		console.error("文件删除过程中出现错误:", error); // 打印文件删除过程中出现的错误
		throw error; // 重新抛出错误，以便外层的 catch 块捕获
	}
}

// 调用函数来删除临时文件
deleteTempFiles()
	.then(() => {
		console.log("临时文件删除过程已结束"); // 打印临时文件删除过程已结束的提示
	})
	.catch((err) => {
		console.error("删除过程中发生错误:", err); // 打印删除过程中发生的错误
		process.exit(1); // 退出时带有错误代码，表示程序执行过程中出现了错误
	});