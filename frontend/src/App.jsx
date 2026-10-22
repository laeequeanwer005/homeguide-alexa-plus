
import { useState, useRef } from "react";
import {
  House, MessageCircle, FileText, Settings, Plus, Search,
  Send, Mic, Paperclip, ShieldCheck, Sparkles, ChevronDown,
  Bot, UserRound, Zap, Wrench, Refrigerator, WashingMachine,
  ArrowUpRight, Menu, X, CheckCircle2, Clock3, MoreHorizontal
} from "lucide-react";
import "./App.css";

const API_BASE = "http://127.0.0.1:8000";

const suggestions = [
  { icon: Refrigerator, title: "Refrigerator not cooling", text: "Help me troubleshoot my refrigerator." },
  { icon: WashingMachine, title: "Washing machine error", text: "My washing machine is showing an error code." },
  { icon: Zap, title: "Reduce energy usage", text: "How can I reduce my home's energy usage?" },
  { icon: Wrench, title: "Appliance maintenance", text: "Give me a simple appliance maintenance checklist." },
];

const initialMessages = [
  {
    role: "assistant",
    text: "Hi! I'm HomeGuide, your home troubleshooting companion. Ask me a question or upload an appliance manual. I'll search your uploaded documents when answering.",
  },
];

export default function App() {
  const [activeNav, setActiveNav] = useState("Home");
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState([]);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fileRef = useRef(null);
  const chatEndRef = useRef(null);

  function addAssistantMessage(text, sources = []) {
    setMessages((current) => [
      ...current,
      { role: "assistant", text, sources },
    ]);
  }

  async function sendMessage(text = input) {
    const question = text.trim();
    if (!question || sending) return;

    setMessages((current) => [
      ...current,
      { role: "user", text: question },
    ]);

    setInput("");
    setActiveNav("Home");
    setSent(true);
    setSending(true);

    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "The request failed.");
      }

      addAssistantMessage(
        data.answer || "HomeGuide returned an empty response.",
        data.sources || []
      );
    } catch (error) {
      addAssistantMessage(
        `I couldn't reach the HomeGuide backend. Check that the Python server is running at ${API_BASE}.\n\nDetails: ${error.message}`
      );
    } finally {
      setSending(false);
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }

  async function handleFiles(event) {
    const selected = Array.from(event.target.files || []);
    event.target.value = "";

    if (selected.length === 0) return;

    setUploading(true);

    for (const file of selected) {
      const extension = file.name.split(".").pop().toLowerCase();

      if (!["pdf", "txt", "md"].includes(extension)) {
        addAssistantMessage(
          `${file.name} was not uploaded. Please select a PDF, TXT, or Markdown file.`
        );
        continue;
      }

      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await fetch(`${API_BASE}/documents/upload`, {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Upload failed.");
        }

        setFiles((current) => [
          ...current.filter((item) => item.name !== data.filename),
          {
            name: data.filename || file.name,
            size: file.size,
            characters: data.characters,
            chunks: data.chunks,
          },
        ]);

        addAssistantMessage(
          `Successfully uploaded "${data.filename || file.name}".\n\n` +
          `Extracted text: ${data.characters} characters\n` +
          `Searchable chunks: ${data.chunks}\n\n` +
          "You can now ask questions about this manual. I'll search its extracted text for relevant passages."
        );
      } catch (error) {
        addAssistantMessage(
          `Couldn't upload "${file.name}".\n\n${error.message}\n\nCheck that the HomeGuide backend is running and try again.`
        );
      }
    }

    setUploading(false);
    setActiveNav("Home");
    setSent(true);

    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  async function loadDocuments() {
    try {
      const response = await fetch(`${API_BASE}/documents`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to load documents.");
      }

      setFiles((data.documents || []).map((document) => ({
        name: document.filename,
        size: 0,
        characters: document.characters,
      })));
    } catch (error) {
      addAssistantMessage(
        `Couldn't load the document library: ${error.message}`
      );
    }
  }

  function startNewConversation() {
    setMessages(initialMessages);
    setInput("");
    setSent(false);
    setActiveNav("Home");
    setMobileMenu(false);
  }

  return (
    <div className="app-shell">
      {mobileMenu && (
        <button
          className="mobile-scrim"
          aria-label="Close menu"
          onClick={() => setMobileMenu(false)}
        />
      )}

      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <House size={23} strokeWidth={2.3} />
          </div>
          <span>HomeGuide<span className="brand-dot">.</span></span>
          <button
            className="icon-btn mobile-close"
            onClick={() => setMobileMenu(false)}
            aria-label="Close menu"
          >
            <X size={19} />
          </button>
        </div>

        <button className="new-chat" onClick={startNewConversation}>
          <Plus size={18} /> New conversation
        </button>

        <div className="nav-label">WORKSPACE</div>

        <nav className="main-nav">
          {[
            { name: "Home", icon: House },
            { name: "Conversations", icon: MessageCircle },
            { name: "My manuals", icon: FileText },
          ].map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={`nav-item ${activeNav === name ? "nav-active" : ""}`}
              onClick={() => {
                setActiveNav(name);
                setMobileMenu(false);
                if (name === "My manuals") loadDocuments();
              }}
            >
              <Icon size={18} />
              <span>{name}</span>
              {name === "My manuals" && files.length > 0 && (
                <span className="nav-count">{files.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-section">
          <div className="nav-label">YOUR HOME</div>
          <div className="home-card">
            <div className="home-card-icon"><House size={18} /></div>
            <div>
              <div className="home-card-title">My household</div>
              <div className="home-card-subtitle">Personal workspace</div>
            </div>
            <ChevronDown size={15} className="muted-icon" />
          </div>
          <div className="sidebar-note">
            <ShieldCheck size={15} /> Your home, your control.
          </div>
        </div>

        <div className="sidebar-bottom">
          <div className="plan-card">
            <div className="plan-icon"><Sparkles size={17} /></div>
            <div>
              <strong>Built for everyday life</strong>
              <p>Clear guidance, one step at a time.</p>
            </div>
          </div>

          <button
            className={`nav-item ${activeNav === "Settings" ? "nav-active" : ""}`}
            onClick={() => setActiveNav("Settings")}
          >
            <Settings size={18} /><span>Settings</span>
          </button>

          <div className="profile-row">
            <div className="avatar">HG</div>
            <div className="profile-text">
              <strong>HomeGuide</strong>
              <span>Home assistant</span>
            </div>
            <MoreHorizontal size={19} className="muted-icon" />
          </div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-btn mobile-menu-btn"
              aria-label="Open menu"
              onClick={() => setMobileMenu(true)}
            >
              <Menu size={21} />
            </button>
            <div className="breadcrumb">
              Workspace <span>/</span> <strong>{activeNav}</strong>
            </div>
          </div>

          <div className="topbar-actions">
            <div className="status-pill">
              <span className="status-dot" /> Backend connected when running
            </div>
            <button
              className="icon-btn"
              aria-label="Focus search"
              onClick={() => document.querySelector(".chat-input")?.focus()}
            >
              <Search size={19} />
            </button>
          </div>
        </header>

        <div className="content">
          {activeNav === "My manuals" ? (
            <section className="section-page">
              <div className="eyebrow">
                <FileText size={15} /> DOCUMENT LIBRARY
              </div>
              <h1>Your manuals<span className="heading-period">.</span></h1>
              <p className="page-description">
                Upload appliance instructions and ask questions about their contents.
              </p>

              <button
                className="primary-button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                <Plus size={17} /> {uploading ? "Uploading..." : "Add a manual"}
              </button>

              <div className="manual-list">
                {files.length === 0 ? (
                  <div className="empty-state">
                    <FileText size={29} />
                    <h3>Your library is ready</h3>
                    <p>Upload a PDF, TXT, or Markdown manual to get started.</p>
                  </div>
                ) : (
                  files.map((file, index) => (
                    <div className="manual-row" key={`${file.name}-${index}`}>
                      <FileText size={22} />
                      <div>
                        <strong>{file.name}</strong>
                        <small>
                          {file.characters != null
                            ? `${file.characters} extracted characters`
                            : `${(file.size / 1024).toFixed(1)} KB`}
                        </small>
                      </div>
                      <CheckCircle2 size={18} className="success-icon" />
                    </div>
                  ))
                )}
              </div>
            </section>
          ) : activeNav === "Settings" ? (
            <section className="section-page">
              <div className="eyebrow"><Settings size={15} /> PREFERENCES</div>
              <h1>Settings<span className="heading-period">.</span></h1>
              <p className="page-description">
                HomeGuide currently uses your local Python backend for document search.
                Keep your backend running while using this application.
              </p>
            </section>
          ) : activeNav === "Conversations" ? (
            <section className="section-page">
              <div className="eyebrow"><MessageCircle size={15} /> YOUR HISTORY</div>
              <h1>Conversations<span className="heading-period">.</span></h1>
              <p className="page-description">
                This session contains {messages.filter((m) => m.role === "user").length} question(s).
                Conversation history is currently kept in browser memory.
              </p>
              <button className="primary-button" onClick={startNewConversation}>
                <Plus size={17} /> Start a new conversation
              </button>
            </section>
          ) : (
            <>
              <section className="welcome">
                <div className="eyebrow">
                  <span className="eyebrow-spark"><Sparkles size={14} /></span>
                  YOUR SMARTER HOME STARTS HERE
                </div>
                <h1>Home care,<br />made <span className="gradient-text">simpler.</span></h1>
                <p className="welcome-copy">
                  Practical guidance for your appliances and everyday home questions.
                  Let's figure it out together.
                </p>
                <div className="trust-row">
                  <span><ShieldCheck size={15} /> Safety-first guidance</span>
                  <span><FileText size={15} /> Manual-ready</span>
                  <span><Zap size={15} /> Step-by-step help</span>
                </div>
              </section>

              <section className="suggestions">
                <div className="section-heading">
                  <div>
                    <h2>What can I help with?</h2>
                    <p>Choose a starting point or ask your own question.</p>
                  </div>
                  <span className="small-counter">04 TOPICS</span>
                </div>

                <div className="suggestion-grid">
                  {suggestions.map(({ icon: Icon, title, text }) => (
                    <button
                      className="suggestion-card"
                      key={title}
                      onClick={() => sendMessage(text)}
                      disabled={sending}
                    >
                      <div className="suggestion-icon"><Icon size={21} /></div>
                      <div className="suggestion-title">{title}</div>
                      <div className="suggestion-subtitle">Get guided help</div>
                      <ArrowUpRight size={17} className="suggestion-arrow" />
                    </button>
                  ))}
                </div>
              </section>

              <section className="chat-section">
                <div className="section-heading">
                  <div>
                    <h2>{sent ? "Your conversation" : "Ask HomeGuide"}</h2>
                    <p>Describe the issue in your own words.</p>
                  </div>
                  <div className="assistant-label">
                    <span className="assistant-status" />
                    {sending ? "Thinking..." : uploading ? "Uploading..." : "Assistant ready"}
                  </div>
                </div>

                <div className="chat-window">
                  <div className="chat-messages">
                    {messages.map((message, index) => (
                      <div
                        className={`message-row ${message.role}`}
                        key={`${index}-${message.role}`}
                      >
                        <div className={`message-avatar ${message.role}`}>
                          {message.role === "assistant"
                            ? <Bot size={18} />
                            : <UserRound size={18} />}
                        </div>
                        <div className="message-body">
                          <div className="message-meta">
                            {message.role === "assistant" ? "HomeGuide" : "You"}
                            <span>
                              {message.role === "assistant"
                                ? <Sparkles size={12} />
                                : <Clock3 size={12} />}
                            </span>
                          </div>
                          <div className="message-text">{message.text}</div>

                          {message.sources?.length > 0 && (
                            <div className="attached-files">
                              {message.sources.map((source, sourceIndex) => (
                                <span key={`${source.filename}-${sourceIndex}`}>
                                  <FileText size={13} />
                                  {source.filename}, chunk {source.chunk}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {sending && (
                      <div className="message-row assistant">
                        <div className="message-avatar assistant"><Bot size={18} /></div>
                        <div className="message-body">
                          <div className="message-meta">HomeGuide</div>
                          <div className="message-text">Searching your manuals...</div>
                        </div>
                      </div>
                    )}

                    <div ref={chatEndRef} />
                  </div>

                  {files.length > 0 && (
                    <div className="attached-files">
                      {files.map((file, index) => (
                        <span key={`${file.name}-${index}`}>
                          <FileText size={13} /> {file.name}
                        </span>
                      ))}
                    </div>
                  )}

                  <form
                    className="composer"
                    onSubmit={(event) => {
                      event.preventDefault();
                      sendMessage();
                    }}
                  >
                    <textarea
                      className="chat-input"
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder="Describe what's happening at home..."
                      rows={2}
                    />

                    <div className="composer-footer">
                      <div className="composer-tools">
                        <button
                          type="button"
                          className="tool-button"
                          onClick={() => fileRef.current?.click()}
                          disabled={uploading}
                        >
                          <Paperclip size={16} />
                          {uploading ? "Uploading..." : "Attach manual"}
                        </button>
                        <button
                          type="button"
                          className="tool-button voice-button"
                          title="Voice input is not enabled yet"
                          disabled
                        >
                          <Mic size={16} /> Voice
                        </button>
                      </div>

                      <button
                        type="submit"
                        className="send-button"
                        disabled={!input.trim() || sending}
                      >
                        <span>{sending ? "Sending..." : "Send"}</span>
                        <Send size={15} />
                      </button>
                    </div>
                  </form>
                </div>

                <p className="demo-disclaimer">
                  <ShieldCheck size={14} />
                  Answers are generated locally by HomeGuide AI using your uploaded manuals. Your documents stay on your device..
                </p>
              </section>
            </>
          )}

          <footer className="footer">
            <span><span className="footer-dot" /> HOMEGUIDE · YOUR HOME, BETTER UNDERSTOOD</span>
            <span>Built with care <span className="footer-heart">♥</span></span>
          </footer>
        </div>
      </main>

      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.txt,.md"
        multiple
        hidden
        onChange={handleFiles}
      />
    </div>
  );
}
