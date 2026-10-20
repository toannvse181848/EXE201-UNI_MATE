// Sinh viên đăng ký bằng Google chưa có MSSV / trường / ngành — phải điền ở bước đầu của Onboarding
export const needsStudentInfo = (user) =>
  user?.role === 'user' && !(user.studentId && user.university && user.major);
