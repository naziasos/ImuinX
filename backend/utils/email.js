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

const sendWorkerCredentials = async (
  to,
  name,
  email,
  temporaryPassword
) => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: "ImuinX - Worker Account Created",

    text: `Hello ${name},

Your Worker account has been created in the ImuinX Vaccination Management System.

Login details:

Email: ${email}
Temporary Password: ${temporaryPassword}

Please log in using these credentials and keep your password secure.

Regards,
ImuinX Vaccination Management System`,
  });
};


// ===============================
// GUEST (NO-LOGIN) CAMPAIGN EMAILS
// ===============================

const sendGuestOtpEmail = async (to, otp, purpose) => {
  const what =
    purpose === "guest-certificate"
      ? "access your vaccination certificate"
      : "confirm your vaccine campaign booking";

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: "ImuinX - Your verification code",
    text: `Your ImuinX verification code is: ${otp}\n\nUse it to ${what}. The code expires in 10 minutes. Please do not share it with anyone.`,
  });
};

const sendGuestBookingEmail = async (to, details) => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: `ImuinX - Appointment confirmed (${details.bookingCode})`,
    text: `Hello ${details.name},

Your vaccine campaign appointment is confirmed.

Appointment ID: ${details.bookingCode}
Campaign: ${details.campaign}
Vaccine: ${details.vaccine}
Clinic: ${details.clinic}
When: ${details.when}

Please bring a valid photo ID and show this Appointment ID to the health worker.

After vaccination you can get your certificate on the ImuinX website
("Get Certificate") using this Appointment ID and your email.

Regards,
ImuinX Vaccination Management System`,
  });
};

const sendGuestCertificateReadyEmail = async (to, details) => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: "ImuinX - Your vaccination certificate is ready",
    text: `Hello ${details.name},

Your ${details.vaccine} dose has been recorded and your certificate is ready.

To view it securely, open ImuinX, choose "Get Certificate", and enter:
  Appointment ID: ${details.bookingCode}
  Email: ${to}
You will receive a one-time code by email to confirm it is you.

Tip: create an ImuinX account with this same email to keep all your
vaccination records and certificates in one place.

Regards,
ImuinX Vaccination Management System`,
  });
};

module.exports = {
  sendGuestOtpEmail,
  sendGuestBookingEmail,
  sendGuestCertificateReadyEmail,
  sendOTPEmail,
  sendClinicAdminCredentials,
  sendWorkerCredentials,
};