import { Hono } from 'hono';
import { db } from '../db/connection.js';
import { predictionLogs, users } from '../db/schema.js';
import { authMiddleware } from '../auth/middleware.js';
import { eq, desc, and, gte, lte, sql, count, avg, max, min } from 'drizzle-orm';
const nurseReportsRoute = new Hono();
// Get nurse report - can be daily or overall
nurseReportsRoute.get('/:nurseId', authMiddleware, async (c) => {
    try {
        const nurseId = parseInt(c.req.param('nurseId'));
        const date = c.req.query('date'); // Format: YYYY-MM-DD
        const nurseName = c.req.query('name');
        if (isNaN(nurseId)) {
            return c.json({ error: 'Invalid nurse ID' }, 400);
        }
        // Verify nurse exists
        const nurse = await db
            .select({
            id: users.id,
            name: users.name,
            email: users.email,
        })
            .from(users)
            .where(eq(users.id, nurseId))
            .limit(1);
        if (nurse.length === 0) {
            return c.json({ error: 'Nurse not found' }, 404);
        }
        // Optional name verification
        if (nurseName && nurse[0].name.toLowerCase() !== nurseName.toLowerCase()) {
            return c.json({ error: 'Nurse name does not match ID' }, 400);
        }
        const nurseData = nurse[0];
        // Build date filters
        let dateFilter = eq(predictionLogs.userId, nurseId);
        let periodType = 'overall';
        let periodInfo = {};
        if (date) {
            const startDate = new Date(date);
            const endDate = new Date(date);
            endDate.setDate(endDate.getDate() + 1);
            dateFilter = and(eq(predictionLogs.userId, nurseId), gte(predictionLogs.createdAt, startDate), lte(predictionLogs.createdAt, endDate));
            periodType = 'daily';
            periodInfo = {
                type: 'daily',
                date: date,
                from: startDate.toISOString(),
                to: endDate.toISOString()
            };
        }
        else {
            periodInfo = {
                type: 'overall',
                from: 'all_time',
                to: 'present'
            };
        }
        // Get basic statistics
        const basicStats = await db
            .select({
            totalPatients: count(predictionLogs.id),
            avgPrediction: avg(predictionLogs.predict),
            maxPrediction: max(predictionLogs.predict),
            minPrediction: min(predictionLogs.predict),
        })
            .from(predictionLogs)
            .where(dateFilter);
        // Get prediction level distribution
        const levelDistribution = await db
            .select({
            level: predictionLogs.predict,
            count: count(predictionLogs.id),
        })
            .from(predictionLogs)
            .where(dateFilter)
            .groupBy(predictionLogs.predict);
        // Get gender distribution
        const genderStats = await db
            .select({
            gender: sql `CAST((${predictionLogs.inputs}->>'Sex') AS INTEGER)`,
            count: count(predictionLogs.id),
        })
            .from(predictionLogs)
            .where(dateFilter)
            .groupBy(sql `CAST((${predictionLogs.inputs}->>'Sex') AS INTEGER)`);
        // Get age distribution
        const ageStats = await db
            .select({
            age: sql `CAST((${predictionLogs.inputs}->>'Age') AS INTEGER)`,
            count: count(predictionLogs.id),
        })
            .from(predictionLogs)
            .where(dateFilter)
            .groupBy(sql `CAST((${predictionLogs.inputs}->>'Age') AS INTEGER)`);
        // Get arrival mode distribution
        const arrivalModeStats = await db
            .select({
            mode: sql `CAST((${predictionLogs.inputs}->>'Arrival_mode') AS INTEGER)`,
            count: count(predictionLogs.id),
        })
            .from(predictionLogs)
            .where(dateFilter)
            .groupBy(sql `CAST((${predictionLogs.inputs}->>'Arrival_mode') AS INTEGER)`);
        // Get chief complaints
        const chiefComplaintStats = await db
            .select({
            complaint: sql `${predictionLogs.inputs}->>'Chief_complain'`,
            count: count(predictionLogs.id),
        })
            .from(predictionLogs)
            .where(dateFilter)
            .groupBy(sql `${predictionLogs.inputs}->>'Chief_complain'`)
            .orderBy(desc(count(predictionLogs.id)))
            .limit(10);
        // Get pain level distribution
        const painStats = await db
            .select({
            painLevel: sql `CAST((${predictionLogs.inputs}->>'Pain') AS INTEGER)`,
            count: count(predictionLogs.id),
        })
            .from(predictionLogs)
            .where(dateFilter)
            .groupBy(sql `CAST((${predictionLogs.inputs}->>'Pain') AS INTEGER)`);
        // Get vital signs ranges
        const vitalSignsStats = await db
            .select({
            sbp: sql `CAST((${predictionLogs.inputs}->>'SBP') AS INTEGER)`,
            dbp: sql `CAST((${predictionLogs.inputs}->>'DBP') AS INTEGER)`,
            hr: sql `CAST((${predictionLogs.inputs}->>'HR') AS INTEGER)`,
            rr: sql `CAST((${predictionLogs.inputs}->>'RR') AS INTEGER)`,
            bt: sql `CAST((${predictionLogs.inputs}->>'BT') AS REAL)`,
        })
            .from(predictionLogs)
            .where(dateFilter);
        // Get hourly distribution
        const hourlyStats = await db
            .select({
            hour: sql `EXTRACT(HOUR FROM ${predictionLogs.createdAt})`,
            count: count(predictionLogs.id),
        })
            .from(predictionLogs)
            .where(dateFilter)
            .groupBy(sql `EXTRACT(HOUR FROM ${predictionLogs.createdAt})`);
        // Get prediction confidence distribution
        const confidenceStats = await db
            .select({
            probs: predictionLogs.probs,
        })
            .from(predictionLogs)
            .where(dateFilter);
        // Process the data
        const totalPatients = Number(basicStats[0]?.totalPatients || 0);
        const avgPrediction = Number(basicStats[0]?.avgPrediction || 0);
        // Level distribution
        const levelDist = {};
        levelDistribution.forEach(stat => {
            levelDist[stat.level] = Number(stat.count);
        });
        // Find most common level
        const mostCommonLevel = Object.entries(levelDist).reduce((a, b) => levelDist[Number(a[0])] > levelDist[Number(b[0])] ? a : b)[0];
        // Calculate criticality levels
        const criticalPatients = (levelDist[1] || 0) + (levelDist[2] || 0);
        const moderatePatients = levelDist[3] || 0;
        const lowUrgencyPatients = (levelDist[4] || 0) + (levelDist[5] || 0);
        // Gender distribution
        const maleCount = Number(genderStats.find(stat => stat.gender === 1)?.count || 0);
        const femaleCount = Number(genderStats.find(stat => stat.gender === 2)?.count || 0);
        // Age groups
        let pediatric = 0, adult = 0, elderly = 0;
        ageStats.forEach(stat => {
            const age = Number(stat.age);
            if (age <= 17)
                pediatric += Number(stat.count);
            else if (age <= 64)
                adult += Number(stat.count);
            else
                elderly += Number(stat.count);
        });
        // Arrival mode distribution
        const arrivalModeDist = {};
        arrivalModeStats.forEach(stat => {
            arrivalModeDist[stat.mode] = Number(stat.count);
        });
        // Top chief complaints
        const topChiefComplaints = chiefComplaintStats.map(stat => ({
            complaint: stat.complaint,
            count: Number(stat.count)
        }));
        // Pain level distribution
        const painDist = {};
        painStats.forEach(stat => {
            painDist[stat.painLevel] = Number(stat.count);
        });
        // Vital signs analysis
        const validVitals = vitalSignsStats.filter(v => v.sbp && v.dbp && v.hr && v.rr && v.bt);
        const sbpValues = validVitals.map(v => Number(v.sbp)).filter(v => !isNaN(v));
        const dbpValues = validVitals.map(v => Number(v.dbp)).filter(v => !isNaN(v));
        const hrValues = validVitals.map(v => Number(v.hr)).filter(v => !isNaN(v));
        const rrValues = validVitals.map(v => Number(v.rr)).filter(v => !isNaN(v));
        const btValues = validVitals.map(v => Number(v.bt)).filter(v => !isNaN(v));
        // Risk factors
        const highBP = sbpValues.filter(v => v > 140).length;
        const highHR = hrValues.filter(v => v > 100).length;
        const highTemp = btValues.filter(v => v > 37.5).length;
        const highPain = Object.entries(painDist).reduce((sum, [level, count]) => sum + (Number(level) >= 7 ? Number(count) : 0), 0);
        // Hourly distribution
        const hourlyDist = {};
        hourlyStats.forEach(stat => {
            hourlyDist[stat.hour] = Number(stat.count);
        });
        // Find busiest and least busy hours
        const busiestHour = Object.entries(hourlyDist).reduce((a, b) => hourlyDist[Number(a[0])] > hourlyDist[Number(b[0])] ? a : b)[0];
        const leastBusyHour = Object.entries(hourlyDist).reduce((a, b) => hourlyDist[Number(a[0])] < hourlyDist[Number(b[0])] ? a : b)[0];
        // Prediction confidence analysis
        let highConfidence = 0, mediumConfidence = 0, lowConfidence = 0;
        confidenceStats.forEach(stat => {
            const probs = stat.probs;
            const maxProb = Math.max(...probs.map(p => parseFloat(p)));
            if (maxProb > 0.8)
                highConfidence++;
            else if (maxProb >= 0.5)
                mediumConfidence++;
            else
                lowConfidence++;
        });
        // Calculate average prediction time (simplified - time span of predictions)
        const timeSpan = await db
            .select({
            first: min(predictionLogs.createdAt),
            last: max(predictionLogs.createdAt),
        })
            .from(predictionLogs)
            .where(dateFilter);
        const firstTime = timeSpan[0]?.first;
        const lastTime = timeSpan[0]?.last;
        const avgPredictionTime = firstTime && lastTime ?
            Math.round((lastTime.getTime() - firstTime.getTime()) / (1000 * 60)) : 0; // in minutes
        // Build the report
        const report = {
            nurse: nurseData,
            period: periodInfo,
            summary: {
                totalPatients,
                averagePredictionLevel: Math.round(avgPrediction * 100) / 100,
                mostCommonLevel: Number(mostCommonLevel),
                levelDistribution: levelDist,
                criticalPatients,
                moderatePatients,
                lowUrgencyPatients,
            },
            demographics: {
                genderDistribution: {
                    male: maleCount,
                    female: femaleCount,
                },
                ageGroups: {
                    pediatric,
                    adult,
                    elderly,
                },
                arrivalModeDistribution: arrivalModeDist,
            },
            performance: {
                averagePredictionTime: `${avgPredictionTime} minutes`,
                predictionAccuracy: totalPatients > 0 ? Math.round((highConfidence / totalPatients) * 100) : 0,
                busiestHour: Number(busiestHour),
                leastBusyHour: Number(leastBusyHour),
            },
            insights: {
                topChiefComplaints,
                painLevelDistribution: painDist,
                vitalSignsRanges: {
                    bloodPressure: {
                        min: sbpValues.length > 0 ? Math.min(...sbpValues) : 0,
                        max: sbpValues.length > 0 ? Math.max(...sbpValues) : 0,
                        avg: sbpValues.length > 0 ? Math.round(sbpValues.reduce((a, b) => a + b, 0) / sbpValues.length) : 0,
                    },
                    heartRate: {
                        min: hrValues.length > 0 ? Math.min(...hrValues) : 0,
                        max: hrValues.length > 0 ? Math.max(...hrValues) : 0,
                        avg: hrValues.length > 0 ? Math.round(hrValues.reduce((a, b) => a + b, 0) / hrValues.length) : 0,
                    },
                    respiratoryRate: {
                        min: rrValues.length > 0 ? Math.min(...rrValues) : 0,
                        max: rrValues.length > 0 ? Math.max(...rrValues) : 0,
                        avg: rrValues.length > 0 ? Math.round(rrValues.reduce((a, b) => a + b, 0) / rrValues.length) : 0,
                    },
                    bodyTemperature: {
                        min: btValues.length > 0 ? Math.min(...btValues) : 0,
                        max: btValues.length > 0 ? Math.max(...btValues) : 0,
                        avg: btValues.length > 0 ? Math.round((btValues.reduce((a, b) => a + b, 0) / btValues.length) * 100) / 100 : 0,
                    },
                },
                riskFactors: {
                    highBloodPressure: highBP,
                    highHeartRate: highHR,
                    highTemperature: highTemp,
                    highPainScore: highPain,
                },
            },
            trends: {
                hourlyDistribution: hourlyDist,
                predictionConfidence: {
                    high: highConfidence,
                    medium: mediumConfidence,
                    low: lowConfidence,
                },
            },
        };
        return c.json({ report });
    }
    catch (error) {
        console.error('Error generating nurse report:', error);
        return c.json({ error: 'Failed to generate nurse report' }, 500);
    }
});
// Get all nurses with their basic stats
nurseReportsRoute.get('/nurses/list', authMiddleware, async (c) => {
    try {
        const nurses = await db
            .select({
            id: users.id,
            name: users.name,
            email: users.email,
            totalPatients: count(predictionLogs.id),
            lastActivity: max(predictionLogs.createdAt),
        })
            .from(users)
            .leftJoin(predictionLogs, eq(users.id, predictionLogs.userId))
            .groupBy(users.id, users.name, users.email)
            .orderBy(desc(count(predictionLogs.id)));
        return c.json({ nurses });
    }
    catch (error) {
        console.error('Error fetching nurses list:', error);
        return c.json({ error: 'Failed to fetch nurses list' }, 500);
    }
});
// Get comparative report between nurses
nurseReportsRoute.get('/compare/:nurseId1/:nurseId2', authMiddleware, async (c) => {
    try {
        const nurseId1 = parseInt(c.req.param('nurseId1'));
        const nurseId2 = parseInt(c.req.param('nurseId2'));
        const date = c.req.query('date');
        if (isNaN(nurseId1) || isNaN(nurseId2)) {
            return c.json({ error: 'Invalid nurse IDs' }, 400);
        }
        // Get reports for both nurses
        const [report1, report2] = await Promise.all([
            fetch(`${c.req.url.split('/compare')[0]}/${nurseId1}${date ? `?date=${date}` : ''}`),
            fetch(`${c.req.url.split('/compare')[0]}/${nurseId2}${date ? `?date=${date}` : ''}`)
        ]);
        const data1 = await report1.json();
        const data2 = await report2.json();
        if (data1.error || data2.error) {
            return c.json({ error: 'Failed to fetch one or both nurse reports' }, 400);
        }
        return c.json({
            comparison: {
                nurse1: data1.report,
                nurse2: data2.report,
                summary: {
                    totalPatientsDiff: data1.report.summary.totalPatients - data2.report.summary.totalPatients,
                    avgLevelDiff: data1.report.summary.averagePredictionLevel - data2.report.summary.averagePredictionLevel,
                    criticalPatientsDiff: data1.report.summary.criticalPatients - data2.report.summary.criticalPatients,
                }
            }
        });
    }
    catch (error) {
        console.error('Error generating comparison report:', error);
        return c.json({ error: 'Failed to generate comparison report' }, 500);
    }
});
export default nurseReportsRoute;
