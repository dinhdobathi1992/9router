// Model metadata registry
// Only define models that differ from DEFAULT_MODEL_INFO
// Custom entries are merged over default
const DEFAULT_MODEL_INFO = {
  type: ["chat"],
  contextWindow: 200000,
};

export const MODEL_INFO = {
  "claude-opus-4-7":           { contextWindow: 1000000 },
  "claude-sonnet-4-6":         { contextWindow: 1000000 },
  "claude-opus-4-6":           { contextWindow: 1000000 },
};

export function getModelInfo(modelId) {
  return { ...DEFAULT_MODEL_INFO, ...MODEL_INFO[modelId] };
}
