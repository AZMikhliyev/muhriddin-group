const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");
const ExcelJS = require("exceljs");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// =====================
// MIDDLEWARES
// =====================
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// =====================
// MYSQL ULASH
// =====================

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false
  }
});

db.connect((err) => {
  if (err) {
    console.error("❌ MySQL ulanish xatosi:", err.message);
    return;
  }
  console.log("✅ MySQL bazasiga muvaffaqiyatli ulandi!");
});

db.on("error", (err) => {
  console.error("❌ MySQL runtime xatosi:", err.message);
});

// =====================
// TEST
// =====================
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// =====================
// MA'LUMOT QO'SHISH
// =====================
app.post("/api/workers", (req, res) => {
    const { worker, type, owner, pressCount, landArea, payment, date } = req.body;

    const sql = `
        INSERT INTO workers
        (worker, type, owner, pressCount, landArea, payment, date)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(sql, [worker, type, owner, pressCount, landArea, payment, date], (err) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ success: false, error: err.message });
        }
        res.json({ success: true });
    });
});

// =====================
// BARCHA MA'LUMOTLAR
// =====================
app.get("/api/workers", (req, res) => {
    db.query("SELECT * FROM workers ORDER BY id DESC", (err, rows) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ success: false, error: err.message });
        }
        res.json(rows);
    });
});

// =====================
// SEARCH
// =====================
app.get("/api/search", (req, res) => {
    const search = req.query.q || "";
    const sql = `
        SELECT *
        FROM workers
        WHERE
            worker LIKE ?
            OR owner LIKE ?
            OR type LIKE ?
            OR payment LIKE ?
            OR CAST(pressCount AS CHAR) LIKE ?
            OR CAST(landArea AS CHAR) LIKE ?
            OR CAST(date AS CHAR) LIKE ?
        ORDER BY id DESC
    `;
    const value = `%${search}%`;
    db.query(sql, [value, value, value, value, value, value, value], (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ success: false, error: err.message });
        }
        res.json(result);
    });
});

// =====================
// EXCEL YUKLAB OLISH
// =====================
app.get("/api/excel", (req, res) => {
    db.query("SELECT * FROM workers ORDER BY id DESC", async (err, rows) => {
        if (err) {
            return res.status(500).send("Xatolik");
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Workers");
        worksheet.columns = [
            { header: "Sana", key: "date", width: 15 },
            { header: "Ishchi", key: "worker", width: 20 },
            { header: "Ish turi", key: "type", width: 20 },
            { header: "Yer egasi", key: "owner", width: 25 },
            { header: "Press soni", key: "pressCount", width: 15 },
            { header: "Yer maydoni", key: "landArea", width: 15 },
            { header: "To'lov", key: "payment", width: 15 }
        ];

        rows.forEach(item => {
            worksheet.addRow({
                date: new Date(item.date).toLocaleDateString("uz-UZ"),
                worker: item.worker,
                type: item.type,
                owner: item.owner,
                pressCount: item.pressCount ?? "-",
                landArea: item.landArea ?? "-",
                payment: item.payment
            });
        });

        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", "attachment; filename=workers.xlsx");
        await workbook.xlsx.write(res);
        res.end();
    });
});

// =====================
// DELETE
// =====================
app.delete("/api/workers/:id", (req, res) => {
    const id = req.params.id;
    db.query("DELETE FROM workers WHERE id=?", [id], (err) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ success: false, error: err.message });
        }
        res.json({ success: true });
    });
});

// =====================
// UPDATE
// =====================
app.put("/api/workers/:id", (req, res) => {
    const id = req.params.id;
    let { owner, pressCount, landArea, payment } = req.body;

    // Bo'sh qiymatlarni null qilib qo'yamiz
    pressCount = pressCount === "" ? null : pressCount;
    landArea = landArea === "" ? null : landArea;

    db.query(
        `UPDATE workers
         SET owner=?,
             pressCount=?,
             landArea=?,
             payment=?
         WHERE id=?`,
        [owner, pressCount, landArea, payment, id],
        (err) => {
            if (err) {
                console.log(err);
                return res.status(500).json({ success: false, error: err.message });
            }
            res.json({ success: true });
        }
    );
});

// =====================
// LOGIN
// =====================
app.post("/api/login", (req, res) => {
    const { login, password } = req.body;

    if (!login || !password) {
        return res.status(400).json({
            success: false,
            message: "Login va password talab qilinadi"
        });
    }

    db.query(
        "SELECT * FROM users WHERE login=? AND password=?",
        [login, password],
        (err, rows) => {
            if (err) {
                console.error("Login xatosi:", err);
                return res.status(500).json({
                    success: false,
                    message: "Server xatosi: " + err.message
                });
            }

            if (rows.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: "Login yoki password noto'g'ri"
                });
            }

            res.json({
                success: true,
                user: {
                    id: rows[0].id,
                    login: rows[0].login,
                    role: rows[0].role
                }
            });
        }
    );
});

// =====================
// SERVER ISHGA TUSHIRISH
// =====================
app.listen(port, () => {
    console.log(`✅ Server ${port}-portda ishlamoqda`);
});