import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambdaBase from 'aws-cdk-lib/aws-lambda';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Construct } from 'constructs';

export class ServerlessEventProcessorStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB table for processed orders
    const table = new dynamodb.Table(this, 'Orders', {
      partitionKey: { name: 'orderId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Dead-letter queue for failed processing
    const dlq = new sqs.Queue(this, 'OrderProcessingDLQ', {
      queueName: 'order-processing-dlq',
      retentionPeriod: cdk.Duration.days(14),
    });

    // Custom EventBridge bus
    const bus = new events.EventBus(this, 'OrderEventBus', {
      eventBusName: 'order-events',
    });

    // Lambda: order-intake (receives POST, publishes to EventBridge)
    const intakeFn = new lambda.NodejsFunction(this, 'OrderIntakeFn', {
      entry: 'src/handlers/order-intake.ts',
      handler: 'handler',
      runtime: lambdaBase.Runtime.NODEJS_20_X,
      environment: {
        EVENT_BUS_NAME: bus.eventBusName,
      },
    });
    bus.grantPutEventsTo(intakeFn);

    // Lambda: process-order (triggered by EventBridge, writes to DynamoDB)
    const processFn = new lambda.NodejsFunction(this, 'ProcessOrderFn', {
      entry: 'src/handlers/process-order.ts',
      handler: 'handler',
      runtime: lambdaBase.Runtime.NODEJS_20_X,
      environment: {
        TABLE_NAME: table.tableName,
      },
      deadLetterQueue: dlq,
    });
    table.grantWriteData(processFn);

    // Lambda: dlq-handler (processes failed events)
    const dlqFn = new lambda.NodejsFunction(this, 'DlqHandlerFn', {
      entry: 'src/handlers/dlq-handler.ts',
      handler: 'handler',
      runtime: lambdaBase.Runtime.NODEJS_20_X,
    });
    dlqFn.addEventSource(new SqsEventSource(dlq));

    // EventBridge rule: order.created -> process-order Lambda
    new events.Rule(this, 'OrderCreatedRule', {
      eventBus: bus,
      eventPattern: {
        source: ['orders.intake'],
        detailType: ['order.created'],
      },
      targets: [new targets.LambdaFunction(processFn)],
    });

    // API Gateway
    const api = new apigateway.RestApi(this, 'OrderApi', {
      restApiName: 'Order Processing API',
      description: 'Serverless order intake endpoint',
    });

    const ordersResource = api.root.addResource('orders');
    ordersResource.addMethod('POST', new apigateway.LambdaIntegration(intakeFn));

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', { value: api.url });
    new cdk.CfnOutput(this, 'TableName', { value: table.tableName });
    new cdk.CfnOutput(this, 'EventBusName', { value: bus.eventBusName });
  }
}
