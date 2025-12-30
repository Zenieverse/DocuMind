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

## Model on Hugging Face

- ERNIE 4.5 Document Reasoning  
  https://huggingface.co/Zenieverse/DocuMind-ERNIE4.5-Document-Reasoning

---
license: apache-2.0
tags:
- ernie
- ernie-4.5
- document-ai
- multimodal
- paddleocr
- hackathon
language:
- en
---

# DocuMind – ERNIE 4.5 Document Reasoning

Fine-tuned ERNIE 4.5 model for structured document understanding and reasoning from OCR text.

## 🔍 What It Does

- Classifies document sections
- Extracts entities (dates, totals, parties)
- Detects risks and inconsistencies
- Produces structured JSON outputs for automation

## 💡 Use Cases

- Contract analysis
- Invoice parsing
- Document QA assistants
- Knowledge base generation

## 🧠 Training

Trained with Unsloth / LLaMA-Factory on OCR outputs from PaddleOCR-VL.

## 📦 Files

- Model weights and configs
- Tokenizer files
- README.md for documentation

## 🔗 Related Project

DocuMind AI: multimodal document intelligence platform  
https://github.com/zenieverse/documind

## 📜 License

Apache-2.0
