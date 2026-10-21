// Hiển thị thời gian hẹn cafe, VD: "T5, 23/10, 15:30"
export const formatMeetupTime = (value) =>
  value
    ? new Date(value).toLocaleString('vi-VN', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

// Giá trị cho <input type="datetime-local"> theo giờ máy người dùng
export const toDateTimeLocal = (date) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
