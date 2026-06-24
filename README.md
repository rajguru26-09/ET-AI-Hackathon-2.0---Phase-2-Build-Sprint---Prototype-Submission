# ET-AI-Hackathon-2.0---Phase-2-Build-Sprint---Prototype-Submission
ET AI Hackathon 2026 Submission - Problem Statement 8

# Aegis - Industrial Knowledge Brain

**ET AI Hackathon 2026 Project**

## 👥 Team
* Aryan Kumawat
* Rajguru Sevda

Aegis is a Unified Asset & Operations Brain for Industrial Intelligence. It features an AI-powered **Expert Knowledge Copilot** designed to help operators and engineers query industrial procedures, safety protocols, and equipment status.

## 🚀 Features

*   **Expert Knowledge Copilot:** An AI assistant interface for asking queries about industrial operations.
*   **Knowledge Base Ingestion:** Upload industrial documents (PDF, TXT, manuals) to build the knowledge graph.
*   **Custom RAG Pipeline:** Simulates a Retrieval-Augmented Generation (RAG) pipeline using TF-IDF and Cosine Similarity for document search and sentence-level extraction—all built from scratch in Python.
*   **Entity Extraction:** Extracts key industrial entities from the text for knowledge graph building.
*   **Modern UI/UX:** A responsive, beautiful frontend utilizing modern web design principles and Phosphor Icons.

## Technology Stack

*   **Backend:** Python (Vanilla `http.server`, custom TF-IDF & Cosine Similarity search, `pypdf` for PDF parsing).
*   **Frontend:** Vanilla HTML5, CSS3, and JavaScript.

## Project Structure

```
ET_AI_Hackathon2.0/
├── Industrial_Knowledge_Brain/
│   ├── backend/
│   │   └── main.py       # Python API server and RAG logic
│   └── frontend/
│       ├── index.html    # Main UI layout
│       ├── styles.css    # UI styling
│       └── app.js        # UI logic and API communication
├── Aegis Brain Architecture Diagram.pdf
├── ET_AI_Hackathon_2026_Problem_Statements.pdf
└── Technical_Documentation - Aegis Brain.pdf
```

## How to Run Locally

### 1. Start the Backend Server
The backend requires Python. You may also need to install `pypdf` if you want to test PDF uploads.
```bash
pip install pypdf
cd Industrial_Knowledge_Brain/backend
python main.py
```
The server will start on `http://localhost:8000`.

### 2. Launch the Frontend
You can simply open the `index.html` file in your browser.


# Usage

1. Open the web interface.
2. Use the left sidebar to drag and drop or select industrial documents to upload.
3. In the main chat area, ask questions like *"What is the RCA for recent pump failures?"* or *"Show me the safety checklist for confined space."*
4. Aegis will search the ingested documents and provide a synthesized response with a confidence score and source citations.
