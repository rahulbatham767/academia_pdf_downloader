# Academia PDF Downloader

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://docker.com)

> A lightweight automation tool to download publicly available research papers from [Academia.edu](https://www.academia.edu/) for educational and personal reference purposes.

---

## 📖 Overview

**Academia PDF Downloader** is a **Next.js 14**-based web application that simplifies the retrieval of open-access academic documents. It automates interaction with Academia.edu, extracts publicly available PDF content, and delivers it through a clean web interface or REST API.

Whether you're a student, researcher, or educator, this tool helps you quickly obtain publicly shared papers without manual navigation.

---

## ✨ Features

- 🔍 **Search & Download** — Enter a paper URL or DOI to initiate the download.
- 🤖 **Automated Browser Engine** — Uses Playwright for headless browser automation.
- ⚡ **Real-time Progress** — View download status and process logs.
- 🐳 **Docker Ready** — Deploy with Docker in a single command.
- 🌐 **REST API** — Programmatic integration via API endpoints.
- 🔒 **Privacy First** — No user data is stored; sessions are ephemeral.

---

## 🧰 Tech Stack

| Technology | Description |
|------------|-------------|
| Next.js 14 | App Router framework |
| TypeScript | Primary language |
| Playwright | Browser automation |
| Docker | Containerization |
| npm | Package management |

---

## 📋 Prerequisites

Before getting started, install:

- **Node.js** v18 or later
- **npm** v9 or later
- **Playwright** (installed during setup)
- *(Optional)* Docker & Docker Compose

---

## 🚀 Installation & Setup

### Local Development

#### 1. Clone the repository

```bash
git clone https://github.com/rahulbatham767/academia_pdf_downloader.git
cd academia_pdf_downloader
```

#### 2. Install dependencies

```bash
npm install
```

#### 3. Install Playwright browsers

```bash
npx playwright install
```

#### 4. Start the development server

```bash
npm run dev
```

Open your browser at:

```text
http://localhost:3000
```

---

## 🐳 Docker Deployment

### Build the image

```bash
docker build -t academia-pdf-downloader .
```

### Run the container

```bash
docker run -p 3000:3000 academia-pdf-downloader
```

### Or use Docker Compose

```bash
docker-compose up -d
```

The application will be available on **http://localhost:3000**.

---

## ⚙️ Configuration

Create a `.env.local` file in the project root.

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_BASE` | Base API path | `/api` |
| `DOWNLOAD_TIMEOUT` | PDF timeout (ms) | `60000` |
| `HEADLESS` | Run browser headless | `true` |
| `USER_AGENT` | Custom browser User-Agent | Default |

Example:

```env
NEXT_PUBLIC_API_BASE=/api
DOWNLOAD_TIMEOUT=60000
HEADLESS=true
USER_AGENT=Mozilla/5.0
```

---

## 🖥️ Usage

### Web Interface

1. Visit `http://localhost:3000`
2. Paste an Academia.edu paper URL.
3. Click **Download PDF**.
4. Wait for the automation to finish.
5. The PDF will automatically download.

Example URL:

```text
https://www.academia.edu/12345678/Paper_Title
```

---

## 🌐 REST API

### Endpoint

```http
POST /api/download
```

### Request

```json
{
  "url": "https://www.academia.edu/12345678/Paper_Title"
}
```

### Response

Returns the PDF as a binary stream.

**Content-Type**

```text
application/pdf
```

### cURL Example

```bash
curl -X POST http://localhost:3000/api/download \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.academia.edu/12345678/Paper_Title"}' \
  --output paper.pdf
```

---

## 📁 Project Structure

```text
academia_pdf_downloader/
├── app/
│   ├── api/
│   │   └── download/
│   ├── page.tsx
│   └── layout.tsx
├── components/
├── lib/
├── public/
├── .env.local
├── Dockerfile
├── package.json
└── README.md
```

---

## ⚠️ Legal & Ethical Disclaimer

This project is intended **only for educational and personal reference purposes**.

It **does not**:

- Bypass paywalls
- Circumvent authentication
- Access private or restricted documents

Users are responsible for:

- Respecting copyright laws
- Following Academia.edu Terms of Service
- Using downloaded material only for fair use, research, or study

The author and contributors are **not liable** for misuse of this software.

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create your feature branch

```bash
git checkout -b feature/my-feature
```

3. Commit your changes

```bash
git commit -m "Add new feature"
```

4. Push to GitHub

```bash
git push origin feature/my-feature
```

5. Open a Pull Request

For major changes, please open an issue first to discuss your proposal.

---

## 📄 License

This project is licensed under the **MIT License**.

See the [LICENSE](LICENSE) file for more information.

---

## 🙏 Acknowledgements

- **Academia.edu** for hosting academic publications
- **Next.js** for the web framework
- **Playwright** for reliable browser automation

---

## 📬 Contact

**Maintainer:** Rahul Batham

- GitHub: https://github.com/rahulbatham767

If you have questions, suggestions, or bug reports, please open an issue in the repository.

---

<div align="center">

**Happy Researching! 📚**

Made with ❤️ using Next.js & Playwright

</div>
