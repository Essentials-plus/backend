import { env } from "../../env";

export const resetPasswordEmailTemplate = ({ name, resetLink }: { name: string; resetLink: string }) => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Password</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .container {
            width: 100%;
            max-width: 600px;
            margin: 50px auto;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background-color: #317673;
            padding: 20px;
            text-align: center;
        }
        .header img {
            max-width: 150px;
        }
        .content {
            padding: 30px;
        }
        .content h1 {
            color: #333333;
        }
        .content p {
            color: #666666;
            line-height: 1.6;
        }
        .content .btn {
            display: inline-block;
            padding: 10px 20px;
            background-color: #317673;
            color: #ffffff;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 20px;
        }
        .footer {
            background-color: #f4f4f4;
            padding: 20px;
            text-align: center;
            color: #999999;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="${env.CLIENT_URL}/imgs/logo.png" alt="Logo">
        </div>
        <div class="content">
            <h1>Reset Your Password</h1>
            <p>Hi ${name},</p>
            <p>You recently requested to reset your password for your account. Click the button below to reset it.</p>
            <a href="${resetLink}" class="btn">Reset Password</a>
            <p>If you did not request a password reset, please ignore this email or contact support if you have questions.</p>
            <p>Thanks,</p>
            <p>${env.APP_NAME}</p>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ${env.APP_NAME}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`;
};
