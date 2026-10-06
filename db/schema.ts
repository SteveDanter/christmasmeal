import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
export const polls = sqliteTable("polls", { id: integer("id").primaryKey(), state: text("state").notNull(), revision: integer("revision").notNull().default(0) });
