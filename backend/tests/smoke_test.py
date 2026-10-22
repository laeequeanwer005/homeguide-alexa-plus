
import asyncio
import json
import urllib.request

from app.agent import answer_question
from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client


MCP_URL = "http://127.0.0.1:8001/mcp"
OLLAMA_URL = "http://127.0.0.1:11434/api/tags"

EXPECTED_TOOLS = {
    "list_home_manuals",
    "search_home_manuals",
    "ask_homeguide",
}


def check_ollama():
    print("\n[1/4] Checking local Ollama...")
    request = urllib.request.Request(OLLAMA_URL)

    with urllib.request.urlopen(request, timeout=10) as response:
        data = json.loads(response.read().decode("utf-8"))

    models = [model["name"] for model in data.get("models", [])]
    assert any(name.startswith("qwen2.5:3b") for name in models), (
        "qwen2.5:3b is not installed in Ollama."
    )

    print("PASS: Ollama responds and Qwen is installed.")


def check_local_answer():
    print("\n[2/4] Checking local AI answer generation...")

    result = answer_question(
        "What should I check if the washing machine does not start?"
    )

    assert result.get("mode") == "local_llm", (
        f"Expected local_llm, got {result.get('mode')}: "
        f"{result.get('detail', '')}"
    )

    assert result.get("answer", "").strip(), "Answer is empty."
    assert result.get("sources"), "No source references returned."

    print("PASS: Local model generated an answer.")
    print("Answer:", result["answer"])
    print("Sources:", result["sources"])


async def check_mcp():
    print("\n[3/4] Checking MCP tools...")

    async with streamable_http_client(MCP_URL) as (
        read_stream,
        write_stream,
    ):
        async with ClientSession(read_stream, write_stream) as session:
            await session.initialize()
            result = await session.list_tools()

            actual_tools = {tool.name for tool in result.tools}
            missing = EXPECTED_TOOLS - actual_tools

            assert not missing, f"Missing MCP tools: {missing}"

            print("PASS: All three MCP tools are available.")

            print("\n[4/4] Testing ask_homeguide through MCP...")

            result = await session.call_tool(
                "ask_homeguide",
                {
                    "question": (
                        "What should I check if the washing machine "
                        "does not start?"
                    )
                },
            )

            assert not result.is_error, "MCP tool returned an error."

            content = "\n".join(
                item.text
                for item in result.content
                if hasattr(item, "text")
            )

            assert '"mode": "local_llm"' in content, (
                "MCP response did not report local_llm mode."
            )

            assert "demo_washing_machine.txt" in content, (
                "Expected demo manual source was not returned."
            )

            print("PASS: MCP returned a local AI answer and its source.")


def main():
    check_ollama()
    check_local_answer()
    asyncio.run(check_mcp())

    print("\nALL HOMEGUIDE SMOKE TESTS PASSED.")


if __name__ == "__main__":
    main()
