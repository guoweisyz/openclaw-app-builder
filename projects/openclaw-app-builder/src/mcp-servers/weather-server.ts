#!/usr/bin/env node
/**
 * 天气查询 MCP Server
 * 使用 wttr.in 免费天气 API
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  {
    name: 'weather-server',
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
        name: 'get_weather',
        description: 'Get current weather for a location',
        inputSchema: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'City name or location (e.g., Beijing, Shanghai, New York)',
            },
            format: {
              type: 'string',
              description: 'Output format',
              enum: ['simple', 'detailed'],
              default: 'simple',
            },
          },
          required: ['location'],
        },
      },
    ],
  };
});

// 处理工具调用
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'get_weather') {
    const args = request.params.arguments as { location: string; format?: string };
    const { location, format = 'simple' } = args;

    try {
      // 使用 wttr.in 免费天气 API
      const url = `https://wttr.in/${encodeURIComponent(location)}?format=j1`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const data = await response.json();
      const current = data.current_condition[0];
      
      const result = format === 'simple' ? {
        location: data.nearest_area[0].areaName[0].value,
        country: data.nearest_area[0].country[0].value,
        temperature: `${current.temp_C}°C`,
        condition: current.weatherDesc[0].value,
        humidity: `${current.humidity}%`,
        wind: `${current.windspeedKmph} km/h`,
        feels_like: `${current.FeelsLikeC}°C`,
      } : {
        location: data.nearest_area[0].areaName[0].value,
        country: data.nearest_area[0].country[0].value,
        temperature: {
          celsius: current.temp_C,
          fahrenheit: current.temp_F,
        },
        condition: current.weatherDesc[0].value,
        humidity: `${current.humidity}%`,
        wind: {
          speed: `${current.windspeedKmph} km/h`,
          direction: current.winddir16Point,
        },
        pressure: `${current.pressure} hPa`,
        visibility: `${current.visibility} km`,
        feels_like: {
          celsius: current.FeelsLikeC,
          fahrenheit: current.FeelsLikeF,
        },
        uv_index: current.uvIndex,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
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
console.error('Weather MCP Server running on stdio');
