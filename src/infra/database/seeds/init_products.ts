import { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
    // 1. Clean the tables first (Delete old data)
    await knex("orders").del();
    await knex("products").del();

    // 2. Insert Initial Products
    await knex("products").insert([
        { 
            id: 1, 
            name: "iPhone 15", 
            price: 999.99, 
            stock: 100,
            version: 1 
        }
    ]);
}