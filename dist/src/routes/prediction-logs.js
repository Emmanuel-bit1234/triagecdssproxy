import { Hono } from 'hono';
import { db } from '../db/connection.js';
import { predictionLogs, users } from '../db/schema.js';
import { authMiddleware } from '../auth/middleware.js';
import { eq, desc, and } from 'drizzle-orm';
const predictionLogsRoute = new Hono();
// Get all prediction logs for the authenticated user
predictionLogsRoute.get('/', authMiddleware, async (c) => {
    try {
        const user = c.get('user');
        const page = parseInt(c.req.query('page') || '1');
        const limit = parseInt(c.req.query('limit') || '10');
        const offset = (page - 1) * limit;
        const logs = await db
            .select({
            id: predictionLogs.id,
            userId: predictionLogs.userId,
            patientNumber: predictionLogs.patientNumber,
            inputs: predictionLogs.inputs,
            predict: predictionLogs.predict,
            ktasExplained: predictionLogs.ktasExplained,
            probs: predictionLogs.probs,
            model: predictionLogs.model,
            createdAt: predictionLogs.createdAt,
            user: {
                id: users.id,
                email: users.email,
                name: users.name,
            },
        })
            .from(predictionLogs)
            .innerJoin(users, eq(predictionLogs.userId, users.id))
            .where(eq(predictionLogs.userId, user.id))
            .orderBy(desc(predictionLogs.createdAt))
            .limit(limit)
            .offset(offset);
        const totalCount = await db
            .select({ count: predictionLogs.id })
            .from(predictionLogs)
            .where(eq(predictionLogs.userId, user.id));
        return c.json({
            logs,
            pagination: {
                page,
                limit,
                total: totalCount.length,
                totalPages: Math.ceil(totalCount.length / limit),
            },
        });
    }
    catch (error) {
        console.error('Error fetching prediction logs:', error);
        return c.json({ error: 'Failed to fetch prediction logs' }, 500);
    }
});
// Get a specific prediction log by ID
predictionLogsRoute.get('/:id', authMiddleware, async (c) => {
    try {
        const user = c.get('user');
        const logId = parseInt(c.req.param('id'));
        if (isNaN(logId)) {
            return c.json({ error: 'Invalid log ID' }, 400);
        }
        const log = await db
            .select({
            id: predictionLogs.id,
            userId: predictionLogs.userId,
            patientNumber: predictionLogs.patientNumber,
            inputs: predictionLogs.inputs,
            predict: predictionLogs.predict,
            ktasExplained: predictionLogs.ktasExplained,
            probs: predictionLogs.probs,
            model: predictionLogs.model,
            createdAt: predictionLogs.createdAt,
            user: {
                id: users.id,
                email: users.email,
                name: users.name,
            },
        })
            .from(predictionLogs)
            .innerJoin(users, eq(predictionLogs.userId, users.id))
            .where(and(eq(predictionLogs.id, logId), eq(predictionLogs.userId, user.id)))
            .limit(1);
        if (log.length === 0) {
            return c.json({ error: 'Prediction log not found' }, 404);
        }
        return c.json({ log: log[0] });
    }
    catch (error) {
        console.error('Error fetching prediction log:', error);
        return c.json({ error: 'Failed to fetch prediction log' }, 500);
    }
});
// Create a new prediction log
predictionLogsRoute.post('/', authMiddleware, async (c) => {
    try {
        const user = c.get('user');
        const body = await c.req.json();
        // Validate required fields
        if (!body.patientNumber || !body.inputs || !body.predict || !body.ktasExplained || !body.probs || !body.model) {
            return c.json({ error: 'Missing required fields' }, 400);
        }
        const newLog = await db
            .insert(predictionLogs)
            .values({
            userId: user.id,
            patientNumber: body.patientNumber,
            inputs: body.inputs,
            predict: body.predict,
            ktasExplained: body.ktasExplained,
            probs: body.probs,
            model: body.model,
        })
            .returning();
        return c.json({ log: newLog[0] }, 201);
    }
    catch (error) {
        console.error('Error creating prediction log:', error);
        return c.json({ error: 'Failed to create prediction log' }, 500);
    }
});
// Update a prediction log (if needed)
predictionLogsRoute.put('/:id', authMiddleware, async (c) => {
    try {
        const user = c.get('user');
        const logId = parseInt(c.req.param('id'));
        const body = await c.req.json();
        if (isNaN(logId)) {
            return c.json({ error: 'Invalid log ID' }, 400);
        }
        // Check if log exists and belongs to user
        const existingLog = await db
            .select()
            .from(predictionLogs)
            .where(and(eq(predictionLogs.id, logId), eq(predictionLogs.userId, user.id)))
            .limit(1);
        if (existingLog.length === 0) {
            return c.json({ error: 'Prediction log not found' }, 404);
        }
        const updatedLog = await db
            .update(predictionLogs)
            .set({
            patientNumber: body.patientNumber || existingLog[0].patientNumber,
            inputs: body.inputs || existingLog[0].inputs,
            predict: body.predict || existingLog[0].predict,
            ktasExplained: body.ktasExplained || existingLog[0].ktasExplained,
            probs: body.probs || existingLog[0].probs,
            model: body.model || existingLog[0].model,
        })
            .where(and(eq(predictionLogs.id, logId), eq(predictionLogs.userId, user.id)))
            .returning();
        return c.json({ log: updatedLog[0] });
    }
    catch (error) {
        console.error('Error updating prediction log:', error);
        return c.json({ error: 'Failed to update prediction log' }, 500);
    }
});
// Delete a prediction log
predictionLogsRoute.delete('/:id', authMiddleware, async (c) => {
    try {
        const user = c.get('user');
        const logId = parseInt(c.req.param('id'));
        if (isNaN(logId)) {
            return c.json({ error: 'Invalid log ID' }, 400);
        }
        const deletedLog = await db
            .delete(predictionLogs)
            .where(and(eq(predictionLogs.id, logId), eq(predictionLogs.userId, user.id)))
            .returning();
        if (deletedLog.length === 0) {
            return c.json({ error: 'Prediction log not found' }, 404);
        }
        return c.json({ message: 'Prediction log deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting prediction log:', error);
        return c.json({ error: 'Failed to delete prediction log' }, 500);
    }
});
// Get prediction statistics for the user
predictionLogsRoute.get('/stats/summary', authMiddleware, async (c) => {
    try {
        const user = c.get('user');
        const stats = await db
            .select({
            totalPredictions: predictionLogs.id,
            avgPrediction: predictionLogs.predict,
            mostCommonLevel: predictionLogs.predict,
        })
            .from(predictionLogs)
            .where(eq(predictionLogs.userId, user.id));
        // Get prediction level distribution
        const levelDistribution = await db
            .select({
            level: predictionLogs.predict,
            count: predictionLogs.id,
        })
            .from(predictionLogs)
            .where(eq(predictionLogs.userId, user.id));
        return c.json({
            totalPredictions: stats.length,
            levelDistribution: levelDistribution.reduce((acc, item) => {
                acc[item.level] = (acc[item.level] || 0) + 1;
                return acc;
            }, {}),
        });
    }
    catch (error) {
        console.error('Error fetching prediction stats:', error);
        return c.json({ error: 'Failed to fetch prediction statistics' }, 500);
    }
});
export default predictionLogsRoute;
