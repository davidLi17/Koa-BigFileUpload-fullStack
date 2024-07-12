const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const SECRET_KEY = "LHG666";

const register = async (ctx) => {
	// console.log(ctx.request.body);
	const { username, password } = ctx.request.body;
	const hashedPassword = await bcrypt.hash(password, 10);

	db.run(
		"INSERT INTO users (username, password) VALUES (?, ?)",
		[username, hashedPassword],
		function (err) {
			if (err) {
				ctx.status = 400;
				ctx.body = "User already exists";
			}
		}
	);
	ctx.body = {
		username,
		password,
	};
};

const login = async (ctx) => {
	const { username, password } = ctx.request.body;

	return new Promise((resolve, reject) => {
		db.get(
			"SELECT * FROM users WHERE username = ?",
			[username],
			async (err, row) => {
				if (err) {
					ctx.status = 500;
					ctx.body = "Database error";
					reject(err);
				} else if (!row || !(await bcrypt.compare(password, row.password))) {
					ctx.status = 401;
					ctx.body = "Invalid username or password";
					resolve();
				} else {
					const token = jwt.sign({ username }, SECRET_KEY, {
						expiresIn: "144h",
					});
					ctx.body = { message: "Login successful", token };
					resolve();
				}
			}
		);
	});
};
module.exports = { register, login };
