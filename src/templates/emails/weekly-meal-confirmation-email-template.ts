import { env } from "../../env";
import { getEmailFooter } from "../../utils";

export const weeklyMealConfirmationEmailTemplate = ({
  user,
  deliveryDate,
  numberOfDays,
  totalCaloriesInThisWeek,
  totalMealsInThisWeek,
  weekNumber,
  orderId,
}: {
  user: {
    name: string;
    surname: string | null;
  };
  weekNumber: number;
  totalCaloriesInThisWeek: number;
  totalMealsInThisWeek: number;
  numberOfDays: number;
  deliveryDate: string;
  orderId: string;
}) => {
  const { css, html } = getEmailFooter();

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Uw wekelijkse maaltijdbevestiging</title>
    <style>
      body {
        font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
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
        padding: 30px;
      }
      .weekly-summary {
        background-color: #f8f9fa;
        border-radius: 8px;
        padding: 25px;
        margin: 20px 0;
        border-left: 4px solid #317673;
      }
      .summary-list {
        margin: 0;
        padding-left: 0;
        list-style-type: none;
      }
      .summary-list li {
        margin-bottom: 12px;
        padding-left: 0;
      }
      .highlight {
        color: #317673;
        font-weight: 600;
      }
      .title {
        color: #317673;
        font-size: 20px;
        font-weight: 600;
        margin-bottom: 15px;
      }
      .tips-list {
        margin: 20px 0;
        padding-left: 0px;
      }
      .tips-list li {
        margin-bottom: 15px;
      }
      .button {
        display: inline-block;
        background-color: #317673;
        color: white !important;
        padding: 12px 25px;
        text-decoration: none;
        border-radius: 5px;
        margin: 15px 0;
      }
      a[href].button {
        color: white !important;
      }
      .signature {
        margin-top: 40px;
        padding-top: 20px;
        border-top: 1px solid #edf2f7;
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
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header-banner">
         <img src="${env.CLIENT_URL}/imgs/logo.png" alt="${env.APP_NAME}">
      </div>

      <div class="content-wrapper">
        <div class="section">
          <p>Beste <span class="highlight">${user.name} ${user.surname || ""}</span>,</p>

          <p>
            De maaltijden voor week
            <span class="highlight">${weekNumber}</span> zijn bevestigd en wij
            gaan aan de slag met het voorbereiden en leveren van jou
            maaltijdbox.
          </p>
        </div>

        <div class="section">
          <div class="title">
            Hier is een samenvatting van jouw maaltijden voor deze week:
          </div>
          <div class="weekly-summary">
            <ul class="summary-list">
              <li>
                <strong>Totale calorieën:</strong> ${totalCaloriesInThisWeek} kcal
              </li>
              <li>
                <strong>Totale maaltijden:</strong> ${totalMealsInThisWeek} maaltijden
              </li>
              <li>
                <strong>Aantal geselecteerde dagen:</strong> ${numberOfDays} dagen
              </li>
              <li><strong>Levering:</strong> ${deliveryDate}</li>
            </ul>
          </div>

          <p>
            Wil je jouw maaltijden bekijken?
            <br />
            <a href="${env.CLIENT_URL}/order-history?mealOrderId=${orderId}" class="button">Bekijk bestelling</a>
          </p>
        </div>

        <div class="section">
          <div class="title">Tips voor een zorgeloze week:</div>
          <ol class="tips-list">
            <li>
              <strong>Controleer</strong> je box bij levering om te zorgen dat
              alles compleet is.
            </li>
            <li>
              <strong>Volg onze recepten</strong> stap voor stap om het beste
              uit je gerechten te halen.
            </li>
            <li>
              <strong>Contact ons bij vragen:</strong> Neem gerust contact met
              ons op via
              <a href="${env.CLIENT_URL}/contact" style="color: #317673"
                >onze contactpagina</a
              >.
            </li>
          </ol>
        </div>

        <div class="section">
          <p>
            We wensen je alvast veel plezier en smaakvolle momenten met jouw
            EssentialsPlus-maaltijden!
          </p>
        </div>

        ${html}
      </div>

      <div class="footer">© 2024 Essentials Plus. All rights reserved.</div>
    </div>
  </body>
</html>

`;
};
