const fs = require("fs");
async function deleteFileAsync(filePath) {
	try {
		await fs.promises.unlink(filePath);
		// console.log("File deleted successfully:", filePath);
	} catch (err) {
		console.error("Error deleting file:", err);
	}
}
module.exports = { deleteFileAsync };
