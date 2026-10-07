const nodemailer = require('nodemailer');

/**
 * Tạo transporter Nodemailer từ biến môi trường
 * Hỗ trợ Gmail (EMAIL_USER + EMAIL_PASS / App Password)
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

/**
 * Gửi email reset mật khẩu
 * @param {string} to - Địa chỉ email người nhận
 * @param {string} resetUrl - URL reset mật khẩu có token
 */
const sendPasswordResetEmail = async (to, resetUrl) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"UNI-MATE Platform" <${process.env.EMAIL_USER}>`,
    to,
    subject: '🔐 Đặt lại mật khẩu UNI-MATE của bạn',
    html: `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>Reset Mật Khẩu</title>
      </head>
      <body style="margin:0;padding:0;background-color:#F8FAFC;font-family:'Segoe UI',Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding:40px 20px;">
              <table width="560" cellpadding="0" cellspacing="0"
                style="background:#fff;border-radius:20px;overflow:hidden;
                       box-shadow:0 8px 24px rgba(0,0,0,0.08);border:1px solid #E2E8F0;">
                <tr>
                  <td align="center"
                    style="background:linear-gradient(135deg,#FF5722 0%,#FF8A50 100%);
                           padding:36px 40px;">
                    <h1 style="color:#fff;font-size:28px;font-weight:900;
                               letter-spacing:-0.5px;margin:0;">
                      🎓 UNI-MATE
                    </h1>
                    <p style="color:rgba(255,255,255,0.85);font-size:13px;margin:6px 0 0;">
                      Học hết mình • Chơi hết phố
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:40px;">
                    <h2 style="color:#0F172A;font-size:20px;font-weight:800;margin:0 0 12px;">
                      Yêu cầu đặt lại mật khẩu
                    </h2>
                    <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 24px;">
                      Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản UNI-MATE gắn với địa chỉ email này.
                      Nhấn vào nút bên dưới để tiếp tục:
                    </p>
                    <table cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="center">
                          <a href="${resetUrl}"
                            style="display:inline-block;padding:14px 36px;
                                   background:linear-gradient(135deg,#FF5722,#FF8A50);
                                   color:#fff;font-size:15px;font-weight:700;
                                   border-radius:12px;text-decoration:none;
                                   box-shadow:0 6px 16px rgba(255,87,34,0.35);">
                            🔑 Đặt lại mật khẩu ngay
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="color:#94A3B8;font-size:13px;margin:28px 0 0;text-align:center;">
                      ⏱ Link có hiệu lực trong <strong>15 phút</strong>.<br/>
                      Nếu bạn không yêu cầu điều này, hãy bỏ qua email này.
                    </p>
                    <hr style="border:none;border-top:1px solid #E2E8F0;margin:28px 0;"/>
                    <p style="color:#CBD5E1;font-size:11px;text-align:center;margin:0;">
                      UNI-MATE Platform • Kết nối sinh viên FPT TP.HCM<br/>
                      Email này được gửi tự động, vui lòng không trả lời.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendPasswordResetEmail };
