# Kolb-Bot 👋

![Kolb-Bot Status](https://img.shields.io/badge/Status-Active-brightgreen)

**Kolb-Bot** is a customized, self-hosted AI platform designed to operate entirely offline. This project is a specialized fork of [Open WebUI](https://github.com/open-webui/open-webui), tailored with custom branding, configurations, and specialized behaviors for a unique chat interface experience. It natively supports various LLM runners like **Ollama** and **OpenAI-compatible APIs**, alongside a **built-in inference engine** for Retrieval Augmented Generation (RAG).

## Features of this Fork
- **Custom Branding**: Fully rebranded user interface, including customized logos, app names, and PWA manifests pointing to "Kolb-Bot".
- **Independent Versioning**: Maintains its own release versioning (currently v0.9.2).
- **Core Open WebUI Features**: Inherits all the powerful features of Open WebUI, including multi-model conversations, RAG, Web Browsing, Voice/Video Call integrations, and granular permissions.

## Quick Start (Development)

### Prerequisites
- Node.js (v18+)
- Python (v3.11)

### Setup & Run

1. **Frontend Development**
   ```bash
   npm install
   npm run dev
   ```
   The frontend will be available at `http://localhost:5173`.

2. **Backend Development**
   ```bash
   cd backend
   pip install -r requirements.txt
   ./start.sh
   ```
   The backend API will run on `http://localhost:8080`.

### Running with Docker
You can run the full stack (Frontend + Backend) using Docker Compose:
```bash
make startAndBuild
```
or 
```bash
docker compose up -d --build
```

---

## Origin / Upstream
*This project is a fork of the amazing [Open WebUI](https://github.com/open-webui/open-webui) project. Please consult the [official documentation](https://docs.openwebui.com/) for detailed usage of the underlying platform.*
