#!/usr/bin/env node
/**
 * 简单的 HTTP Fetch MCP Server
 * 用于测试 MCP 协议集成
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  {
    name: 'fetch-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 定义可用工具
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'fetch',
        description: 'Fetch content from a URL',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'URL to fetch',
            },
            method: {
              type: 'string',
              description: 'HTTP method',
              enum: ['GET', 'POST', 'PUT', 'DELETE'],
              default: 'GET',
            },
            headers: {
              type: 'object',
              description: 'HTTP headers',
            },
            body: {
              type: 'string',
              description: 'Request body',
            },
          },
          required: ['url'],
        },
      },
    ],
  };
});

// 处理工具调用
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'fetch') {
    const args = request.params.arguments as { url: string; method?: string; headers?: Record<string, string>; body?: string };
    const { url, method = 'GET', headers = {}, body } = args;

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body || undefined,
      });

      const content = await response.text();
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: response.status,
              statusText: response.statusText,
              headers: responseHeaders,
              body: content.slice(0, 10000), // 限制返回大小
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: error instanceof Error ? error.message : String(error),
            }),
          },
        ],
        isError: true,
      };
    }
  }

  throw new Error(`Unknown tool: ${request.params.name}`);
});

// 启动服务器
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('Fetch MCP Server running on stdio');
