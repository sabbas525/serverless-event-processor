import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { ServerlessEventProcessorStack } from '../lib/serverless-event-processor-stack';

describe('ServerlessEventProcessorStack', () => {
  const app = new cdk.App();
  const stack = new ServerlessEventProcessorStack(app, 'TestStack');
  const template = Template.fromStack(stack);

  test('creates DynamoDB table with correct keys', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      KeySchema: [
        { AttributeName: 'orderId', KeyType: 'HASH' },
        { AttributeName: 'timestamp', KeyType: 'RANGE' },
      ],
    });
  });

  test('creates EventBridge custom bus', () => {
    template.hasResourceProperties('AWS::Events::EventBus', {
      Name: 'order-events',
    });
  });

  test('creates SQS dead-letter queue', () => {
    template.hasResourceProperties('AWS::SQS::Queue', {
      QueueName: 'order-processing-dlq',
    });
  });

  test('creates three Lambda functions', () => {
    template.resourceCountIs('AWS::Lambda::Function', 3);
  });

  test('creates API Gateway REST API', () => {
    template.hasResourceProperties('AWS::ApiGateway::RestApi', {
      Name: 'Order Processing API',
    });
  });

  test('EventBridge rule targets process-order Lambda', () => {
    template.hasResourceProperties('AWS::Events::Rule', {
      EventPattern: {
        source: ['orders.intake'],
        'detail-type': ['order.created'],
      },
    });
  });
});
