/**
 * LOGGER UTILITY
 * 
 * Why: Centralizing logs makes it easy to debug specific parts of the app.
 * How: Use logger.info("message", "STRIPE") to see [STRIPE] INFO: message
 */

type LogLevel = 'INFO' | 'WARN' | 'ERROR';
type Phase = 'STRIPE' | 'RAZORPAY' | 'PREMIUM' | 'USAGE' | 'WEBHOOK' | 'DATABASE' | 'AUTH' | 'GENERAL';

class Logger {
    private formatMessage(level: LogLevel, phase: Phase, message: string) {
        const timestamp = new Date().toISOString();
        return `[${timestamp}] [${phase}] ${level}: ${message}`;
    }

    info(message: string, phase: Phase = 'GENERAL') {
        console.log(this.formatMessage('INFO', phase, message));
    }

    warn(message: string, phase: Phase = 'GENERAL') {
        console.warn(this.formatMessage('WARN', phase, message));
    }

    error(message: string, phase: Phase = 'GENERAL', error?: any) {
        console.error(this.formatMessage('ERROR', phase, message));
        if (error) console.error(error);
    }
}

export const logger = new Logger();
