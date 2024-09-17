import { env } from "../env";
import { crashReportEmailTemplate } from "../templates/emails/crash-report-email-template";
import { sendEmailWithNodemailer } from "./sender";

export const reportCronJobError = async (text: string) => {
  await sendEmailWithNodemailer("Crash Report", env.SUPPORT_USER_EMAIL, crashReportEmailTemplate({ crashReportText: text }));
};
