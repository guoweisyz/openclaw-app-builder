#!/usr/bin/env node
/**
 * 文件系统 MCP Server
 * 提供安全的文件读写操作
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs/promises';
import * as path from 'path';

const server = new Server(
  {
    name: 'filesystem-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 工作目录（限制在此目录下操作）
const WORK_DIR = process.env.FILESYSTEM_WORK_DIR || './data/files';

// 确保路径在工作目录内
function sanitizePath(inputPath: string): string {
  const resolved = path.resolve(WORK_DIR, inputPath);
  const workDirResolved = path.resolve(WORK_DIR);
  
  if (!resolved.startsWith(workDirResolved)) {
    throw new Error('Path is outside of working directory');
  }
  
  return resolved;
}

// 定义可用工具
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'read_file',
        description: 'Read contents of a file',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Relative path to the file',
            },
          },
          required: ['path'],
        },
      },
      {
        name: 'write_file',
        description: 'Write content to a file',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Relative path to the file',
            },
            content: {
              type: 'string',
              description: 'Content to write',
            },
          },
          required: ['path', 'content'],
        },
      },
      {
        name: 'list_directory',
        description: 'List contents of a directory',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Relative path to the directory',
              default: '.',
            },
          },
          required: [],
        },
      },
      {
        name: 'create_directory',
        description: 'Create a new directory',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Relative path for the new directory',
            },
          },
          required: ['path'],
        },
      },
      {
        name: 'delete_file',
        description: 'Delete a file or directory',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Relative path to delete',
            },
          },
          required: ['path'],
        },
      },
    ],
  };
});

// 处理工具调用
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const args = request.params.arguments as Record<string, string>;
  
  try {
    switch (request.params.name) {
      case 'read_file': {
        const filePath = sanitizePath(args.path || '');
        const content = await fs.readFile(filePath, 'utf-8');
        return {
          content: [
            {
              type: 'text',
              text: content,
            },
          ],
        };
      }

      case 'write_file': {
        const filePath = sanitizePath(args.path || '');
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, args.content || '', 'utf-8');
        return {
          content: [
            {
              type: 'text',
              text: `File written successfully: ${args.path}`,
            },
          ],
        };
      }

      case 'list_directory': {
        const dirPath = sanitizePath(args.path || '.');
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        const result = entries.map(entry => ({
          name: entry.name,
          type: entry.isDirectory() ? 'directory' : 'file',
        }));
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'create_directory': {
        const dirPath = sanitizePath(args.path || '');
        await fs.mkdir(dirPath, { recursive: true });
        return {
          content: [
            {
              type: 'text',
              text: `Directory created successfully: ${args.path}`,
            },
          ],
        };
      }

      case 'delete_file': {
        const deletePath = sanitizePath(args.path || '');
        const stat = await fs.stat(deletePath);
        if (stat.isDirectory()) {
          await fs.rmdir(deletePath, { recursive: true });
        } else {
          await fs.unlink(deletePath);
        }
        return {
          content: [
            {
              type: 'text',
              text: `Deleted successfully: ${args.path}`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// 启动服务器
const transport = new StdioServerTransport();
await server.connect(transport);
console.error('Filesystem MCP Server running on stdio');
