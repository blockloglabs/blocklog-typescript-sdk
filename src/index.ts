import { BlocklogClient, BlocklogConfig } from './client';
import { setGlobalClient } from './globals';
import { traceAgent } from './decorators/agent';
import { traceTool } from './decorators/tool';
import { executeDecision } from './decorators/decision';
import { instrumentLangChain } from './integrations/langchain';
import { instrumentLangGraph } from './integrations/langgraph';
import { instrumentOpenAIAgents } from './integrations/openai';

// Export everything individually
export * from './client';
export type { AgentEvent, LLMCall, ToolCall, ExecutionReceipt } from './models/events';
export * from './errors';
export * from './models/auth';
export * from './models/teams';
export * from './models/events';
export * from './models/responses';
export * from './utils/teams';
export { traceAgent, executeAgent } from './decorators/agent';
export { traceTool, executeTool } from './decorators/tool';
export { executeDecision, DecisionContext } from './decorators/decision';

// Export API client classes for type annotations
export { VerifyClient } from './api/verify';
export { ApprovalClient } from './api/approvals';
export { DecisionsClient } from './api/decisions';
export { IncidentsClient } from './api/incidents';
export { ComplianceClient } from './api/compliance';
export { ReplayClient } from './api/replay';

// Default export acts as the global singleton
class BlocklogGlobal {
  public client: BlocklogClient | null = null;

  public init(config: BlocklogConfig): BlocklogClient {
    this.client = new BlocklogClient(config);
    setGlobalClient(this.client);
    return this.client;
  }

  public agent = traceAgent;
  public tool = traceTool;
  public decision = executeDecision;

  public instrumentLangChain = instrumentLangChain;
  public instrumentLangGraph = instrumentLangGraph;
  public instrumentOpenAIAgents = instrumentOpenAIAgents;
}

const blocklog = new BlocklogGlobal();
export default blocklog;
