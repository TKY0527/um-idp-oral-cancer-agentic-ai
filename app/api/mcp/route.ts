import { NextResponse } from "next/server";
import {
  DOCTOR_TOOLS,
  dispatchDoctorTool,
} from "@/lib/agents/tools/doctorTools";
import { loadEnvLocal } from "@/lib/utils/loadEnvLocal";

loadEnvLocal();

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * MCP server — Model Context Protocol over Streamable HTTP (JSON-RPC 2.0).
 *
 * Exposes the SAME self-describing tool registry the in-process Doctor
 * Assistant uses (profile / sessions / cohort compare / knowledge search /
 * skills) to EXTERNAL AI clients: add this URL to Claude Desktop, Claude
 * Code (`claude mcp add --transport http`), or any MCP client and the
 * tools become callable from there. One registry, two surfaces.
 *
 * Auth: requires `Authorization: Bearer ${MCP_ACCESS_TOKEN}`. When the env
 * var is not set the endpoint stays disabled (secure default) — this demo
 * server exposes patient demo data, so it is opt-in.
 *
 * Implemented methods: initialize, notifications/initialized, ping,
 * tools/list, tools/call.
 */

const PROTOCOL_VERSION = "2025-06-18";

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: number | string | null;
  method?: string;
  params?: Record<string, unknown>;
}

function rpcResult(id: number | string | null, result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id, result });
}

function rpcError(
  id: number | string | null,
  code: number,
  message: string,
  status = 200
) {
  return NextResponse.json(
    { jsonrpc: "2.0", id, error: { code, message } },
    { status }
  );
}

/** Convert a registry tool's simple param map into a JSON Schema. */
function toolToMcp(tool: (typeof DOCTOR_TOOLS)[number]) {
  const properties: Record<string, unknown> = {};
  for (const [name, description] of Object.entries(tool.parameters)) {
    properties[name] = { type: "string", description };
  }
  return {
    name: tool.name,
    description: tool.description,
    inputSchema: { type: "object", properties, required: [] },
  };
}

function authorized(req: Request): boolean {
  const token = process.env.MCP_ACCESS_TOKEN;
  if (!token) return false; // endpoint disabled until a token is configured
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${token}`;
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    const reason = process.env.MCP_ACCESS_TOKEN
      ? "Invalid bearer token"
      : "MCP endpoint disabled — set MCP_ACCESS_TOKEN to enable it";
    return NextResponse.json({ error: reason }, { status: 401 });
  }

  let body: JsonRpcRequest;
  try {
    body = (await req.json()) as JsonRpcRequest;
  } catch {
    return rpcError(null, -32700, "Parse error", 400);
  }
  const id = body.id ?? null;

  switch (body.method) {
    case "initialize":
      return rpcResult(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: {
          name: "oralscan-ai",
          title: "OralScan AI — patient tools, knowledge base & skills",
          version: "1.0.0",
        },
        instructions:
          "Educational oral-screening prototype. Tools expose DEMO patient data, a bilingual oral-health knowledge base (search_knowledge), and care-protocol skills (list_skills/get_skill). Not medical advice.",
      });

    case "notifications/initialized":
      // Notification — no response body expected.
      return new NextResponse(null, { status: 202 });

    case "ping":
      return rpcResult(id, {});

    case "tools/list":
      return rpcResult(id, { tools: DOCTOR_TOOLS.map(toolToMcp) });

    case "tools/call": {
      const params = body.params ?? {};
      const name = typeof params.name === "string" ? params.name : "";
      const args = (params.arguments ?? {}) as Record<string, unknown>;
      if (!name) return rpcError(id, -32602, "params.name is required");
      const result = await dispatchDoctorTool(name, args, {
        // MCP callers address patients explicitly via tool args.
        patientId: typeof args.patientId === "string" ? args.patientId : "*",
      });
      const isError = Boolean((result as { error?: string })?.error);
      return rpcResult(id, {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        isError,
      });
    }

    default:
      return rpcError(id, -32601, `Method not found: ${body.method ?? "(none)"}`);
  }
}

/** GET — human-readable description (handy for checking the deploy). */
export async function GET() {
  return NextResponse.json({
    name: "oralscan-ai MCP server",
    transport: "streamable-http (JSON-RPC 2.0 over POST)",
    protocolVersion: PROTOCOL_VERSION,
    enabled: Boolean(process.env.MCP_ACCESS_TOKEN),
    auth: "Authorization: Bearer <MCP_ACCESS_TOKEN>",
    tools: DOCTOR_TOOLS.map((t) => t.name),
    connect: {
      claudeCode:
        'claude mcp add --transport http oralscan <this-url> --header "Authorization: Bearer <token>"',
    },
  });
}
