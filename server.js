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

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false,
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

db.getConnection((err, connection) => {
  if (err) {
    console.error("❌ MySQL ulanish xatosi:", err.message);
    return;
  }
  console.log("✅ MySQL bazasiga muvaffaqiyatli ulandi!");
  connection.release();
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
app.post("/api/workers", (req, res) => {
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
    (worker, type, owner, clientPhone, comment, pressCount, landArea, payment, price, date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      worker,
      type,
      owner,
      clientPhone || null,
      comment || null,
      pressCount,
      landArea,
      payment,
      price,
      date,
    ],
    (err) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ success: false, error: err.message });
      }
      res.json({ success: true });
    },
  );
});

// =====================
// BARCHA MA'LUMOTLAR (admin, "Barchasi" filtrsiz holat uchun ham ishlatiladi)
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
// BUGUNGI ISHLAR (admin panel default ko'rinishi)
// =====================
app.get("/api/workers/today", (req, res) => {
  const sql = `
    SELECT * FROM workers
    WHERE date = CURDATE()
    ORDER BY id DESC
  `;
  db.query(sql, (err, rows) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json(rows);
  });
});

// =====================
// FILTRLASH ("Barchasi" oynasidagi qidiruv)
// =====================
app.get("/api/workers/filter", (req, res) => {
  const { worker, type, payment, date } = req.query;
  let sql = "SELECT * FROM workers WHERE 1=1";
  const params = [];

  if (worker) {
    sql += " AND worker = ?";
    params.push(worker);
  }
  if (type) {
    sql += " AND type = ?";
    params.push(type);
  }
  if (payment) {
    sql += " AND payment = ?";
    params.push(payment);
  }
  if (date) {
    sql += " AND date = ?";
    params.push(date);
  }
  sql += " ORDER BY id DESC";

  db.query(sql, params, (err, rows) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ success: false, error: err.message });
    }
    res.json(rows);
  });
});

// =====================
// ISHCHILAR RO'YXATI (filtr uchun select to'ldirish)
// =====================
app.get("/api/workers/worker-names", (req, res) => {
  db.query(
    "SELECT DISTINCT worker FROM workers ORDER BY worker ASC",
    (err, rows) => {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
      res.json(rows.map((r) => r.worker));
    },
  );
});

// =====================
// SEARCH (tez qidiruv, admin "Bugungi ishlar" ustidagi input uchun)
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
            OR clientPhone LIKE ?
            OR comment LIKE ?
            OR CAST(pressCount AS CHAR) LIKE ?
            OR CAST(landArea AS CHAR) LIKE ?
            OR CAST(price AS CHAR) LIKE ?
            OR CAST(date AS CHAR) LIKE ?
        ORDER BY id DESC
    `;
  const value = `%${search}%`;
  db.query(
    sql,
    [value, value, value, value, value, value, value, value, value, value],
    (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ success: false, error: err.message });
      }
      res.json(result);
    },
  );
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
      { header: "Telefon", key: "clientPhone", width: 18 },
      { header: "Press soni", key: "pressCount", width: 15 },
      { header: "Yer maydoni", key: "landArea", width: 15 },
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
        clientPhone: item.clientPhone ?? "-",
        pressCount: item.pressCount ?? "-",
        landArea: item.landArea ?? "-",
        payment: item.payment,
        price: item.price ?? "-",
        comment: item.comment ?? "-",
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", "attachment; filename=workers.xlsx");
    await workbook.xlsx.write(res);
    res.end();
  });
});

// =====================
// DELETE (admin)
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
// UPDATE (admin)
// =====================
app.put("/api/workers/:id", (req, res) => {
  const id = req.params.id;
  const { owner, clientPhone, comment, pressCount, landArea, payment, price, date } =
    req.body;

  const sql = `
    UPDATE workers
    SET owner = ?, clientPhone = ?, comment = ?, pressCount = ?, landArea = ?, payment = ?, price = ?, date = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [
      owner,
      clientPhone || null,
      comment || null,
      pressCount,
      landArea,
      payment,
      price,
      date,
      id,
    ],
    (err) => {
      if (err)
        return res.status(500).json({ success: false, error: err.message });
      res.json({ success: true });
    },
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
      message: "Login va password talab qilinadi",
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
          message: "Server xatosi: " + err.message,
        });
      }

      if (rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: "Login yoki password noto'g'ri",
        });
      }

      res.json({
        success: true,
        user: {
          id: rows[0].id,
          login: rows[0].login,
          role: rows[0].role,
        },
      });
    },
  );
});

// =====================
// WORKER — o'zining yozuvlari (10 soatlik oyna)
// =====================
const EDIT_WINDOW_HOURS = 10;
const EDIT_WINDOW_MINUTES = EDIT_WINDOW_HOURS * 60;

app.get("/api/workers/mine", (req, res) => {
  const login = req.query.login;
  const sql = `
    SELECT * FROM workers
    WHERE worker = ?
      AND createdAt >= (NOW() - INTERVAL ${EDIT_WINDOW_HOURS} HOUR)
    ORDER BY id DESC
  `;
  db.query(sql, [login], (err, rows) => {
    if (err)
      return res.status(500).json({ success: false, error: err.message });
    res.json(rows);
  });
});

// Worker — barcha vaqt bo'yicha jami press/jatka statistikasi
app.get("/api/workers/summary", (req, res) => {
  const login = req.query.login;

  const sql = `
    SELECT
      COALESCE(SUM(pressCount), 0) AS totalPress,
      COALESCE(SUM(landArea), 0) AS totalLand
    FROM workers
    WHERE worker = ?
  `;

  db.query(sql, [login], (err, rows) => {
    if (err)
      return res.status(500).json({ success: false, error: err.message });
    res.json({
      totalPress: rows[0].totalPress,
      totalLand: rows[0].totalLand,
    });
  });
});

// Worker — o'z yozuvini tahrirlash (10 soat ichida)
app.put("/api/workers/own/:id", (req, res) => {
  const id = req.params.id;
  const {
    login,
    owner,
    clientPhone,
    comment,
    pressCount,
    landArea,
    payment,
    price,
    date,
  } = req.body;

  db.query(
    "SELECT * FROM workers WHERE id=? AND worker=?",
    [id, login],
    (err, rows) => {
      if (err)
        return res.status(500).json({ success: false, error: err.message });
      if (rows.length === 0)
        return res
          .status(403)
          .json({ success: false, message: "Bu yozuv sizga tegishli emas" });

      const diffMin =
        (Date.now() - new Date(rows[0].createdAt).getTime()) / 60000;
      if (diffMin > EDIT_WINDOW_MINUTES)
        return res.status(403).json({
          success: false,
          message: `${EDIT_WINDOW_HOURS} soatlik muddat tugagan`,
        });

      const sql = `
      UPDATE workers
      SET owner=?, clientPhone=?, comment=?, pressCount=?, landArea=?, payment=?, price=?, date=?
      WHERE id=?
    `;
      db.query(
        sql,
        [
          owner,
          clientPhone || null,
          comment || null,
          pressCount,
          landArea,
          payment,
          price,
          date,
          id,
        ],
        (err) => {
          if (err)
            return res
              .status(500)
              .json({ success: false, error: err.message });
          res.json({ success: true });
        },
      );
    },
  );
});

// Worker — o'z yozuvini o'chirish (10 soat ichida)
app.delete("/api/workers/own/:id", (req, res) => {
  const id = req.params.id;
  const login = req.query.login;

  db.query(
    "SELECT * FROM workers WHERE id=? AND worker=?",
    [id, login],
    (err, rows) => {
      if (err)
        return res.status(500).json({ success: false, error: err.message });
      if (rows.length === 0)
        return res
          .status(403)
          .json({ success: false, message: "Bu yozuv sizga tegishli emas" });

      const diffMin =
        (Date.now() - new Date(rows[0].createdAt).getTime()) / 60000;
      if (diffMin > EDIT_WINDOW_MINUTES)
        return res.status(403).json({
          success: false,
          message: `${EDIT_WINDOW_HOURS} soatlik muddat tugagan`,
        });

      db.query("DELETE FROM workers WHERE id=?", [id], (err) => {
        if (err)
          return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true });
      });
    },
  );
});

// =====================
// SERVER ISHGA TUSHIRISH
// =====================
app.listen(port, () => {
  console.log(`✅ Server ${port}-portda ishlamoqda`);
});
