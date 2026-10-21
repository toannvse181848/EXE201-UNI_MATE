/** "The Coffee House" + "Sư Vạn Hạnh" → "The Coffee House - Sư Vạn Hạnh"; thiếu một phần thì dùng phần còn lại */
const composeVenueName = (brand, branch) => {
  const b = String(brand || '').trim();
  const c = String(branch || '').trim();
  if (!b) return c;
  if (!c) return b;
  return `${b} - ${c}`;
};

module.exports = { composeVenueName };
