const OPENAI_USAGE_URL = 'https://api.openai.com/v1/organization/usage/completions';

export interface OpenAIOrgUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  numRequests: number;
  models: Array<{ model: string; inputTokens: number; outputTokens: number; totalTokens: number; requests: number }>;
}

export function isOpenAIAdminConfigured(): boolean {
  return Boolean(process.env.OPENAI_ADMIN_API_KEY && process.env.OPENAI_PROJECT_ID);
}

export async function getOpenAIProjectUsage(): Promise<OpenAIOrgUsage | null> {
  const adminKey = process.env.OPENAI_ADMIN_API_KEY;
  const projectId = process.env.OPENAI_PROJECT_ID;

  if (!adminKey || !projectId) return null;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startTime = Math.floor(startOfMonth.getTime() / 1000);
  // End time: now (or end of current day)
  const endTime = Math.floor(now.getTime() / 1000) + 60;

  const params = new URLSearchParams({
    start_time: String(startTime),
    end_time: String(endTime),
    project_ids: projectId,
    bucket_width: '1d',
    group_by: 'model',
  });

  const response = await fetch(`${OPENAI_USAGE_URL}?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${adminKey}`,
      'Content-Type': 'application/json',
    },
    next: { revalidate: 300 }, // cache for 5 minutes
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    console.error(`OpenAI usage API failed (${response.status}): ${errText}`);
    return null;
  }

  const data = await response.json();

  // The response has { data: [ { results: [ { input_tokens, output_tokens, ... } ] } ] }
  // Each bucket is a time period, each result within is grouped by model
  let inputTokens = 0;
  let outputTokens = 0;
  let numRequests = 0;
  const modelMap = new Map<string, { inputTokens: number; outputTokens: number; totalTokens: number; requests: number }>();

  const buckets = Array.isArray(data?.data) ? data.data : [];
  for (const bucket of buckets) {
    const results = Array.isArray(bucket?.results) ? bucket.results : [];
    for (const result of results) {
      const inp = Number(result.input_tokens ?? 0);
      const out = Number(result.output_tokens ?? 0);
      const reqs = Number(result.num_model_requests ?? 0);
      const model = String(result.model ?? result.snapshot_id ?? 'unknown');

      inputTokens += inp;
      outputTokens += out;
      numRequests += reqs;

      const existing = modelMap.get(model);
      if (existing) {
        existing.inputTokens += inp;
        existing.outputTokens += out;
        existing.totalTokens += inp + out;
        existing.requests += reqs;
      } else {
        modelMap.set(model, { inputTokens: inp, outputTokens: out, totalTokens: inp + out, requests: reqs });
      }
    }
  }

  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    numRequests,
    models: Array.from(modelMap.entries()).map(([model, stats]) => ({ model, ...stats })),
  };
}
