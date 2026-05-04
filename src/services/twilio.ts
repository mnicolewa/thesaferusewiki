import Twilio from "twilio";

export type SmsResult = {
  success: boolean;
  error?: string;
};

function getClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!sid || !token || !from) {
    return null;
  }

  return {
    client: Twilio(sid, token),
    from,
  };
}

/**
 * Sends a short SMS message using Twilio without persisting phone numbers or message content.
 */
export async function sendSms(phone: string, message: string): Promise<SmsResult> {
  const config = getClient();
  if (!config) {
    return { success: false, error: "Text messaging is not configured right now." };
  }

  try {
    await config.client.messages.create({
      to: phone,
      from: config.from,
      body: message,
    });
    return { success: true };
  } catch {
    return { success: false, error: "We could not send that text message right now." };
  }
}

/**
 * Confirms whether Twilio credentials are available for sending SMS.
 */
export async function ping() {
  return Boolean(getClient());
}
