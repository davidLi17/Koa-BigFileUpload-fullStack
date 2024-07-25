# Koa-start

<details>
<summary>English</summary>

## Koa-start

Koa-start is a sample project for a file upload and download server based on the Koa.js framework. It demonstrates how to use Koa to handle file uploads, downloads, and multi-file compressed downloads.

### Features

- File Upload: Supports single and multiple file uploads
- File Download: Supports single file downloads
- Multi-file Compressed Download: Supports selecting multiple files for compressed download
- File List: Asynchronously retrieves the list of files in the upload directory
- Progress Display: Shows upload progress during file uploads

### Tech Stack

- [Koa](https://koajs.com/): Next generation web framework
- [koa-router](https://github.com/ZijianHe/koa-router): Router middleware for Koa
- [koa-body](https://github.com/koajs/koa-body): Body parser for Koa
- [archiver](https://github.com/archiverjs/node-archiver): Library for creating compressed files

### Quick Start

1. Clone the repository:

   ```
   git clone https://github.com/1320503154/Koa-start.git
   cd Koa-start
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Start the server:

   ```
   node app.js
   ```

   The server will run on http://localhost:5000.

### API Endpoints

- `POST /upload`: Upload files
- `GET /download/:filename`: Download a single file
- `GET /downloadMulti?filenames=file1,file2`: Download multiple files (compressed)
- `GET /files`: Get the list of files in the upload directory

### Project Structure

```
Koa-start/
├── app.js              # Application entry file
├── routes.js           # Route definitions
├── controllers/
│   └── fileController.js  # File handling controller
├── middlewares/
│   └── auth.js         # Authentication middleware
└── uploads/            # Upload file storage directory
```

### Contributing

Contributions are welcome, including code contributions, issue reports, or new feature suggestions. Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

### Contact

If you have any questions or suggestions, please contact us through [GitHub Issues](https://github.com/1320503154/Koa-start/issues).

</details>

<details>
<summary>中文</summary>

## Koa-start

Koa-start 是一个基于 Koa.js 框架的文件上传和下载服务器示例项目。它展示了如何使用 Koa 来处理文件上传、下载以及多文件压缩下载等功能。

### 功能特性

- 文件上传：支持单文件和多文件上传
- 文件下载：支持单文件下载
- 多文件压缩下载：支持选择多个文件进行压缩后下载
- 文件列表：异步获取上传目录中的文件列表
- 进度显示：文件上传时显示上传进度

### 技术栈

- [Koa](https://koajs.com/): 下一代 web 框架
- [koa-router](https://github.com/ZijianHe/koa-router): Koa 的路由中间件
- [koa-body](https://github.com/koajs/koa-body): 用于解析请求体的 Koa 中间件
- [archiver](https://github.com/archiverjs/node-archiver): 用于创建压缩文件的库

### 快速开始

1. 克隆仓库：

   ```
   git clone https://github.com/1320503154/Koa-start.git
   cd Koa-start
   ```

2. 安装依赖：

   ```
   npm install
   ```

3. 启动服务器：

   ```
   node app.js
   ```

   服务器将在 http://localhost:5000 上运行。

### API 接口

- `POST /upload`: 上传文件
- `GET /download/:filename`: 下载单个文件
- `GET /downloadMulti?filenames=file1,file2`: 下载多个文件（压缩）
- `GET /files`: 获取上传目录中的文件列表

### 项目结构

```
Koa-start/
├── app.js              # 应用入口文件
├── routes.js           # 路由定义
├── controllers/
│   └── fileController.js  # 文件处理控制器
├── middlewares/
│   └── auth.js         # 认证中间件
└── uploads/            # 上传文件存储目录
```

### 贡献

欢迎贡献代码、报告问题或提出新功能建议。请遵循以下步骤：

1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

### 许可证

本项目采用 MIT 许可证。详情请见 [LICENSE](LICENSE) 文件。

### 联系方式

如有任何问题或建议，请通过 [GitHub Issues](https://github.com/1320503154/Koa-start/issues) 与我们联系。

</details>
