const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../db");
const SECRET_KEY = "LHG666";

const register = async (ctx) => {
	try {
		const { username, password } = ctx.request.body;
		const hashedPassword = await bcrypt.hash(password, 10);

		const user = await prisma.user.create({
			data: {
				username,
				password: hashedPassword,
			},
		});

		ctx.body = {
			success: true,
			user: {
				id: user.id,
				username: user.username,
			},
		};
	} catch (error) {
		if (error.code === 'P2002') {
			ctx.status = 400;
			ctx.body = { success: false, message: "User already exists" };
		} else {
			ctx.status = 500;
			ctx.body = { success: false, message: "Server error" };
		}
	}
};

const login = async (ctx) => {
	try {
		const { username, password } = ctx.request.body;

		const user = await prisma.user.findUnique({
			where: { username },
		});

		if (!user || !(await bcrypt.compare(password, user.password))) {
			ctx.status = 401;
			ctx.body = { success: false, message: "Invalid username or password" };
			return;
		}

		const token = jwt.sign({ userId: user.id, username }, SECRET_KEY, {
			expiresIn: "144h",
		});

		ctx.body = {
			success: true,
			message: "Login successful",
			token,
			user: {
				id: user.id,
				username: user.username,
			},
		};
	} catch (error) {
		ctx.status = 500;
		ctx.body = { success: false, message: "Server error" };
	}
};

module.exports = { register, login };
