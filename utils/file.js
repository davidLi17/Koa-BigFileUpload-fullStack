const fs = require("fs").promises;
const path = require("path");

const TEMP_DIR = path.join(__dirname, "../temp");

async function deleteTempFiles() {
	console.log(`正在尝试删除临时文件夹中的文件: ${TEMP_DIR}`);

	try {
		const files = await fs.readdir(TEMP_DIR);
		console.log(`找到了 ${files.length} 个文件`);

		for (const file of files) {
			const filePath = path.join(TEMP_DIR, file);

			try {
				await fs.rm(filePath, { force: true, recursive: true });
				console.log(`成功删除: ${file}`);
			} catch (err) {
				console.error(`删除 ${filePath} 时出现错误:`, err);
				// 如果文件不存在，这不是我们需要担心的错误
				if (err.code !== "ENOENT") {
					throw err; // 重新抛出错误，如果不是 "文件未找到" 错误
				}
			}
		}
		console.log("所有临时文件删除操作已完成");
	} catch (error) {
		console.error("文件删除过程中出现错误:", error);
		throw error; // 重新抛出错误，以便外层的 catch 块捕获
	}
}

// 调用函数来删除临时文件
deleteTempFiles()
	.then(() => {
		console.log("临时文件删除过程已结束");
	})
	.catch((err) => {
		console.error("删除过程中发生错误:", err);
		process.exit(1); // 退出时带有错误代码
	});
