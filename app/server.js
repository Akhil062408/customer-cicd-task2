const express = require("express");
const mysql = require("mysql2/promise");

const app = express();

const PORT = Number(process.env.PORT || 8080);

const APP_ENV = process.env.APP_ENV || "UNKNOWN";
const APP_VERSION = process.env.APP_VERSION || "UNKNOWN";

const DB_HOST = process.env.DB_HOST;
const DB_PORT = Number(process.env.DB_PORT || 3306);
const DB_NAME = process.env.DB_NAME || "customerdb";
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;

async function getConnection() {
    return mysql.createConnection({
        host: DB_HOST,
        port: DB_PORT,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME,
        connectTimeout: 3000
    });
}

app.get("/health", async (req, res) => {
    try {
        const db = await getConnection();

        await db.query("SELECT 1");

        await db.end();

        res.status(200).json({
            status: "UP",
            database: "UP",
            environment: APP_ENV,
            version: APP_VERSION
        });

    } catch (error) {

        res.status(500).json({
            status: "DOWN",
            database: "DOWN",
            error: error.code || error.message,
            environment: APP_ENV,
            version: APP_VERSION
        });
    }
});

app.get("/info", (req, res) => {

    res.json({
        application: "customer-app",
        environment: APP_ENV,
        version: APP_VERSION,
        databaseHost: DB_HOST,
        databaseName: DB_NAME
    });

});

app.get("/customers", async (req, res) => {

    try {

        const db = await getConnection();

        const [rows] = await db.query(
            "SELECT id, name, email FROM customers ORDER BY id"
        );

        await db.end();

        res.json(rows);

    } catch (error) {

        res.status(500).json({
            error: error.code || error.message
        });

    }

});

app.get("/customers/search", async (req, res) => {

    const search = req.query.q || "";

    try {

        const db = await getConnection();

        const [rows] = await db.execute(
            "SELECT id, name, email FROM customers WHERE name LIKE ? OR email LIKE ?",
            [`%${search}%`, `%${search}%`]
        );

        await db.end();

        res.json(rows);

    } catch (error) {

        res.status(500).json({
            error: error.code || error.message
        });

    }

});

app.listen(PORT, "0.0.0.0", () => {

    console.log(
        `Customer application running on port ${PORT}`
    );

});