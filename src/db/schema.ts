import { pgTable, serial, varchar, timestamp, text, integer, jsonb, real } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const predictionLogs = pgTable('prediction_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  patientNumber: varchar('patient_number', { length: 255 }).notNull(),
  inputs: jsonb('inputs').notNull(),
  predict: integer('predict').notNull(),
  ktasExplained: jsonb('ktas_explained').notNull(),
  probs: jsonb('probs').notNull(),
  model: varchar('model', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type PredictionLog = typeof predictionLogs.$inferSelect;
export type NewPredictionLog = typeof predictionLogs.$inferInsert;
