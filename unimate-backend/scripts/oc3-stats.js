/**
 * Thống kê số liệu cho báo cáo OC3 — CHỈ ĐỌC, không ghi gì vào database.
 * Cùng cách tính với phần phân tích ở trang Tổng quan admin (src/utils/oc3Metrics.js).
 *
 * Cách chạy (trong thư mục unimate-backend):
 *   node scripts/oc3-stats.js --db unimate_v2 --exclude scripts/oc3-exclude.txt
 *
 *   --db       tên database cần thống kê (mặc định: database trong MONGODB_URI)
 *   --exclude  file danh sách email cần loại (thành viên nhóm, tài khoản test), mỗi dòng 1 email.
 *              Email trong biến môi trường OC3_EXCLUDE_EMAILS cũng được loại.
 *   --out      thư mục xuất CSV (mặc định: oc3-output)
 *
 * Kết quả: bảng tóm tắt in ra màn hình + các file CSV (email đã che) trong thư mục --out:
 *   tong-quan, pheu, theo-tuan, theo-kenh, ke-hoach-thuc-te, nguoi-dung, don-hang
 *
 * Định nghĩa từng chỉ số: docs/oc3-metrics.md
 */
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { computeOc3Metrics, parseEmailList } = require('../src/utils/oc3Metrics');
const { buildOc3Tables } = require('../src/utils/oc3Report');

const CSV_NAMES = {
  'Tổng quan': 'tong-quan',
  'Phễu': 'pheu',
  'Theo tuần': 'theo-tuan',
  'Theo kênh': 'theo-kenh',
  'Kế hoạch - thực tế': 'ke-hoach-thuc-te',
  'Người dùng': 'nguoi-dung',
  'Đơn hàng': 'don-hang',
};

const getArg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};

const toCsv = (rows) => {
  const cols = Object.keys(rows[0] || {});
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // BOM để Excel đọc đúng tiếng Việt
  return '﻿' + [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
};

async function run() {
  const dbName = getArg('db');
  const outDir = getArg('out') || 'oc3-output';
  const excludeFile = getArg('exclude');
  const excludedEmails = [
    ...parseEmailList(excludeFile ? fs.readFileSync(excludeFile, 'utf8') : ''),
    ...parseEmailList(process.env.OC3_EXCLUDE_EMAILS),
  ];

  let uri = process.env.MONGODB_URI;
  if (dbName) uri = uri.replace(/\/([^/?]*)(\?|$)/, `/${dbName}$2`);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  const db = mongoose.connection.db;

  // Chi phí, lượt tiếp cận, lượt nhấp theo kênh admin đã nhập (lưu trong settings key oc3)
  const setting = await db.collection('settings').findOne({ key: 'oc3' });
  const metrics = await computeOc3Metrics(db, { excludedEmails, inputs: setting?.value || {} });
  const tables = buildOc3Tables(metrics);

  fs.mkdirSync(outDir, { recursive: true });
  for (const [name, rows] of Object.entries(tables)) {
    fs.writeFileSync(path.join(outDir, `${CSV_NAMES[name]}.csv`), toCsv(rows));
  }

  console.log(`\nDatabase: ${db.databaseName}\n`);
  for (const name of ['Tổng quan', 'Phễu', 'Theo kênh', 'Kế hoạch - thực tế']) {
    console.log(`=== ${name.toUpperCase()} ===`);
    console.table(tables[name]);
  }
  if (metrics.biggestDrop) console.log(`Bước mất nhiều người nhất: ${metrics.biggestDrop.step}`);
  console.log(`Đã xuất CSV (gồm cả bảng theo tuần) vào: ${path.resolve(outDir)}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
