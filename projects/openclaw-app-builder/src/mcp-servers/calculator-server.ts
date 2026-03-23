#!/usr/bin/env node
/**
 * 计算器/数学 MCP Server
 * 提供数学计算工具
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  {
    name: 'calculator-server',
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
        name: 'calculate',
        description: 'Perform mathematical calculations',
        inputSchema: {
          type: 'object',
          properties: {
            expression: {
              type: 'string',
              description: 'Mathematical expression (e.g., "2 + 2", "sqrt(16)", "10 * 5")',
            },
          },
          required: ['expression'],
        },
      },
      {
        name: 'convert_units',
        description: 'Convert between different units',
        inputSchema: {
          type: 'object',
          properties: {
            value: {
              type: 'number',
              description: 'Value to convert',
            },
            from: {
              type: 'string',
              description: 'Source unit (e.g., km, kg, celsius)',
            },
            to: {
              type: 'string',
              description: 'Target unit (e.g., miles, lbs, fahrenheit)',
            },
          },
          required: ['value', 'from', 'to'],
        },
      },
      {
        name: 'generate_random',
        description: 'Generate random numbers',
        inputSchema: {
          type: 'object',
          properties: {
            min: {
              type: 'number',
              description: 'Minimum value (inclusive)',
              default: 0,
            },
            max: {
              type: 'number',
              description: 'Maximum value (inclusive)',
              default: 100,
            },
            count: {
              type: 'number',
              description: 'Number of random values to generate',
              default: 1,
            },
          },
          required: [],
        },
      },
    ],
  };
});

// 安全的数学计算
function safeCalculate(expression: string): number {
  // 只允许安全的数学表达式
  const sanitized = expression
    .replace(/[^0-9+\-*/().\s\^sqrtabsroundfloorceilminmax]/gi, '')
    .replace(/\^/g, '**');
  
  // 使用 Function 构造器在受限环境中执行
  const mathFunctions = {
    sqrt: Math.sqrt,
    abs: Math.abs,
    round: Math.round,
    floor: Math.floor,
    ceil: Math.ceil,
    min: Math.min,
    max: Math.max,
    pow: Math.pow,
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    log: Math.log,
    exp: Math.exp,
    PI: Math.PI,
    E: Math.E,
  };
  
  const func = new Function(...Object.keys(mathFunctions), `return ${sanitized}`);
  return func(...Object.values(mathFunctions));
}

// 单位转换
type ConversionValue = number | ((v: number) => number);

function convertUnits(value: number, from: string, to: string): number | null {
  const conversions: Record<string, Record<string, ConversionValue>> = {
    // 长度
    km: { m: 1000, miles: 0.621371, feet: 3280.84 },
    m: { km: 0.001, cm: 100, mm: 1000, feet: 3.28084, inches: 39.3701 },
    cm: { m: 0.01, mm: 10, inches: 0.393701 },
    mm: { m: 0.001, cm: 0.1 },
    miles: { km: 1.60934, m: 1609.34, feet: 5280 },
    feet: { m: 0.3048, inches: 12, miles: 0.000189394 },
    inches: { cm: 2.54, m: 0.0254, feet: 0.0833333 },
    
    // 重量
    kg: { g: 1000, lbs: 2.20462, oz: 35.274 },
    g: { kg: 0.001, mg: 1000 },
    mg: { g: 0.001, kg: 0.000001 },
    lbs: { kg: 0.453592, oz: 16, g: 453.592 },
    oz: { g: 28.3495, lbs: 0.0625 },
    
    // 温度
    celsius: { fahrenheit: (v: number) => (v * 9/5) + 32, kelvin: (v: number) => v + 273.15 },
    fahrenheit: { celsius: (v: number) => (v - 32) * 5/9, kelvin: (v: number) => (v - 32) * 5/9 + 273.15 },
    kelvin: { celsius: (v: number) => v - 273.15, fahrenheit: (v: number) => (v - 273.15) * 9/5 + 32 },
    
    // 体积
    l: { ml: 1000, gallon: 0.264172, quart: 1.05669 },
    ml: { l: 0.001 },
    gallon: { l: 3.78541, quart: 4 },
    quart: { l: 0.946353, gallon: 0.25 },
  };
  
  const fromLower = from.toLowerCase();
  const toLower = to.toLowerCase();
  
  if (fromLower === toLower) return value;
  
  const conversion = conversions[fromLower]?.[toLower];
  if (conversion === undefined) return null;

  if (typeof conversion === 'function') {
    return conversion(value);
  }

  return value * conversion;
}

// 处理工具调用
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const args = request.params.arguments as Record<string, any>;
  
  try {
    switch (request.params.name) {
      case 'calculate': {
        const expression = args.expression || '';
        const result = safeCalculate(expression);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                expression,
                result,
                formatted: Number.isInteger(result) ? result.toString() : result.toFixed(6).replace(/\.?0+$/, ''),
              }, null, 2),
            },
          ],
        };
      }

      case 'convert_units': {
        const value = args.value || 0;
        const from = args.from || '';
        const to = args.to || '';
        
        const result = convertUnits(value, from, to);
        
        if (result === null) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: `Cannot convert from ${from} to ${to}` }),
              },
            ],
            isError: true,
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                value,
                from,
                to,
                result,
                formatted: Number.isInteger(result) ? result.toString() : result.toFixed(6).replace(/\.?0+$/, ''),
              }, null, 2),
            },
          ],
        };
      }

      case 'generate_random': {
        const min = args.min || 0;
        const max = args.max || 100;
        const count = Math.min(args.count || 1, 100); // 限制最大数量
        
        const results: number[] = [];
        for (let i = 0; i < count; i++) {
          results.push(Math.floor(Math.random() * (max - min + 1)) + min);
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                min,
                max,
                count,
                results: count === 1 ? results[0] : results,
              }, null, 2),
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
console.error('Calculator MCP Server running on stdio');
