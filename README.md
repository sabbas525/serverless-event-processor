# Serverless Event Processor

A serverless event-driven order processing pipeline on AWS using Lambda, EventBridge, DynamoDB, and CDK.

## Architecture

```
API Gateway (REST)
    |
    v
Lambda: order-intake
    |
    v
EventBridge (custom event bus: order-events)
    |
    +---> Rule: order.created --> Lambda: process-order --> DynamoDB (orders table)
    +---> Rule: order.failed  --> SQS DLQ --> Lambda: dlq-handler (alerts/retry)
    +---> Rule: order.*       --> CloudWatch Logs (observability)
```

## What it does

1. **Order intake** — REST endpoint accepts order submissions, publishes events to EventBridge
2. **Order processing** — EventBridge rule triggers a Lambda that validates and persists orders to DynamoDB
3. **Error handling** — Failed events land in an SQS dead-letter queue, triggering an alert handler

## Tech Stack

- TypeScript / Node.js 20
- AWS CDK (Infrastructure as Code)
- AWS Lambda (compute)
- Amazon EventBridge (event routing)
- Amazon DynamoDB (persistence)
- Amazon SQS (dead-letter queue)
- Amazon API Gateway (REST endpoint)

## Deploy

```bash
npm install
npx cdk deploy
```

## Test

```bash
# Run CDK tests
npm test

# Test the deployed API
curl -X POST https://<api-id>.execute-api.<region>.amazonaws.com/prod/orders \
  -H "Content-Type: application/json" \
  -d '{"product": "Widget", "quantity": 5, "customer": "acme-corp"}'
```

## Design Decisions

- **EventBridge over SNS/SQS** — native event routing with content-based filtering, no topic/queue management
- **DLQ pattern** — failed events are preserved for investigation and retry, not silently dropped
- **Pay-per-request DynamoDB** — no capacity planning needed for variable workloads
- **CDK over CloudFormation** — type-safe infrastructure, better developer experience, reusable constructs
