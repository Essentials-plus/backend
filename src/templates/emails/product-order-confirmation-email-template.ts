import { Prisma } from "@prisma/client";
import moment from "moment";
import "moment/locale/nl";
import { env } from "../../env";
import { getEmailFooter } from "../../utils";

export const productOrderConfirmationEmailTemplate = ({
  user,
  order,
}: {
  user: {
    name: string;
    surname: string | null;
  };
  order: Prisma.OrderGetPayload<{
    include: {
      orderItems: true;
    };
  }>;
}) => {
  const { css, html } = getEmailFooter();

  const shippingAddress = order.shippingAddress as any;

  const coupon = order.coupon as any;

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Bestelling bevestigd!</title>
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
      .order-status {
        text-align: center;
        padding: 20px;
        background-color: #edf7f7;
        border-radius: 8px;
        margin-bottom: 20px;
      }
      .status-text {
        color: #317673;
        font-size: 24px;
        font-weight: 600;
      }
      .order-number {
        font-weight: 600;
        color: #317673;
      }
      .section {
        margin-bottom: 30px;
      }
      .title {
        color: #317673;
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 15px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .order-details {
        background-color: #f8f9fa;
        border-left: 4px solid #317673;
        padding: 6px 20px;
        margin: 15px 0;
      }
      .order-table {
        width: 100%;
        border-collapse: collapse;
        margin: 15px 0;
      }
      .order-table th {
        background-color: #f8f9fa;
        padding: 10px;
        text-align: left;
        border-bottom: 2px solid #edf2f7;
      }
      .order-table td {
        padding: 10px;
        border-bottom: 1px solid #edf2f7;
      }
      .total-row {
        font-weight: 600;
        background-color: #f8f9fa;
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
      .delivery-info {
        background-color: #f8f9fa;
        padding: 6px 20px;
        border-radius: 8px;
        margin: 15px 0;
      }
      .footer {
        background-color: #f8f9fa;
        padding: 20px;
        text-align: center;
        color: #666;
        font-size: 12px;
        border-top: 1px solid #edf2f7;
      }
      p {
        margin-top: 10px;
        margin-bottom: 10px;
      }
      .order-item-variation {
        margin-top: 1px;
        display: flex;
        flex-wrap: wrap;
        font-size: 14px;
      }
      .order-item-variation div {
        margin-top: 2px !important;
        margin-left: 8px !important;
        padding-left: 8px;
        
      }
        .attributeName{
        color: #737373;
        }
      .order-item-variation div .divider {
        height: 16px;
        width: 1px;
        background: #cccccc;
      }
        .product-name {
        font-size: 13px;
        font-weight: bold;
      }
        .text-right{
          text-align: right !important;
        }
          ${css}
    </style>
  </head>
  <body>
    <div class="container">
    <div class="header-banner">
        <img src="https://essentialsplus.eu/imgs/logo.png" alt="${env.APP_NAME}">
      </div>

      <div class="content-wrapper">
        <div class="order-status">
          <p class="status-text">Bestelling Bevestigd!</p>
          <p>Bedankt voor je bestelling bij EssentialsPlus</p>
        </div>

        <div class="section">
          <p>Beste <span class="order-number">${user.name} ${user.surname || ""}</span>,</p>
          <p>We hebben je bestelling ontvangen en zijn er mee aan de slag gegaan. Hieronder vind je een overzicht van je bestelling.</p>
        </div>

        <div class="section">
          <div class="title">Bestelgegevens</div>
          <div class="order-details">
            <p><strong>Bestelnummer:</strong> ${order.orderId}</p>
            <p><strong>Besteldatum:</strong> ${moment(order.paidAt || new Date())
              .locale("nl")
              .format("dddd, DD-MM-YYYY")}</p>
            <p><strong>Levering:</strong> Uw track en trace code volgt zodra de bestelling is verwerkt.</p>
          </div>
        </div>

        <div class="section">
          <div class="title">Bestelde Items</div>
          <table class="order-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Aantal</th>
                <th class="text-right">Prijs</th>
              </tr>
            </thead>
            <tbody>
              ${order.orderItems
                .map(
                  (orderItem) =>
                    `<tr>
                      <td>
                        <div>
                          <p style="margin-top: 0px;margin-bottom: 0px;" class="product-name">
                            ${orderItem.name}
                          </p>
                          ${
                            (orderItem.attributes as any).productVariations
                              ? `
                              <div className="order-item-variation">
                                ${(orderItem.attributes as any).productVariations
                                  .map((productVariation: any, i: number) => {
                                    return `<div ${i === 0 ? 'style="margin-left: 0px;padding-left: 0px;border: none;"' : ""}><span class="attributeName">${productVariation.attribute?.name}</span>: <span style="color: #0a0a0a">${productVariation.attributeTerm?.name}</span></div>`;
                                  })
                                  .join("")}
                              </div>
                          `
                              : ""
                          }
                        </div>
                      </td>
                      <td>x ${orderItem.quantity}</td>
                      <td class="price text-right">${env.CURRENCY_TYPE === "eur" ? "€" : "$"}${orderItem.price}</td>
                    </tr>`,
                )
                .join("")}
                     ${
                       coupon
                         ? `<tr class="total-row">
                      <td colspan="2">Coupon(s) -<strong>${(coupon as any)?.code}</strong></td>
                      <td class="price text-right">- ${env.CURRENCY_TYPE === "eur" ? "€" : "$"}${
                        coupon?.type === "amount"
                          ? (order.amount - (coupon as any).value).toFixed(2)
                          : ((order.amount / 100) * coupon?.value).toFixed(2)
                      }</td>
                    </tr>`
                         : ""
                     }
                   
                    <tr class="total-row">
                      <td colspan="2"><strong>Totaal</strong></td>
                      <td class="price text-right">${env.CURRENCY_TYPE === "eur" ? "€" : "$"}${order.amount.toFixed(2)}</td>
                    </tr>
            </tbody>
          </table>
        </div>

        <div class="section">
          <div class="title">Bezorggegevens</div>
          <div class="delivery-info">
            <p><strong>Naam:</strong> ${shippingAddress?.name} ${shippingAddress?.surname}</p>
            <p><strong>Adres:</strong> ${shippingAddress?.address}</p>
            <p><strong>Postcode:</strong> ${shippingAddress?.zipCode}</p>
            <p><strong>Stad:</strong> ${shippingAddress?.city}</p>
            <p><strong>Telefoonnummer:</strong> ${shippingAddress?.mobile}</p>
          </div>
        </div>

        <div class="section">
          <p>Je kunt je bestelling volgen via onze website:</p>
          <a href="https://essentialsplus.eu/order-history?orderId=${order.id}" class="button">Bekijk bestelling</a>
        </div>

        <div class="section">
          <p>Heb je vragen over je bestelling? Neem dan gerust contact met ons op:</p>
          <a href="https://essentialsplus.eu/contact" class="button">Contact Opnemen</a>
        </div>

        <div class="section">
          <p>Bedankt voor je vertrouwen in EssentialsPlus!</p>
        </div>

        ${html}
      </div>

      <div class="footer">© ${new Date().getFullYear()} Essentials Plus. All rights reserved.</div>
    </div>
  </body>
</html>

`;
};
