#!/usr/bin/env node
/**
 * 时间/日期 MCP Server
 * 提供时间相关工具
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  {
    name: 'time-server',
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
        name: 'get_current_time',
        description: 'Get current time in specified timezone',
        inputSchema: {
          type: 'object',
          properties: {
            timezone: {
              type: 'string',
              description: 'Timezone (e.g., Asia/Shanghai, UTC, America/New_York)',
              default: 'Asia/Shanghai',
            },
            format: {
              type: 'string',
              description: 'Output format',
              enum: ['iso', 'locale', 'timestamp'],
              default: 'locale',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_date_info',
        description: 'Get detailed date information',
        inputSchema: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              description: 'Date string (YYYY-MM-DD) or "today"',
              default: 'today',
            },
            timezone: {
              type: 'string',
              description: 'Timezone',
              default: 'Asia/Shanghai',
            },
          },
          required: [],
        },
      },
      {
        name: 'format_duration',
        description: 'Format milliseconds to human readable duration',
        inputSchema: {
          type: 'object',
          properties: {
            milliseconds: {
              type: 'number',
              description: 'Duration in milliseconds',
            },
            format: {
              type: 'string',
              description: 'Output format',
              enum: ['short', 'long', 'digital'],
              default: 'long',
            },
          },
          required: ['milliseconds'],
        },
      },
    ],
  };
});

// 处理工具调用
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const args = request.params.arguments as Record<string, any>;
  
  try {
    switch (request.params.name) {
      case 'get_current_time': {
        const timezone = args.timezone || 'Asia/Shanghai';
        const format = args.format || 'locale';
        
        const now = new Date();
        let result: any;
        
        switch (format) {
          case 'iso':
            result = { time: now.toISOString(), timezone };
            break;
          case 'timestamp':
            result = { timestamp: now.getTime(), timezone };
            break;
          case 'locale':
          default:
            result = {
              time: now.toLocaleString('zh-CN', { timeZone: timezone }),
              date: now.toLocaleDateString('zh-CN', { timeZone: timezone }),
              timeOnly: now.toLocaleTimeString('zh-CN', { timeZone: timezone }),
              timezone,
              dayOfWeek: now.toLocaleDateString('zh-CN', { timeZone: timezone, weekday: 'long' }),
            };
            break;
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

      case 'get_date_info': {
        const dateStr = args.date || 'today';
        const timezone = args.timezone || 'Asia/Shanghai';
        
        const date = dateStr === 'today' ? new Date() : new Date(dateStr);
        
        const result = {
          date: date.toLocaleDateString('zh-CN', { timeZone: timezone }),
          year: date.getFullYear(),
          month: date.getMonth() + 1,
          day: date.getDate(),
          dayOfWeek: date.toLocaleDateString('zh-CN', { timeZone: timezone, weekday: 'long' }),
          dayOfYear: Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)),
          weekOfYear: Math.ceil(((date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / (1000 * 60 * 60 * 24) + new Date(date.getFullYear(), 0, 1).getDay()) / 7),
          isWeekend: date.getDay() === 0 || date.getDay() === 6,
          isLeapYear: (date.getFullYear() % 4 === 0 && date.getFullYear() % 100 !== 0) || (date.getFullYear() % 400 === 0),
        };
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'format_duration': {
        const ms = args.milliseconds || 0;
        const format = args.format || 'long';
        
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        let result: string;
        
        switch (format) {
          case 'short':
            result = days > 0 ? `${days}d ${hours % 24}h` :
                     hours > 0 ? `${hours}h ${minutes % 60}m` :
                     minutes > 0 ? `${minutes}m ${seconds % 60}s` :
                     `${seconds}s`;
            break;
          case 'digital':
            result = `${String(hours).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
            break;
          case 'long':
          default:
            const parts: string[] = [];
            if (days > 0) parts.push(`${days}天`);
            if (hours % 24 > 0) parts.push(`${hours % 24}小时`);
            if (minutes % 60 > 0) parts.push(`${minutes % 60}分钟`);
            if (seconds % 60 > 0 || parts.length === 0) parts.push(`${seconds % 60}秒`);
            result = parts.join('');
            break;
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ duration: result, milliseconds: ms }, null, 2),
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
console.error('Time MCP Server running on stdio');
