import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // 1. Create Products Table
  await knex.schema.createTable("products", (table) => {
    table.increments("id").primary(); // Unique ID (1, 2, 3...)
    table.string("name").notNullable();
    table.decimal("price", 10, 2).notNullable();
    table.integer("stock").notNullable(); // The inventory count
    
    // Optimistic Locking
    // We increment this 'version' every time we update stock.
    // If version changes while we are processing, the transaction fails.
    table.integer("version").defaultTo(1); 
  });

  // 2. Create Orders Table
  await knex.schema.createTable("orders", (table) => {
    table.uuid("id").primary().defaultTo(knex.fn.uuid()); // Hard to guess IDs
    table.string("user_id").notNullable();
    table.integer("product_id").references("id").inTable("products"); // Link to Product
    table.string("status").defaultTo("PENDING"); // PENDING -> PROCESSED -> FAILED
    table.timestamp("created_at").defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("orders");
  await knex.schema.dropTableIfExists("products");
}