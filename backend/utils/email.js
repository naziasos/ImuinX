const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});


// ===============================
// OTP EMAIL
// ===============================

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


// ===============================
// CLINIC ADMIN CREDENTIALS EMAIL
// ===============================

const sendClinicAdminCredentials = async (
  to,
  name,
  email,
  temporaryPassword,
  clinicName
) => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: "ImuinX - Clinic Admin Account Created",

    text: `Hello ${name},

Your Clinic Admin account has been created for ${clinicName}.

Login details:

Email: ${email}
Temporary Password: ${temporaryPassword}

Please log in using these credentials and keep your password secure.

Regards,
ImuinX Vaccination Management System`,
  });
};


module.exports = {
  sendOTPEmail,
  sendClinicAdminCredentials,
};