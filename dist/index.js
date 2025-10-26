import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import auth from "./auth/routes.js";
import predictionLogsRoute from "./routes/prediction-logs.js";
import nurseReportsRoute from "./routes/nurse-reports.js";
import patientsRoute from "./routes/patients.js";
import { authMiddleware } from "./auth/middleware.js";
import { db } from "./db/connection.js";
import { predictionLogs } from "./db/schema.js";
const app = new Hono();
// Enable CORS
app.use("*", cors());
// Health check endpoint
app.get("/", (c) => {
    return c.json({
        message: "Triage CDSS Proxy API",
        status: "running",
        version: "1.0.0",
    });
});

// Authentication routes
app.route("/auth", auth);
// Prediction logs CRUD routes
app.route("/prediction-logs", predictionLogsRoute);
// Nurse reports routes
app.route("/nurse-reports", nurseReportsRoute);
// Patient management routes
app.route("/patients", patientsRoute);
// Protected predict endpoint with logging
app.post("/predict", authMiddleware, async (context) => {
    try {
        const user = context.get("user");
        console.log(`Prediction request from user: ${user.email}`);
        const body = await context.req.json();
        const result = await fetch("https://6391a2acca71.ngrok-free.app/model1", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });
        const payloadResults = await result.json();
        // Save prediction log to database
        try {
            await db.insert(predictionLogs).values({
                userId: user.id,
                patientNumber: body.patientNumber,
                inputs: payloadResults.inputs,
                predict: payloadResults.Predict,
                ktasExplained: payloadResults.Ktas_Explained, // Note: underscore instead of space
                probs: payloadResults.Probs,
                model: payloadResults.Model,
            });
            console.log(`Prediction log saved for user: ${user.email}`);
        }
        catch (logError) {
            console.error("Error saving prediction log:", logError);
            // Don't fail the request if logging fails
        }
        return context.json({
            status: "Success",
            data: payloadResults,
            user: user.email,
        });
    }
    catch (e) {
        console.error("Prediction error:", e);
        return context.json({
            error: "Something went wrong",
        }, 500);
    }
});
serve({
    fetch: app.fetch,
    port: 3000,
}, (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
});
