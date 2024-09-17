import { env } from "../../env";

export const autoConfirmOrderEmailTemplate = ({
  dayNumber,
  weekNumber,
  date,
  title,
  totalOrderPlaced,
}: {
  dayNumber: number;
  weekNumber: number;
  date: string;
  title: string;
  totalOrderPlaced?: string | number;
}) => {
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
            <h2>Auto confirm order</h2>
        </div>
        <div class="content">
            <h1>${title}</h1>
            <p>Lockdown day: ${dayNumber}</p>
            <p>Week: ${weekNumber}</p>
            <p>Date: ${date}</p>
            ${typeof totalOrderPlaced !== "undefined" ? `<p>Total order placed: ${totalOrderPlaced}</p>` : ""}
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} ${env.APP_NAME}. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`;
};
