import axios from "axios";
import { RequestHandler } from "express";
import { z } from "zod";
import { env } from "../env";
import HttpError from "../utils/HttpError";

const createSubscriptionValidator = z.object({
  email: z.string().email(),
});

class SubscriptionController {
  createEmailSubscription: RequestHandler = async (req, res) => {
    const value = await createSubscriptionValidator.parseAsync(req.body);

    const data = {
      members: [
        {
          email_address: value.email,
          status: "subscribed",
        },
      ],
    };

    const config = {
      headers: {
        Authorization: `apikey ${env.MAILCHIMP_API_KEY}`,
      },
    };

    // Check for existing subscriber
    try {
      const existingSubscriberResponse = await axios.get(
        `https://${env.MAILCHIMP_DC}.api.mailchimp.com/3.0/lists/${env.MAILCHIMP_LIST_ID}/members/${encodeURIComponent(value.email)}`,
        config,
      );

      if (existingSubscriberResponse.status === 200) {
        return res.status(400).json({
          success: false,
          message: "You have already been subscribed !",
        });
      }
    } catch (error) {
      // console.error("Error checking for existing subscriber:", error);
    }

    // Add new subscriber if not found
    const mailchimpResponse = await axios.post(`https://${env.MAILCHIMP_DC}.api.mailchimp.com/3.0/lists/${env.MAILCHIMP_LIST_ID}`, data, config);

    if (mailchimpResponse.status === 200) {
      return res.status(200).json({
        success: true,
        message: "Subscription created successfully",
      });
    } else {
      throw new HttpError("Failed to subscribe with Mailchimp");
    }
  };
}

export default SubscriptionController;
