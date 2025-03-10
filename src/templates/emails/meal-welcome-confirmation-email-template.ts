import { env } from "../../env";
import { getEmailFooter } from "../../utils";

export const mealWelcomeConfirmationEmailTemplate = ({
  user,
  deliveryStartDate,
  numberOfDaysPerWeek,
  totalCaloriesNeedPerDay,
}: {
  user: {
    name: string;
    surname: string | null;
  };
  numberOfDaysPerWeek: number;
  totalCaloriesNeedPerDay: number;
  deliveryStartDate: string;
}) => {
  const { css, html } = getEmailFooter();

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Welkom bij EssentialsPlus</title>
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
      .header-text {
        font-size: 24px;
        font-weight: 300;
        margin-bottom: 25px;
      }
      .section {
        margin-bottom: 35px;
      }
      .info-box {
        background-color: #f8f9fa;
        border-left: 4px solid #317673;
        padding: 20px;
        margin: 15px 0;
      }
      .title {
        color: #317673;
        font-weight: 600;
        font-size: 18px;
        margin-bottom: 15px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      ul {
        margin: 0;
        list-style-type: disc;
        padding-left: 0px;
      }
      ul li {
        margin-bottom: 12px;
        position: relative;
        padding-left: 15px;
      }
      ol {
        margin: 0;
        padding-left: 0px;
      }
      ol li {
        margin-bottom: 20px;
        padding-left: 10px;
      }
      .highlight {
        font-weight: 600;
        color: #317673;
      }
      .button {
        display: inline-block;
        background-color: #317673;
        color: white;
        padding: 12px 25px;
        text-decoration: none;
        border-radius: 5px;
        margin: 10px 0;
        text-align: center;
        color: #ffffff !important;
      }
      a[href] {
        color: #ffffff;
      }
      .divider {
        height: 1px;
        background-color: #edf2f7;
        margin: 30px 0;
      }
      .meal-plan-details {
        background-color: #f8f9fa;
        border-radius: 8px;
        padding: 25px;
        margin: 20px 0;
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
      .logo {
        margin-bottom: 20px;
      }
      .contact-link {
        color: #317673;
        text-decoration: none;
        border-bottom: 1px solid #317673;
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
            Gefeliciteerd met je keuze voor EssentialsPlus! We zijn blij dat we
            je mogen helpen op jouw reis naar een gezondere levensstijl.
          </p>
        </div>

        <div class="section">
          <div class="title">Jouw Maaltijdplan Details</div>
          <div class="meal-plan-details">
            <ul>
              <li>
                <strong>Maaltijdplan:</strong> ${numberOfDaysPerWeek} dagen per week
              </li>
              <li>
                <strong>Caloriebehoefte:</strong> ${totalCaloriesNeedPerDay}
                kcal
              </li>
              <li><strong>Startdatum levering:</strong> ${deliveryStartDate}</li>
            </ul>
          </div>
        </div>

        <div class="section">
          <div class="title">Wat kun je verwachten?</div>
          <div class="info-box">
            <ul>
              <li>Je ontvangt verse en zorgvuldig afgemeten ingrediënten</li>
              <li>Simpele en heerlijke recepten die passen bij jouw doelen</li>
              <li>
                Levering op de afgesproken dagen, verpakt in gekoelde boxen voor
                maximale versheid
              </li>
            </ul>
          </div>
        </div>

        <div class="section">
          <div class="title">Tips voor Succes</div>
          <ol>
            <li>
              <span class="highlight">Bereid je voor:</span><br />
              Zorg dat je keuken klaar is met basisbenodigdheden zoals een
              snijplank, messen en kookgerei.
            </li>
            <li>
              <span class="highlight">Volg de recepten:</span><br />
              Onze recepten zijn eenvoudig en ontworpen om je tijd te besparen.
              Volg ze stap voor stap voor een optimaal resultaat.
            </li>
            <li>
              <span class="highlight">Plan je week:</span><br />
              Met de leveringsschema's kun je je maaltijden vooruitplannen,
              zodat je altijd klaar bent voor een gezonde maaltijd.
            </li>
            <li>
              <span class="highlight">Contact ons bij vragen:</span><br />
              Als je ooit hulp nodig hebt, staan we voor je klaar.
            </li>
          </ol>
        </div>

        <div class="divider"></div>

        <div class="section">
          <p>
            We hebben een handig overzicht gemaakt van veelgestelde vragen om je
            op weg te helpen.
          </p>
          <a href="${env.CLIENT_URL}/faq" class="button">Bekijk onze FAQ</a>
        </div>

        <div class="section">
          <p>
            We kijken ernaar uit om samen met jou een gezonde en gemakkelijke
            ervaring te creëren. Mocht je nog vragen hebben of hulp nodig
            hebben, neem dan gerust contact met ons op.
          </p>
          <a href="${env.CLIENT_URL}/contact" class="button">Neem Contact Op</a>
        </div>

        ${html}
      </div>

      <div class="footer">© ${new Date().getFullYear()} Essentials Plus. All rights reserved.</div>
    </div>
  </body>
</html>
`;
};
