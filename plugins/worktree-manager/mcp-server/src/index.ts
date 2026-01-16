#!/usr/bin/env node
/**
 * MCP Server for Git Worktree Management
 * Exposes worktree operations as MCP tools for Claude Code
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

import { WorktreeStartTool } from './tools/worktree-start.js';
import { WorktreeListTool } from './tools/worktree-list.js';
import { WorktreeStatusTool } from './tools/worktree-status.js';
import { WorktreeCleanupTool } from './tools/worktree-cleanup.js';
import { WorktreeMoveTool } from './tools/worktree-move.js';
import { WorktreeLockTool } from './tools/worktree-lock.js';
import { WorktreeUnlockTool } from './tools/worktree-unlock.js';
import { WorktreeRepairTool } from './tools/worktree-repair.js';
import { WorktreePruneTool } from './tools/worktree-prune.js';
import { WorktreeRenameBranchTool } from './tools/worktree-rename-branch.js';
import { WorktreeDeleteBranchTool } from './tools/worktree-delete-branch.js';
import { WorktreeDetectTool } from './tools/worktree-detect.js';
import { WorktreeSetupTool } from './tools/worktree-setup.js';

// Define MCP tools
const TOOLS: Tool[] = [
  {
    name: 'worktree_start',
    description:
      'Create git worktree with auto-setup. Pure worktree operations - creates isolated workspace with automatic project detection and setup (npm install for web, swift build for iOS). For automated workflows, use Chainer plugin.',
    inputSchema: {
      type: 'object',
      properties: {
        feature_name: {
          type: 'string',
          description: 'Name of the feature (becomes feature/<name> branch)',
        },
        base_branch: {
          type: 'string',
          description: 'Branch to branch from (default: main)',
        },
        task_description: {
          type: 'string',
          description: 'Optional context about what you are building',
        },
        worktree_path: {
          type: 'string',
          description: 'Custom worktree path (default: ~/worktrees/<feature-name>)',
        },
        existing_branch: {
          type: 'string',
          description: 'Checkout existing branch instead of creating new one',
        },
      },
      required: ['feature_name'],
    },
  },
  {
    name: 'worktree_list',
    description:
      'List all active git worktrees with optional status information (uncommitted changes, untracked files, ahead/behind remote)',
    inputSchema: {
      type: 'object',
      properties: {
        include_status: {
          type: 'boolean',
          description: 'Include detailed status for each worktree (default: false)',
        },
      },
    },
  },
  {
    name: 'worktree_status',
    description:
      'Get detailed status of a specific worktree including branch name, uncommitted changes, untracked files, and remote tracking status',
    inputSchema: {
      type: 'object',
      properties: {
        worktree_path: {
          type: 'string',
          description: 'Path to the worktree to check',
        },
      },
      required: ['worktree_path'],
    },
  },
  {
    name: 'worktree_cleanup',
    description:
      'Safely merge worktree changes to target branch (default: main) and remove worktree. Optionally auto-merge and delete feature branch. Prevents data loss by checking for uncommitted changes.',
    inputSchema: {
      type: 'object',
      properties: {
        worktree_path: {
          type: 'string',
          description: 'Path to the worktree to clean up',
        },
        auto_merge: {
          type: 'boolean',
          description: 'Automatically merge to target branch before removing (default: false)',
        },
        target_branch: {
          type: 'string',
          description: 'Branch to merge into (default: main)',
        },
        force: {
          type: 'boolean',
          description: 'Force remove even with uncommitted changes (default: false)',
        },
        delete_branch: {
          type: 'boolean',
          description: 'Delete feature branch after merge (default: true)',
        },
      },
      required: ['worktree_path'],
    },
  },
  {
    name: 'worktree_move',
    description:
      'Move worktree to a new filesystem location. Git automatically updates all internal references.',
    inputSchema: {
      type: 'object',
      properties: {
        current_path: {
          type: 'string',
          description: 'Current worktree path',
        },
        new_path: {
          type: 'string',
          description: 'New worktree path',
        },
      },
      required: ['current_path', 'new_path'],
    },
  },
  {
    name: 'worktree_lock',
    description:
      'Lock worktree to prevent accidental removal. Use when you want to protect a worktree from being deleted.',
    inputSchema: {
      type: 'object',
      properties: {
        worktree_path: {
          type: 'string',
          description: 'Path to the worktree to lock',
        },
        reason: {
          type: 'string',
          description: 'Optional reason for locking',
        },
      },
      required: ['worktree_path'],
    },
  },
  {
    name: 'worktree_unlock',
    description:
      'Unlock a locked worktree to allow removal. Use after locking to restore normal worktree operations.',
    inputSchema: {
      type: 'object',
      properties: {
        worktree_path: {
          type: 'string',
          description: 'Path to the worktree to unlock',
        },
      },
      required: ['worktree_path'],
    },
  },
  {
    name: 'worktree_repair',
    description:
      'Repair broken worktree administrative files. Use when worktree was manually moved or parent repository moved.',
    inputSchema: {
      type: 'object',
      properties: {
        worktree_path: {
          type: 'string',
          description: 'Path to the worktree to repair',
        },
      },
      required: ['worktree_path'],
    },
  },
  {
    name: 'worktree_prune',
    description:
      'Prune orphaned worktree administrative references. Cleans up references to worktrees that were manually deleted.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'worktree_rename_branch',
    description:
      'Rename a git branch within a worktree. Updates all git references automatically.',
    inputSchema: {
      type: 'object',
      properties: {
        worktree_path: {
          type: 'string',
          description: 'Worktree path where branch exists',
        },
        old_name: {
          type: 'string',
          description: 'Current branch name',
        },
        new_name: {
          type: 'string',
          description: 'New branch name',
        },
      },
      required: ['worktree_path', 'old_name', 'new_name'],
    },
  },
  {
    name: 'worktree_delete_branch',
    description:
      'Delete a git branch (local and optionally remote) with safety checks. Prevents deletion of unmerged branches unless force is used.',
    inputSchema: {
      type: 'object',
      properties: {
        branch_name: {
          type: 'string',
          description: 'Branch name to delete',
        },
        force: {
          type: 'boolean',
          description: 'Force delete even if not fully merged (default: false)',
        },
        delete_remote: {
          type: 'boolean',
          description: 'Also delete from remote repository (default: false)',
        },
        remote_name: {
          type: 'string',
          description: 'Remote name (default: origin)',
        },
      },
      required: ['branch_name'],
    },
  },
  {
    name: 'worktree_detect_ecosystems',
    description:
      'Detect all project ecosystems in a worktree. Scans for all supported ecosystems (Node.js, Python, Rust, Go, etc.) and returns them for user selection.',
    inputSchema: {
      type: 'object',
      properties: {
        worktree_path: {
          type: 'string',
          description: 'Path to worktree to scan for ecosystems',
        },
      },
      required: ['worktree_path'],
    },
  },
  {
    name: 'worktree_run_setup',
    description:
      'Run setup commands for selected ecosystems. Used after user makes selection via AskUserQuestion.',
    inputSchema: {
      type: 'object',
      properties: {
        worktree_path: {
          type: 'string',
          description: 'Path to worktree',
        },
        ecosystem_names: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'Names of ecosystems to set up (e.g., ["Node.js", "Rust"])',
        },
      },
      required: ['worktree_path', 'ecosystem_names'],
    },
  },
];

// Create MCP server
const server = new Server(
  {
    name: 'worktree-manager',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'worktree_start': {
        const result = await WorktreeStartTool.execute(args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'worktree_list': {
        const result = await WorktreeListTool.execute(args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'worktree_status': {
        const result = await WorktreeStatusTool.execute(args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'worktree_cleanup': {
        const result = await WorktreeCleanupTool.execute(args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'worktree_move': {
        const result = await WorktreeMoveTool.execute(args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'worktree_lock': {
        const result = await WorktreeLockTool.execute(args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'worktree_unlock': {
        const result = await WorktreeUnlockTool.execute(args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'worktree_repair': {
        const result = await WorktreeRepairTool.execute(args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'worktree_prune': {
        const result = await WorktreePruneTool.execute(args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'worktree_rename_branch': {
        const result = await WorktreeRenameBranchTool.execute(args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'worktree_delete_branch': {
        const result = await WorktreeDeleteBranchTool.execute(args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'worktree_detect_ecosystems': {
        const result = await WorktreeDetectTool.execute(args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'worktree_run_setup': {
        const result = await WorktreeSetupTool.execute(args as any);
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
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error: error.message || 'Unknown error',
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Worktree Manager MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
