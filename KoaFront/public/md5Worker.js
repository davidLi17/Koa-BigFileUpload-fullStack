importScripts(
	"https://cdnjs.cloudflare.com/ajax/libs/spark-md5/3.0.0/spark-md5.min.js"
);

self.onmessage = function (e) {
	console.log("In md5Worker.js e.data::: ", e.data);

	const { fileChunks } = e.data;
	const spark = new SparkMD5.ArrayBuffer();

	for (let chunk of fileChunks) {
		console.log("In md5Worker.js chunk::: ", chunk);

		spark.append(chunk);
	}

	const result = spark.end();
	self.postMessage({ result });
};
