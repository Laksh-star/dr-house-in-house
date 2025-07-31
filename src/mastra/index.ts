
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { weatherWorkflow } from './workflows/weather-workflow';
import { diagnosticWorkflow } from './workflows/diagnostic-workflow';
import { multiRoundDiagnosticWorkflow } from './workflows/multi-round-diagnostic';
import { aiDiagnosticWorkflow } from './workflows/ai-diagnostic-workflow';
import { weatherAgent } from './agents/weather-agent';
import { houseAgent } from './agents/house-agent';
import { wilsonAgent } from './agents/wilson-agent';
import { foremanAgent } from './agents/foreman-agent';
import { cameronAgent } from './agents/cameron-agent';
import { chaseAgent } from './agents/chase-agent';
import { symptomChecker, labAnalyzer, imagingInterpreter, weatherTool } from './tools';

export const mastra = new Mastra({
  workflows: { 
    weatherWorkflow, 
    diagnosticWorkflow,
    multiRoundDiagnosticWorkflow,
    aiDiagnosticWorkflow
  },
  agents: { 
    weatherAgent, 
    houseAgent,
    wilsonAgent,
    foremanAgent,
    cameronAgent,
    chaseAgent 
  },
  tools: {
    symptomChecker,
    labAnalyzer,
    imagingInterpreter,
    weatherTool
  },
  storage: new LibSQLStore({
    // stores telemetry, evals, ... into memory storage, if it needs to persist, change to file:../mastra.db
    url: ":memory:",
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
});
