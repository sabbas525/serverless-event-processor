import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

const ddb = new DynamoDBClient({});

export const handler = async (event: any) => {
  const order = event.detail;

  const processed = {
    ...order,
    status: 'processed',
    processedAt: new Date().toISOString(),
  };

  await ddb.send(new PutItemCommand({
    TableName: process.env.TABLE_NAME!,
    Item: marshall(processed),
  }));

  console.log('Order processed:', order.orderId);
  return { success: true, orderId: order.orderId };
};
