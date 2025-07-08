# Deep Research Agent Tutorial

**Beginner-friendly tutorial** implementing OpenAI Deep Research API patterns using Agency Swarm v1.x framework.

## 🎯 Project Overview

This tutorial demonstrates two research patterns from the [OpenAI Deep Research Cookbook](https://cookbook.openai.com/examples/deep_research_api/deep_research_agents):

1. **Basic Research** - Single agent with web search
2. **Multi-Agent Research** - Four agents with handoffs pattern

## 📚 Key Features

- ✅ **Beginner-friendly**: Simple Agency Swarm v1.0 patterns
- ✅ **Cookbook aligned**: Exact prompts and models from OpenAI cookbook
- ✅ **Modern demos**: Streaming terminal with debug events + Copilot UI support
- ✅ **Hybrid search**: Web + internal documents via MCP integration
- ✅ **Auto file upload**: Agency Swarm handles files/ folder automatically
- ✅ **Citation processing**: Extract and display research sources
- ✅ **Enhanced PDF Generation**: Professional PDFs with numbered URL references using WeasyPrint and full markdown support

## 📁 Current Structure

```
deep-research-agent-tutorial/
├── BasicResearchAgency/
│   └── agency.py                     # 🎯 Single agent research (simplest)
├── DeepResearchAgency/
│   ├── agency.py                     # 🎯 Multi-agent handoffs pattern
│   ├── ClarifyingAgent/              # Asks clarification questions
│   ├── InstructionBuilderAgent/      # Enriches research queries
│   └── ResearchAgent/                # Performs final research
├── files/                            # Knowledge files for research context
├── mcp/                              # MCP server for internal search
└── utils/                            # Shared utilities
    ├── demo.py                       # Terminal and Copilot UI demos
    └── pdf.py                        # PDF generation with citations
```

## 🚀 Quick Start

### 1. Set up environment
```bash
# Install dependencies
pip install -r requirements.txt

# Create .env file with your OpenAI API key
echo "OPENAI_API_KEY=<OPENAI_API_KEY> > .env

# Add knowledge files to ./files folder (optional)
# Supports: .txt, .md, .json, .csv
```

### 2. Start MCP Server (for internal file search)

⚠️ **IMPORTANT**: For use with OpenAI's API, the MCP server must be publicly accessible. Use ngrok or similar:

```bash
# Terminal 1: Start the local MCP server
python mcp/start_mcp_server.py

# Terminal 2: Expose via ngrok (required for OpenAI API access)
ngrok http 8001

# Copy the ngrok URL (e.g., https://abc123.ngrok-free.app)
# Update agency.py files with the ngrok URL + /sse
# Set the MCP_SERVER_URL environment variable before running the agency
export MCP_SERVER_URL="https://<your-ngrok-url>.ngrok-free.app/sse"
```

The server will auto-detect your vector store from `files_vs_*` folders.

### 3. Run Basic Research (Simplest)
```bash
cd BasicResearchAgency
# Run with ngrok URL
MCP_SERVER_URL="https://<your-ngrok-url>.ngrok-free.app/sse" python agency.py
# Or run with local server
python agency.py
# Launch Copilot UI
MCP_SERVER_URL="https://<your-ngrok-url>.ngrok-free.app/sse" python agency.py --ui
```

### 4. Run Multi-Agent Research (Advanced)
```bash
cd DeepResearchAgency
# Run with ngrok URL
MCP_SERVER_URL="https://<your-ngrok-url>.ngrok-free.app/sse" python agency.py
# Or run with local server
python agency.py
# Launch Copilot UI
MCP_SERVER_URL="https://<your-ngrok-url>.ngrok-free.app/sse" python agency.py --ui
```

## 🔧 Architecture

### BasicResearchAgency
- **Single Agent**: Research Agent
- **Model**: `o4-mini-deep-research-2025-06-26` (fast)
- **Tools**: WebSearchTool + MCP internal search
- **Perfect for**: Beginners, simple research tasks

### DeepResearchAgency
- **Entry Point**: Triage Agent
- **Flow**: Triage → [Clarifying] → Instruction → Research
- **Pattern**: Sequential handoffs
- **Features**: Citation processing, agent interaction flow
- **Perfect for**: Complex research with clarification workflow

## 🔗 MCP Integration ⚠️ CRITICAL

**Why MCP is Required**: OpenAI's FILE SEARCH TOOL is **NOT supported** with deep research models. MCP is the ONLY way to access internal documents.

### 🌐 Public Access Requirement

**IMPORTANT**: When using with OpenAI's API, the MCP server must be publicly accessible:
- **Local testing**: Works with `http://localhost:8001/sse`
- **OpenAI API**: Requires public URL (use ngrok, cloudflare tunnel, etc.)

### 🎯 How Vector Store Detection Works (Automatic!)

**Simple 3-Step Process**:
1. **Run an Agency** → Agency Swarm uploads `./files/` and creates `files_vs_[id]` folder
2. **Start MCP Server** → Automatically finds the `files_vs_*` folder and extracts vector store ID
3. **Research Works** → Agents can now search both web + your internal documents

**Priority Order** (for advanced users):
- **Environment Variable**: `VECTOR_STORE_ID=vs_xxxxx` (manual override)
- **Auto-Detection**: Finds `files_vs_*` folders automatically
- **Error**: Clear guidance if no vector store exists

**Key Benefits**:
- ✅ **Zero Configuration** - Works automatically after first agency run
- ✅ **Persistent** - Vector store persists and gets reused across sessions
- ✅ **Multi-Agency** - Handles multiple agencies (uses most recent)

### 🔧 Technical Implementation

**MCP Server Architecture**:
- **Auto-Detection**: Finds `files_vs_*` folders across agency directories automatically
- **Priority System**: Environment variable override → folder detection → clear error guidance
- **Modular Design**: Clean separation between server and detection utilities
- **FastMCP 2.10+**: Requires latest version for compatibility

## 👨‍💻 Customization Guide

### 1. Copy `DeepResearchAgency` folder

```bash
cp -r DeepResearchAgency/ MyCustomResearchAgency/
```

### 2. Add your local files

Add your files for analysis to the `files/` folder.

### 3. Add any other MCP servers in `ResearchAgent.py`

```python
# ... inside agent class
tools = [
    # Add any other tools here
    HostedMCPTool(
        tool_config={
            "type": "mcp",
            "server_label": "github_mcp",
            "server_url": "https://api.githubcopilot.com/mcp/",
            "require_approval": "never",
            "headers": {
                "Authorization": "Bearer ${input:github_mcp_pat}"
            }
        }
    ),
]

#...
```

### 4. Adjust agent instructions

Adjust the `instructions.md` file in the `ResearchAgent` folder.

Adjust any other agent instructions as needed.

### 5. Run the Agency

```bash
cd MyCustomResearchAgency
cd DeepResearchAgency
# Run with ngrok URL
MCP_SERVER_URL="https://<your-ngrok-url>.ngrok-free.app/sse" python agency.py
# Or run with local server
python agency.py
# Launch Copilot UI
MCP_SERVER_URL="https://<your-ngrok-url>.ngrok-free.app/sse" python agency.py --ui
```

## 🧪 Testing

```bash
python tests/test_comprehensive.py
# Comprehensive testing of all features and components
```


