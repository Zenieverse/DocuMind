<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1sCct1KFtqaNtD0cTgFSBWUIhZtbx94qG

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

DocuMind AI is an enterprise-grade multimodal document intelligence platform built on ERNIE 5, ERNIE 4.5 Open-Source, and PaddleOCR-VL.

The system ingests PDFs or scanned images and uses PaddleOCR-VL to extract text, layout, tables, and visual cues. This structured representation is then processed by a fine-tuned ERNIE 4.5 model to understand document semantics, classify sections, extract entities, and detect risks or inconsistencies.

ERNIE 5 enables advanced multimodal reasoning, allowing the system to align visual layout with textual meaning across multiple pages. On top of this reasoning layer, DocuMind AI deploys a CAMEL-AI multi-agent system that includes question-answering, validation, and web-building agents.

The platform outputs clean Markdown, structured JSON schemas, deployable HTML websites, and machine-readable instructions suitable for enterprise automation or edge robotics scenarios.

DocuMind AI addresses real-world needs such as contract analysis, invoice processing, knowledge base creation, and intelligent document workflows, making it a practical, scalable, and high-impact application for the ERNIE & PaddlePaddle ecosystem.


DocuMind AI is a multimodal document intelligence platform that transforms PDFs and scanned documents into structured, deployable knowledge systems using **ERNIE 5**, **ERNIE 4.5 Open-Source**, and **PaddleOCR-VL**.

This project is built as a pro-level submission for the **ERNIE & PaddlePaddle Innovation Challenge**, covering warm-up, model-building, and application-building tracks.

---

## 🚀 Key Features

- 📄 **Layout-aware OCR** using PaddleOCR-VL (tables, forms, multilingual text)
- 🧠 **Advanced document reasoning** with fine-tuned ERNIE 4.5
- 👁️ **Multimodal understanding** using ERNIE 5 (visual + text reasoning)
- 🤖 **Multi-agent workflows** powered by CAMEL-AI
- 🌐 **Automatic website generation** from PDFs (GitHub Pages ready)
- 🧩 **Structured outputs**: Markdown, JSON schemas, HTML
- ⚙️ **Extensible** for Edge AI & Robotics scenarios

---

## 🏗️ System Architecture

```
PDF / Image Input
        ↓
PaddleOCR-VL (Fine-tuned)
        ↓
Document Normalizer
(Markdown + JSON)
        ↓
ERNIE 4.5 (Reasoning & Structuring)
        ↓
ERNIE 5 (Multimodal Understanding)
        ↓
CAMEL-AI Agent System
        ↓
Web / Knowledge Base / API / Edge Output
```

---

## 🧪 Fine-Tuning Strategy

### PaddleOCR-VL
- Trained on invoices, contracts, manuals, and scanned forms
- Optimized for:
  - Table structure recognition
  - Key-value extraction
  - Multilingual layouts

### ERNIE 4.5 Open-Source
- Fine-tuned using **Unsloth / LLaMA-Factory**
- Tasks:
  - Section classification
  - Entity extraction
  - Risk & inconsistency detection
- Output schemas in JSON for downstream automation

### ERNIE 5
- Multimodal reasoning across pages
- Visual grounding and semantic alignment
- Instruction synthesis and explanation generation

---

## 🧠 Agent System (CAMEL-AI)

- **QA Agent** – Answers questions grounded in document content
- **Validator Agent** – Checks consistency and missing fields
- **Web Builder Agent** – Generates deployable HTML websites
- **Automation Agent** – Prepares APIs and robotic instructions

---

## 🌍 Use Cases

- 📑 Legal contract analysis
- 🧾 Invoice & finance automation
- 📘 Knowledge base generation
- 🏭 Robotics instruction parsing
- 🏢 Enterprise document intelligence

---

## 🛠️ Tech Stack

- **ERNIE 5** (Baidu AI Studio / Novita API)
- **ERNIE 4.5 Open-Source**
- **PaddleOCR-VL**
- **CAMEL-AI**
- **Python / PaddlePaddle**
- **GitHub Pages**

---

## 🎥 Demo

A ≤5-minute demo video showcasing:
- PDF upload
- OCR & layout extraction
- Multimodal reasoning
- Website generation & deployment
- Agent-based interaction

---

## 📦 Submission Assets

- Fine-tuned model weights (open-sourced)
- Full training & inference code
- Deployed demo application
- GitHub Pages website output
- Documentation & README

---

## 👤 Author

**Pro Builder**  
ERNIE & PaddlePaddle Innovation Challenge 2025

---

## 📄 License

Apache 2.0

