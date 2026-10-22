
from mcp.server.mcpserver import MCPServer

from app.agent import answer_question
from app.services.documents import list_documents, search_documents

mcp = MCPServer(
    name="HomeGuide",
    instructions=(
        "HomeGuide helps users troubleshoot household appliances "
        "using uploaded manuals. Search the manuals before making "
        "manufacturer-specific claims. Never invent instructions."
    ),
)


@mcp.tool()
def list_home_manuals() -> dict:
    """List the appliance manuals stored in HomeGuide."""
    manuals = list_documents()
    return {"manuals": manuals, "count": len(manuals)}


@mcp.tool()
def search_home_manuals(question: str) -> dict:
    """Search uploaded appliance manuals for relevant passages."""
    if not question.strip():
        return {"results": [], "message": "Please provide a question."}

    results = search_documents(question, limit=5)
    return {
        "query": question,
        "count": len(results),
        "results": results,
    }


@mcp.tool()
def ask_homeguide(question: str) -> dict:
    """Answer a question using available appliance manuals."""
    if not question.strip():
        return {"error": "Please provide a question."}

    return answer_question(question)


if __name__ == "__main__":
    mcp.run(
        transport="streamable-http",
        host="127.0.0.1",
        port=8001,
        stateless_http=True,
        json_response=True,
    )
