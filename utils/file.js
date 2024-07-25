const fs = require("fs").promises;
const path = require("path");

const TEMP_DIR = path.join(__dirname, "../temp");
const MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

async function cleanTempFiles() {
	try {
		const files = await fs.readdir(TEMP_DIR);
		const now = Date.now();

		for (const file of files) {
			const filePath = path.join(TEMP_DIR, file);
			const stats = await fs.stat(filePath);

			if (now - stats.mtime.getTime() > MAX_AGE) {
				await fs.unlink(filePath);
				console.log(`Deleted old temp file: ${file}`);
			}
		}
	} catch (error) {
		console.error("Error cleaning temp files:", error);
	}
}
async function cleanTempFilesSync() {
	try {
		const files = await fs.readdir(TEMP_DIR);
		for (const file of files) {
			const filePath = path.join(TEMP_DIR, file);
			const res = await fs.unlink(filePath);
			console.log("In file.js res::: ", res);
		}
	} catch (error) {
		console.error("Error cleaning temp files:", error);
	} finally {
		console.log("删除所有临时文件成功");
	}
}
await cleanTempFilesSync();
