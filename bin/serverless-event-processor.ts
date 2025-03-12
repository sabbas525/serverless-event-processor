#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ServerlessEventProcessorStack } from '../lib/serverless-event-processor-stack';

const app = new cdk.App();
new ServerlessEventProcessorStack(app, 'ServerlessEventProcessorStack');
