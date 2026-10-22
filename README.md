\# HomeGuide — Local AI Home Troubleshooting Assistant



\*\*Track:\*\* Amazon Developer Hackathon 2026 — Alexa+  

\*\*Project status:\*\* Local AI and MCP workflow implemented; Alexa+ integration must be verified separately.



\## 1. Overview



HomeGuide is a home-appliance troubleshooting assistant that searches uploaded manuals and uses a locally running language model to provide concise, source-grounded answers.



Its goal is to help users find relevant instructions without sending document content to a hosted LLM provider.



\## 2. Key Features



\- \*\*Local AI inference:\*\* Uses Ollama with Qwen 2.5 3B.

\- \*\*Manual upload:\*\* Supports PDF, TXT, and Markdown documents through the existing backend.

\- \*\*Document retrieval:\*\* Searches stored manual text for relevant passages.

\- \*\*Source attribution:\*\* Returns filenames and retrieval metadata with answers.

\- \*\*MCP tools:\*\* Exposes manual listing, manual search, and question answering.

\- \*\*Web interface:\*\* React and Vite frontend.

\- \*\*Local API:\*\* FastAPI backend.

\- \*\*Safety-conscious responses:\*\* Encourages users to consult actual manufacturer instructions and qualified technicians for hazardous or internal repairs.



\## 3. Architecture



```text

React + Vite frontend

&#x20;       |

&#x20;       v

FastAPI backend (port 8000)

&#x20;       |

&#x20;       +--> Document upload and extraction

&#x20;       |

&#x20;       +--> Manual retrieval

&#x20;       |

&#x20;       +--> Ollama API (Qwen 2.5 3B)

&#x20;       |

&#x20;       +--> MCP server (port 8001)

&#x20;                 |

&#x20;                 +--> list\_home\_manuals

&#x20;                 +--> search\_home\_manuals

&#x20;                 +--> ask\_homeguide

```



The backend and MCP server use the same local document store and answer engine.



\## 4. Technology Stack



| Component | Technology |

|---|---|

| Frontend | React, Vite, JavaScript |

| Backend | Python, FastAPI |

| AI inference | Ollama, Qwen 2.5 3B |

| Document processing | pypdf and text extraction |

| Tool interface | Model Context Protocol (MCP) |

| Local storage | Filesystem-based document storage |



\## 5. Prerequisites



Install the following:



\- Python and the project's backend virtual environment

\- Node.js and npm

\- Ollama

\- The `qwen2.5:3b` model



Download the model if it is not already installed:



```powershell

ollama pull qwen2.5:3b

```



Check that it is available:



```powershell

ollama list

```



\## 6. Run HomeGuide on Windows



Open PowerShell.



\### Start all services



If the startup script has been created:



```powershell

cd C:\\HomeGuide

Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

.\\start-homeguide.ps1

```



Ensure Ollama is running and stop duplicate backend or MCP processes before starting the script.



\### Service URLs



\- Frontend: http://localhost:5173

\- Backend API documentation: http://127.0.0.1:8000/docs

\- MCP endpoint: http://127.0.0.1:8001/mcp



The MCP endpoint is a protocol endpoint, not a conventional webpage.



\## 7. MCP Tools



\### `list\_home\_manuals`



Lists manuals currently stored by HomeGuide.



\### `search\_home\_manuals`



Searches uploaded manuals for passages relevant to a question.



Input:



```json

{

&#x20; "question": "What should I check if my washing machine does not start?"

}

```



\### `ask\_homeguide`



Retrieves relevant manual passages and asks the local model to produce an answer grounded in that context.



Input:



```json

{

&#x20; "question": "What should I check if my washing machine does not start?"

}

```



All three tool names are part of the existing implementation and should remain stable.



\## 8. Privacy



HomeGuide is designed for local inference. When the local Ollama model and local services are used, inference does not require sending the prompt to a hosted LLM provider.



This does not automatically guarantee that every part of the application is offline: installation, model downloads, browser resources, or future integrations may use the network. Users should review any connected services before uploading sensitive documents.



\## 9. Safety and Limitations



\- Answers depend on the contents and quality of uploaded manuals.

\- Retrieval results may be incomplete or irrelevant.

\- Source citations indicate retrieved documents; they do not independently verify that an answer is correct.

\- Users should consult the actual manufacturer manual for model-specific instructions.

\- Do not attempt internal electrical, gas, or other hazardous repairs based solely on AI guidance.

\- The current local implementation should not be represented as a certified repair system.



\## 10. Demo Walkthrough



1\. Open the HomeGuide interface.

2\. Upload a sample appliance manual.

3\. Ask a question covered by the manual.

4\. Show the answer and its source filename.

5\. Ask a question not covered by the manual and demonstrate the unknown-information behavior.

6\. Demonstrate the three MCP tools using an MCP client.

7\. Explain how local inference supports privacy.



\## 11. Hackathon Integration Status



HomeGuide has a local AI answer engine and a working MCP implementation with three tools.



\*\*MCP support alone does not prove that Alexa+ integration is complete.\*\* Before claiming Alexa+ compatibility, verify the current hackathon requirements and demonstrate the required integration using the permitted method.



\## 12. Project Goals



HomeGuide aims to make household troubleshooting more accessible by combining local AI, manual retrieval, source attribution, and a clear interface.



