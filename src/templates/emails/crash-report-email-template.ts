import { env } from "../../env";

export const crashReportEmailTemplate = ({ crashReportText }: { crashReportText: string }) => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Crash Report</title>
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
            color: #ffffff;
        }
        .header img {
            max-width: 150px;
            margin-bottom: 10px;
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
        .content .details {
            background-color: #f9f9f9;
            padding: 15px;
            border-radius: 5px;
            margin-top: 20px;
            color: #333333;
            border: 1px solid #dddddd;
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
            <img src="${env.CLIENT_URL}/imgs/logo.png" alt="${env.APP_NAME}">
            <h2>Crash Report</h2>
        </div>
        <div class="content">
            <h1>Application Crash Report</h1>
            <p>Dear Admin,</p>
            <p>We have detected a crash in the application and we are working to resolve the issue. Below are the details of the crash report:</p>
            <div class="details">
                <p>Details:</p>
                <pre>${crashReportText}</pre>
            </div>
            <p>We apologize for the inconvenience caused. Our team is currently investigating the issue and will provide an update as soon as possible.</p>
            <p>Thank you for your understanding and patience.</p>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ${env.APP_NAME}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`;
};
