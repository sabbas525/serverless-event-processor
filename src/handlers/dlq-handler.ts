export const handler = async (event: any) => {
  for (const record of event.Records) {
    const body = JSON.parse(record.body);
    console.error('DLQ received failed event:', JSON.stringify(body, null, 2));
    // In production: forward to alerting system (PagerDuty, SNS, etc.)
  }

  return { batchItemFailures: [] };
};
