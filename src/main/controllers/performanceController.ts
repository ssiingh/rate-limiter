import { Request, Response } from 'express';
import { HTTP_STATUS } from '../utils/constants';
import { performanceService, PerformanceBaseline } from '../services/performanceService';

export async function storeBaseline(req: Request, res: Response): Promise<void> {
  const baseline = req.body as PerformanceBaseline;
  performanceService.storeBaseline(baseline);
  res.status(HTTP_STATUS.OK).json({ message: 'Baseline stored successfully' });
}

export async function analyzeRegression(req: Request, res: Response): Promise<void> {
  const current = req.body as PerformanceBaseline;
  const rtThreshold = req.query.responseTimeThreshold ? parseInt(req.query.responseTimeThreshold as string, 10) : 20;
  const tpThreshold = req.query.throughputThreshold ? parseInt(req.query.throughputThreshold as string, 10) : 15;
  
  const analysis = performanceService.analyzeRegression(current, rtThreshold, tpThreshold);
  res.status(HTTP_STATUS.OK).json(analysis);
}

export async function storeAndAnalyze(req: Request, res: Response): Promise<void> {
  const current = req.body as PerformanceBaseline;
  const rtThreshold = req.query.responseTimeThreshold ? parseInt(req.query.responseTimeThreshold as string, 10) : 20;
  const tpThreshold = req.query.throughputThreshold ? parseInt(req.query.throughputThreshold as string, 10) : 15;
  
  const analysis = performanceService.analyzeRegression(current, rtThreshold, tpThreshold);
  performanceService.storeBaseline(current);
  res.status(HTTP_STATUS.OK).json(analysis);
}

export async function getBaselines(req: Request, res: Response): Promise<void> {
  const { testName } = req.params;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
  const baselines = performanceService.getBaselines(testName, limit);
  res.status(HTTP_STATUS.OK).json(baselines);
}

export async function getTrend(req: Request, res: Response): Promise<void> {
  const { testName } = req.params;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
  const baselines = performanceService.getBaselines(testName, limit);
  
  // Format for charting
  const trend = baselines.map(b => ({
    timestamp: b.timestamp,
    averageResponseTime: b.averageResponseTime,
    throughputPerSecond: b.throughputPerSecond,
    successRate: b.successRate,
  }));
  
  res.status(HTTP_STATUS.OK).json(trend);
}

export async function getHealth(req: Request, res: Response): Promise<void> {
  res.status(HTTP_STATUS.OK).json({ status: 'UP', service: 'Performance Monitoring' });
}
