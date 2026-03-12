import { z } from 'zod';
import { insertTeamSchema, insertEvaluationSchema, teams, evaluations } from '@/db/schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  teams: {
    list: {
      method: 'GET' as const,
      path: '/api/teams' as const,
      responses: {
        200: z.array(z.custom<typeof teams.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/teams/:id' as const,
      responses: {
        200: z.custom<typeof teams.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/teams' as const,
      input: insertTeamSchema,
      responses: {
        201: z.custom<typeof teams.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  evaluations: {
    list: {
      method: 'GET' as const,
      path: '/api/evaluations' as const,
      responses: {
        200: z.array(z.custom<typeof evaluations.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/evaluations' as const,
      input: insertEvaluationSchema,
      responses: {
        201: z.custom<typeof evaluations.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/judge/login' as const,
      input: z.object({
        username: z.string(),
        password: z.string(),
      }),
      responses: {
        200: z.object({
          judge: z.object({
            id: z.string(),
            name: z.string(),
            email: z.string(),
            role: z.string(),
            assignedLabId: z.string().optional(),
            assignedDomains: z.array(z.string()).optional(),
          }),
          token: z.string().optional(),
        }),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/judge/logout' as const,
      responses: {
        200: z.object({ message: z.string() }),
      }
    }
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
