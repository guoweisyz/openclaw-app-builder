#!/usr/bin/env node
/**
 * JSON 处理 MCP Server
 * 提供 JSON 数据操作工具
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  {
    name: 'json-server',
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
        name: 'parse_json',
        description: 'Parse and validate JSON string',
        inputSchema: {
          type: 'object',
          properties: {
            json: {
              type: 'string',
              description: 'JSON string to parse',
            },
          },
          required: ['json'],
        },
      },
      {
        name: 'stringify_json',
        description: 'Convert object to JSON string',
        inputSchema: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              description: 'Data to stringify',
            },
            pretty: {
              type: 'boolean',
              description: 'Pretty print with indentation',
              default: true,
            },
          },
          required: ['data'],
        },
      },
      {
        name: 'get_value',
        description: 'Get value from JSON by path',
        inputSchema: {
          type: 'object',
          properties: {
            json: {
              type: 'object',
              description: 'JSON object',
            },
            path: {
              type: 'string',
              description: 'Dot-notation path (e.g., "user.name", "items.0.id")',
            },
          },
          required: ['json', 'path'],
        },
      },
      {
        name: 'transform_json',
        description: 'Transform JSON structure',
        inputSchema: {
          type: 'object',
          properties: {
            json: {
              type: 'object',
              description: 'JSON object to transform',
            },
            operation: {
              type: 'string',
              description: 'Transformation operation',
              enum: ['pick', 'omit', 'flatten', 'sort_keys'],
            },
            keys: {
              type: 'array',
              description: 'Keys for pick/omit operations',
              items: { type: 'string' },
            },
          },
          required: ['json', 'operation'],
        },
      },
    ],
  };
});

// 根据路径获取值
function getValueByPath(obj: any, path: string): any {
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    
    // 处理数组索引
    if (/^\d+$/.test(key)) {
      current = current[parseInt(key)];
    } else {
      current = current[key];
    }
  }
  
  return current;
}

// 扁平化对象
function flattenObject(obj: any, prefix = ''): any {
  const result: any = {};
  
  for (const key of Object.keys(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      Object.assign(result, flattenObject(obj[key], newKey));
    } else {
      result[newKey] = obj[key];
    }
  }
  
  return result;
}

// 排序键
function sortKeys(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(sortKeys);
  }
  
  if (typeof obj === 'object' && obj !== null) {
    const sorted: any = {};
    for (const key of Object.keys(obj).sort()) {
      sorted[key] = sortKeys(obj[key]);
    }
    return sorted;
  }
  
  return obj;
}

// 处理工具调用
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const args = request.params.arguments as Record<string, any>;
  
  try {
    switch (request.params.name) {
      case 'parse_json': {
        const jsonStr = args.json || '';
        const parsed = JSON.parse(jsonStr);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                valid: true,
                type: Array.isArray(parsed) ? 'array' : typeof parsed,
                data: parsed,
              }, null, 2),
            },
          ],
        };
      }

      case 'stringify_json': {
        const data = args.data;
        const pretty = args.pretty !== false;
        
        const jsonStr = JSON.stringify(data, null, pretty ? 2 : undefined);
        
        return {
          content: [
            {
              type: 'text',
              text: jsonStr,
            },
          ],
        };
      }

      case 'get_value': {
        const json = args.json;
        const path = args.path || '';
        
        const value = getValueByPath(json, path);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                path,
                found: value !== undefined,
                value,
              }, null, 2),
            },
          ],
        };
      }

      case 'transform_json': {
        const json = args.json;
        const operation = args.operation;
        const keys = args.keys || [];
        
        let result: any;
        
        switch (operation) {
          case 'pick':
            result = {};
            for (const key of keys) {
              if (key in json) {
                result[key] = json[key];
              }
            }
            break;
            
          case 'omit':
            result = {};
            for (const key of Object.keys(json)) {
              if (!keys.includes(key)) {
                result[key] = json[key];
              }
            }
            break;
            
          case 'flatten':
            result = flattenObject(json);
            break;
            
          case 'sort_keys':
            result = sortKeys(json);
            break;
            
          default:
            throw new Error(`Unknown operation: ${operation}`);
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
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
console.error('JSON MCP Server running on stdio');
