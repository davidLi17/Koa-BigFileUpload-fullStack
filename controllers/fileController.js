const fs = require("fs");
const path = require("path");
const uploadDir = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadDir)) {
	fs.mkdirSync(uploadDir);
}

const upload = async (ctx) => {
	const { files } = ctx.request;
	// console.log(files);只有console.log才是真神
	const file = files.files;

	if (!file) {
		ctx.throw(400, "No file provided");
		return;
	}

	const reader = fs.createReadStream(file.filepath);
	const stream = fs.createWriteStream(
		path.join(uploadDir, file.originalFilename)
	);
	reader.pipe(stream);
	ctx.body = `File uploaded: ${file.originalFilename}`;
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

module.exports = { upload, download };
