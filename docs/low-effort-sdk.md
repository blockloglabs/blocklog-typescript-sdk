# Low-effort instrumentation

Manual `client.recordEvent()` uses the current backend log-ingestion contract.
The SDK's optional OpenAI, LangChain, and LangGraph integrations are opt-in;
they do not authorize global monkey-patching, source rewriting, or automatic
capture of sensitive request bodies.

Future `blocklog init` tooling should detect dependencies, propose explicit
adapter setup, and emit through the same event pipeline with redaction and
per-integration opt-out. `AgentEvent`, `LLMCall`, `ToolCall`, and
`ExecutionReceipt` are portable type boundaries, not promises of separate
backend endpoints or a canonical receipt protocol.
