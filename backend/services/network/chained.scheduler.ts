const logger = require('../../utils/logger');

export type ScheduledTask = () => Promise<void>;

export class ChainedScheduler {
  private isRunning = false;
  private isExecuting = false;
  private timerId: NodeJS.Timeout | null = null;
  private readonly name: string;
  private readonly intervalMs: number;
  private readonly task: ScheduledTask;

  private totalRuns = 0;
  private lastRunDurationMs = 0;
  private lastError: Error | null = null;

  constructor(name: string, intervalMs: number, task: ScheduledTask) {
    this.name = name;
    this.intervalMs = Math.max(1000, intervalMs); // Mínimo 1 segundo
    this.task = task;
  }

  /**
   * Inicia el ciclo encadenado garantizando cero solapamiento.
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.scheduleNext(0);
  }

  /**
   * Detiene el planificador cancelando el próximo ciclo.
   */
  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    logger.info({ scheduler: this.name }, `[Scheduler] Detenido ${this.name}`);
  }

  private scheduleNext(delayMs: number): void {
    if (!this.isRunning) return;

    this.timerId = setTimeout(async () => {
      if (!this.isRunning) return;

      const startTime = Date.now();
      this.isExecuting = true;

      try {
        await this.task();
        this.lastError = null;
      } catch (err: any) {
        this.lastError = err;
        logger.error({ err: err?.message || err, scheduler: this.name }, `[Scheduler] Error en ejecución de ${this.name}`);
      } finally {
        this.isExecuting = false;
        this.totalRuns++;
        this.lastRunDurationMs = Date.now() - startTime;

        if (this.isRunning) {
          // El próximo ciclo solo se programa DESPUÉS de haber finalizado el actual
          const remainingDelay = Math.max(0, this.intervalMs - this.lastRunDurationMs);
          this.scheduleNext(remainingDelay);
        }
      }
    }, delayMs);
  }

  getTelemetry() {
    return {
      name: this.name,
      isRunning: this.isRunning,
      isExecuting: this.isExecuting,
      intervalMs: this.intervalMs,
      totalRuns: this.totalRuns,
      lastRunDurationMs: this.lastRunDurationMs,
      lastError: this.lastError ? this.lastError.message : null
    };
  }
}
