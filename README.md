<div align="center">
  <img src="https://github.com/Kobar-Project/KoBar/raw/master/build/icon.png" alt="KoBar Logo" width="120"/>
  <h1>AI Hub - KoBar Plugin</h1>
  <p><em>A multi-threaded, creative AI assistant right on your screen edge.</em></p>
  
  [![KoBar Ecosystem](https://img.shields.io/badge/KoBar-Ecosystem-f4a125?style=for-the-badge&logo=electron&logoColor=white)](https://github.com/Kobar-Project)
  [![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
</div>

---

KoBar is a versatile platform designed to host a rich ecosystem of plugins, seamlessly integrating powerful tools directly into your daily workflow. As a core extension for this ecosystem, **AI Hub** transforms KoBar into a multi-threaded creative assistant that lives on the edge of your screen.

## What is AI Hub?

AI Hub is a versatile, multi-model AI assistant integrated directly into the KoBar sidebar. It allows you to chat with industry-leading language models—such as Anthropic's Claude, OpenAI's GPT, Google's Gemini, or your own local LLMs (via Ollama or LM Studio)—without ever leaving your current context.

Whether you need quick coding help, content generation, or document analysis, AI Hub is always just a click away on the edge of your screen.

## Key Features

- **Multi-Model Support:** Connect to major AI providers (Anthropic, OpenAI, Gemini) or run local open-source models using Ollama and LM Studio.
- **Deep KoBar Integration:** 
  - One-click "Send to Slot" action to instantly push AI responses to your KoBar clipboard manager.
  - Native KoBar UI with smart positioning, glass-morphism design, and multi-monitor support.
- **Rich Chat Interface:** Supports Markdown formatting, syntax-highlighted code blocks with a one-click copy button, and streaming responses.
- **File & Image Attachments:** Drag and drop files directly into the chat for the AI to analyze (supports text and vision).
- **Customizable Profiles:** Personalize your experience by uploading custom avatars for both yourself and the AI assistant, and configure global system prompts and custom instructions.
- **Persistent Chat History:** Seamlessly manage multiple chat threads, rename conversations, and pick up right where you left off.
- **Multi-Language Support:** The UI is localized in 10 different languages out of the box.

## How it Works

The AI Hub plugin operates as a sandboxed React component within the KoBar environment:
1. **Registration:** It registers a sidebar button, a main panel, and a settings panel using the `window.KoBarExtensions` API.
2. **State Management:** It uses a persistent Zustand store (`usePluginChatStore`) to manage chat histories, API keys, and configurations.
3. **Communication:** When you send a message, the React frontend securely constructs the payload and sends it to KoBar's Electron backend via IPC (`window.api.llmRequest`). The backend handles the actual HTTP requests to the respective AI providers (Anthropic, Local URL, etc.) and streams the response chunks back to the UI in real-time.

## Configuration

To get started, open the AI Hub panel and click the **Settings** (gear) icon:
1. Choose your **Default Model**.
2. Enter your API keys for Anthropic (Claude) or configure your Local URL (e.g., `http://localhost:11434` for Ollama).
3. Set up custom System Messages and Instructions to tailor the AI's behavior to your workflow.

---

## ✉️ Contact

For support or inquiries, you can contact us at [hello@kobar.org](mailto:hello@kobar.org).

[KoBar.org](https://kobar.org)

---

## 💛 Sponsors & Backers

If you find KoBar useful and want to support its ongoing development, consider backing the project through any of the platforms below:

<p align="center">
  <a href="https://www.patreon.com/kobarproject" target="_blank">
    <img src="https://img.shields.io/badge/Patreon-F96854?style=for-the-badge&logo=patreon&logoColor=white" alt="Become a Patron" />
  </a>
  <a href="https://opencollective.com/kobar" target="_blank">
    <img src="https://img.shields.io/badge/Open_Collective-7FADF2?style=for-the-badge&logo=open-collective&logoColor=white" alt="Open Collective" />
  </a>
</p>
