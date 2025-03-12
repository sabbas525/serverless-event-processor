import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { randomUUID } from 'crypto';

const eb = new EventBridgeClient({});

export const handler = async (event: any) => {
  try {
    const body = JSON.parse(event.body);
    const orderId = randomUUID();

    await eb.send(new PutEventsCommand({
      Entries: [{
        Source: 'orders.intake',
        DetailType: 'order.created',
        Detail: JSON.stringify({
          orderId,
          ...body,
          timestamp: new Date().toISOString(),
        }),
        EventBusName: process.env.EVENT_BUS_NAME,
      }],
    }));

    return {
      statusCode: 202,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, status: 'accepted' }),
    };
  } catch (error) {
    console.error('Failed to process order intake:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
