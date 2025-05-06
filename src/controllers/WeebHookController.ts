import { RequestHandler } from "express";
import Stripe from "stripe";
import { prisma } from "../configs/database";
import { env } from "../env";
import { productOrderConfirmationEmailTemplate } from "../templates/emails/product-order-confirmation-email-template";
import { decrementProductsStock } from "../utils/order";
import { sendEmailWithNodemailer } from "../utils/sender";
import stripe from "../utils/stripe";

class WeebHookController {
  stripe: RequestHandler = async (req, res) => {
    const sig = req.headers["stripe-signature"];

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig!, env.STRIPE_WEBHOOK_SECRET!);
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err}`);
      return res.sendStatus(400);
    }

    // Handle the event based on its type
    switch (event.type) {
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        try {
          // Find the user in your database based on Stripe's customerId
          const user = await prisma.user.findFirst({ where: { customer: customerId } });

          if (user) {
            // Mark the subscription as failed
            await prisma.userPlan.updateMany({
              where: { userId: user.id },
              data: { status: "canceled" },
            });
          }

          // Notify user or take further action, e.g., sending an email
          res.sendStatus(200);
        } catch (err) {
          console.error("Error updating subscription status after payment failure:", err);
          res.sendStatus(500);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        try {
          // Find the user in your database based on Stripe's customerId
          const user = await prisma.user.findFirst({ where: { customer: customerId } });

          if (user) {
            // Mark the subscription as cancelled
            await prisma.userPlan.updateMany({
              where: { userId: user.id },
              data: { status: "canceled" },
            });
          }

          // Notify user or take further action
          res.sendStatus(200);
        } catch (err) {
          console.error("Error updating subscription status after cancellation:", err);
          res.sendStatus(500);
        }
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        console.log("checkout.session.completed");
        console.log({ session, customerId });
        try {
          const user = await prisma.user.findFirst({ where: { customer: customerId } });

          if (user) {
            const order = await prisma.order.findFirst({ where: { sessionId: session.id }, include: { orderItems: true } });
            console.log("order ", order);

            if (order && order.status === "unpaid") {
              // Update order/payment status in the database
              await prisma.order.updateMany({
                where: { userId: user.id, sessionId: session.id },
                data: { status: "processing", paidAt: new Date() },
              });

              try {
                await decrementProductsStock({ orderItems: order.orderItems });
              } catch (error) {
                console.log("Failed to run `decrementProductsStock fn`");
                console.log(error);
              }

              try {
                const productReviewOpportunityData = order.orderItems.map((item) => {
                  return {
                    productId: item.productId,
                    userId: user.id,
                    orderId: order.id,
                  };
                });

                await prisma.productReviewOpportunity.createMany({
                  data: productReviewOpportunityData,
                });
              } catch (error) {
                console.log(error);
              }

              const recipientEmails = [user.email];
              try {
                // Send welcome email
                await sendEmailWithNodemailer(
                  "Bestelling bevestigd!",
                  recipientEmails,
                  productOrderConfirmationEmailTemplate({
                    user: user,
                    order,
                  }),
                );
                console.log("Order confirmation email sent to:", recipientEmails);
              } catch (error) {
                console.log("error sending confirmation email to:", recipientEmails);
                console.log(error);
              }
            }
          }

          console.log("Done: checkout.session.completed");

          res.sendStatus(200);
        } catch (err) {
          console.error("Error updating order after checkout completion:", err);
          res.sendStatus(500);
        }
        break;
      }

      // Other webhook events can be handled here
      default:
        console.log(`Unhandled event type ${event.type}`);
        res.sendStatus(400);
    }
  };
}

export default WeebHookController;
