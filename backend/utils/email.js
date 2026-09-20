const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendOTPEmail = async (to, otp, purpose) => {
  const subject =
    purpose === "registration"
      ? "ImuinX - Email Verification OTP"
      : "ImuinX - Password Reset OTP";

  const message =
    purpose === "registration"
      ? `Your ImuinX email verification OTP is: ${otp}`
      : `Your ImuinX password reset OTP is: ${otp}`;

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject,
    text: `${message}\n\nThis OTP will expire soon. Please do not share it with anyone.`,
  });
};

module.exports = sendOTPEmail;