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

