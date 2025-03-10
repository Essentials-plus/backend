import { User } from "@prisma/client";
import { env } from "../../env";
import { getEmailFooter } from "../../utils";

export const mealSelectionReminderEmailTemplate = ({ user }: { user: User }) => {
  const { css, html } = getEmailFooter();
  return `
  <!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Vergeet niet je maaltijden te selecteren – nog 2 dagen!</title>
<style>
  body {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    line-height: 1.8;
    margin: 0;
    padding: 0;
    background-color: #f7f7f7;
    color: #333333;
  }
  .container {
    max-width: 600px;
    margin: 0 auto;
    background-color: #ffffff;
  }
.header-banner {
        background-color: #317673;
        padding: 20px;
        text-align: center;
      }
      .header-banner img {
        max-width: 200px;
        filter: invert(1);
      }

  .content-wrapper {
    padding: 40px;
  }
  .highlight {
    color: #317673;
    font-weight: 600;
  }
  .countdown {
    text-align: center;
    background-color: #edf7f7;
    border-radius: 8px;
    padding: 20px;
    margin: 20px 0;
  }
  .countdown-number {
    font-size: 32px;
    font-weight: bold;
    color: #317673;
  }
  .action-box {
    background-color: #f8f9fa;
    border-left: 4px solid #317673;
    padding: 20px;
    margin: 20px 0;
  }
  .button {
    display: block;
    background-color: #317673;
    color: #fff !important;
    padding: 15px 25px;
    text-decoration: none;
    border-radius: 5px;
    margin: 25px 0;
    text-align: center;
    font-weight: 600;
    font-size: 16px;
  }
  .button:hover {
    background-color: #286460;
  }
  .footer {
    background-color: #f8f9fa;
    padding: 20px;
    text-align: center;
    color: #666;
    font-size: 12px;
    border-top: 1px solid #edf2f7;
  }
  ${css}
  .emoji {
    font-size: 24px;
    margin: 0 5px;
  }
  @media only screen and (max-width: 600px) {
    .content-wrapper {
      padding: 20px;
    }
    .header-banner {
      padding: 20px;
    }
  }
</style>
</head>
<body>
  <div class="container">
     <div class="header-banner">
        <img src="${env.CLIENT_URL}/imgs/logo.png" alt="${env.APP_NAME}">
      </div>

    <div class="content-wrapper">
      <p>Beste <span class="highlight">${user.name} ${user.surname}</span>,</p>

      <div class="countdown">
        <span class="emoji">⏳</span>
        <p>Dit is een vriendelijke herinnering dat je nog</p>
        <div class="countdown-number">2 dagen</div>
        <p>hebt om je <strong>maaltijdkeuze voor de komende week</strong> door te geven.</p>
      </div>

      <div class="action-box">
        <p><span class="emoji">✅</span> <strong>Keuze maken?</strong><br>
        Log in op je account en selecteer jouw favoriete maaltijden.</p>
        
        <p><span class="emoji">⏳</span> <strong>Geen actie?</strong><br>
        Geen probleem! Dan bevestigen wij automatisch een willekeurige selectie van maaltijden voor je.</p>
      </div>

      <a href="${env.CLIENT_URL}/weekly-menu" class="button">
        🔗 KLIK HIER OM JE MAALTIJDEN TE KIEZEN
      </a>

      <p>Wil je een wijziging maken of heb je vragen? Ons team staat voor je klaar.</p>

      ${html}
    </div>

    <div class="footer">
      © ${new Date().getFullYear()} Essentials Plus. All rights reserved.
    </div>
  </div>
</body>
</html>`;
};
