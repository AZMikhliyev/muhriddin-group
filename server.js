const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const path = require("path");
const ExcelJS = require("exceljs");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 8080;

// =====================
// MIDDLEWARES
// =====================
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// =====================
// POSTGRESQL ULASH
// =====================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

pool.connect((err, client, release) => {
  if (err) {
    console.error("❌ PostgreSQL ulanish xatosi:", err.message);
    return;
  }
  console.log("✅ PostgreSQL bazasiga muvaffaqiyatli ulandi!");
  release();
});

// =====================
// TEST
// =====================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// =====================
// MA'LUMOT QO'SHISH (INSERT)
// =====================
app.post("/api/workers", async (req, res) => {
  const {
    worker,
    type,
    owner,
    pressCount,
    landArea,
    payment,
    price,
    date,
    clientPhone,
    comment,
  } = req.body;

  const sql = `
    INSERT INTO workers
    (worker, type, owner, client_phone, comment, press_count, land_area, payment, price, date, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
    RETURNING *
  `;

  try {
    const result = await pool.query(sql, [
      worker,
      type,
      owner,
      clientPhone || null,
      comment || null,
      pressCount || null,
      landArea || null,
      payment,
      price || null,
      date,
    ]);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================
// BARCHA MA'LUMOTLAR
// =====================
app.get("/api/workers", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM workers ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================
// BUGUNGI ISHLAR
// =====================
app.get("/api/workers/today", async (req, res) => {
  const sql = `
    SELECT * FROM workers
    WHERE date = CURRENT_DATE
    ORDER BY id DESC
  `;
  try {
    const result = await pool.query(sql);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================
// FILTRLASH
// =====================
app.get("/api/workers/filter", async (req, res) => {
  const { worker, type, payment, date } = req.query;
  let sql = "SELECT * FROM workers WHERE 1=1";
  const params = [];
  let idx = 1;

  if (worker) {
    sql += ` AND worker = $${idx}`;
    params.push(worker);
    idx++;
  }
  if (type) {
    sql += ` AND type = $${idx}`;
    params.push(type);
    idx++;
  }
  if (payment) {
    sql += ` AND payment = $${idx}`;
    params.push(payment);
    idx++;
  }
  if (date) {
    sql += ` AND date = $${idx}`;
    params.push(date);
    idx++;
  }
  sql += " ORDER BY id DESC";

  try {
    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================
// ISHCHILAR RO'YXATI
// =====================
app.get("/api/workers/worker-names", async (req, res) => {
  try {
    const result = await pool.query("SELECT DISTINCT worker FROM workers ORDER BY worker ASC");
    res.json(result.rows.map((r) => r.worker));
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================
// SEARCH
// =====================
app.get("/api/search", async (req, res) => {
  const search = req.query.q || "";
  const sql = `
    SELECT *
    FROM workers
    WHERE
      worker ILIKE $1
      OR owner ILIKE $1
      OR type ILIKE $1
      OR payment ILIKE $1
      OR client_phone ILIKE $1
      OR comment ILIKE $1
      OR CAST(press_count AS TEXT) ILIKE $1
      OR CAST(land_area AS TEXT) ILIKE $1
      OR CAST(price AS TEXT) ILIKE $1
      OR CAST(date AS TEXT) ILIKE $1
    ORDER BY id DESC
  `;
  const value = `%${search}%`;

  try {
    const result = await pool.query(sql, [value]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================
// EXCEL YUKLAB OLISH
// =====================
app.get("/api/excel", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM workers ORDER BY id DESC");
    const rows = result.rows;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Workers");
    worksheet.columns = [
      { header: "Sana", key: "date", width: 15 },
      { header: "Ishchi", key: "worker", width: 20 },
      { header: "Ish turi", key: "type", width: 20 },
      { header: "Yer egasi", key: "owner", width: 25 },
      { header: "Telefon", key: "client_phone", width: 18 },
      { header: "Press soni", key: "press_count", width: 15 },
      { header: "Yer maydoni", key: "land_area", width: 15 },
      { header: "To'lov", key: "payment", width: 15 },
      { header: "Narxi", key: "price", width: 15 },
      { header: "Izoh", key: "comment", width: 35 },
    ];

    rows.forEach((item) => {
      worksheet.addRow({
        date: new Date(item.date).toLocaleDateString("uz-UZ"),
        worker: item.worker,
        type: item.type,
        owner: item.owner,
        client_phone: item.client_phone ?? "-",
        press_count: item.press_count ?? "-",
        land_area: item.land_area ?? "-",
        payment: item.payment,
        price: item.price ?? "-",
        comment: item.comment ?? "-",
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=workers.xlsx");
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).send("Xatolik");
  }
});

// =====================
// DELETE (admin)
// =====================
app.delete("/api/workers/:id", async (req, res) => {
  const id = req.params.id;
  try {
    await pool.query("DELETE FROM workers WHERE id=$1", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================
// UPDATE (admin)
// =====================
app.put("/api/workers/:id", async (req, res) => {
  const id = req.params.id;
  const { owner, clientPhone, comment, pressCount, landArea, payment, price, date } = req.body;

  const sql = `
    UPDATE workers
    SET owner = $1, client_phone = $2, comment = $3, press_count = $4, land_area = $5, payment = $6, price = $7, date = $8
    WHERE id = $9
  `;

  try {
    await pool.query(sql, [
      owner,
      clientPhone || null,
      comment || null,
      pressCount || null,
      landArea || null,
      payment,
      price || null,
      date,
      id,
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================
// LOGIN
// =====================
app.post("/api/login", async (req, res) => {
  const { login, password } = req.body;

  if (!login || !password) {
    return res.status(400).json({
      success: false,
      message: "Login va password talab qilinadi",
    });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE login=$1 AND password=$2",
      [login, password]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Login yoki password noto'g'ri",
      });
    }

    res.json({
      success: true,
      user: {
        id: result.rows[0].id,
        login: result.rows[0].login,
        role: result.rows[0].role,
      },
    });
  } catch (err) {
    console.error("Login xatosi:", err);
    res.status(500).json({
      success: false,
      message: "Server xatosi: " + err.message,
    });
  }
});

// =====================
// WORKER — o'zining yozuvlari (10 soatlik oyna)
// =====================
const EDIT_WINDOW_HOURS = 10;
const EDIT_WINDOW_MINUTES = EDIT_WINDOW_HOURS * 60;

app.get("/api/workers/mine", async (req, res) => {
  const login = req.query.login;
  const sql = `
    SELECT * FROM workers
    WHERE worker = $1
      AND created_at >= (NOW() - INTERVAL '${EDIT_WINDOW_HOURS} hours')
    ORDER BY id DESC
  `;
  try {
    const result = await pool.query(sql, [login]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Worker — barcha vaqt bo'yicha jami press/jatka statistikasi
app.get("/api/workers/summary", async (req, res) => {
  const login = req.query.login;
  const sql = `
    SELECT
      COALESCE(SUM(press_count), 0) AS total_press,
      COALESCE(SUM(land_area), 0) AS total_land
    FROM workers
    WHERE worker = $1
  `;
  try {
    const result = await pool.query(sql, [login]);
    res.json({
      totalPress: result.rows[0].total_press,
      totalLand: result.rows[0].total_land,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Worker — o'z yozuvini tahrirlash (10 soat ichida)
app.put("/api/workers/own/:id", async (req, res) => {
  const id = req.params.id;
  const { login, owner, clientPhone, comment, pressCount, landArea, payment, price, date } = req.body;

  try {
    const checkResult = await pool.query(
      "SELECT * FROM workers WHERE id=$1 AND worker=$2",
      [id, login]
    );

    if (checkResult.rows.length === 0) {
      return res.status(403).json({ success: false, message: "Bu yozuv sizga tegishli emas" });
    }

    const diffMin = (Date.now() - new Date(checkResult.rows[0].created_at).getTime()) / 60000;
    if (diffMin > EDIT_WINDOW_MINUTES) {
      return res.status(403).json({
        success: false,
        message: `${EDIT_WINDOW_HOURS} soatlik muddat tugagan`,
      });
    }

    const sql = `
      UPDATE workers
      SET owner=$1, client_phone=$2, comment=$3, press_count=$4, land_area=$5, payment=$6, price=$7, date=$8
      WHERE id=$9
    `;
    await pool.query(sql, [
      owner,
      clientPhone || null,
      comment || null,
      pressCount || null,
      landArea || null,
      payment,
      price || null,
      date,
      id,
    ]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Worker — o'z yozuvini o'chirish (10 soat ichida)
app.delete("/api/workers/own/:id", async (req, res) => {
  const id = req.params.id;
  const login = req.query.login;

  try {
    const checkResult = await pool.query(
      "SELECT * FROM workers WHERE id=$1 AND worker=$2",
      [id, login]
    );

    if (checkResult.rows.length === 0) {
      return res.status(403).json({ success: false, message: "Bu yozuv sizga tegishli emas" });
    }

    const diffMin = (Date.now() - new Date(checkResult.rows[0].created_at).getTime()) / 60000;
    if (diffMin > EDIT_WINDOW_MINUTES) {
      return res.status(403).json({
        success: false,
        message: `${EDIT_WINDOW_HOURS} soatlik muddat tugagan`,
      });
    }

    await pool.query("DELETE FROM workers WHERE id=$1", [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================
// SERVER ISHGA TUSHIRISH
// =====================
app.listen(port, () => {
  console.log(`✅ Server ${port}-portda ishlamoqda`);
});
