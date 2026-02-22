import { useState, useRef, useCallback, useEffect } from 'react';

// ============================================
// PAYMENT STATUS CONSTANTS
// ============================================
// These constants must match the values returned by the backend
export const PAYMENT_STATUS = {
  // Success statuses
  SUCCESS: ['completed', 'complete', 'successful', 'paid'],
  // Failure statuses
  FAILED: ['failed', 'cancelled', 'rejected', 'expired', 'error', 'declined', 'timeout'],
  // Pending statuses
  PENDING: ['pending', 'processing', 'initiated', 'awaiting_confirmation'],
};

export const isPaymentSuccess = (status: string): boolean => {
  return PAYMENT_STATUS.SUCCESS.includes(status.toLowerCase());
};

export const isPaymentFailed = (status: string): boolean => {
  return PAYMENT_STATUS.FAILED.includes(status.toLowerCase());
};

// ============================================
// TYPES
// ============================================

export type PaymentVerificationStatus =
  | 'idle'
  | 'verifying'
  | 'completed'
  | 'failed'
  | 'timeout'
  | 'stopped';

export interface PaymentVerificationConfig {
  /** Interval between polls in ms. Default: 5000 */
  pollInterval?: number;
  /** Maximum number of polling attempts. Default: 90 */
  maxAttempts?: number;
  /** Maximum consecutive network errors before stopping. Default: 10 */
  maxConsecutiveErrors?: number;
  /**
   * Custom verify function. Receives the paymentId and should return
   * a promise resolving to the API response. Defaults to paymentsAPI.verifyPayment.
   */
  verifyFn?: (paymentId: string) => Promise<any>;
  /**
   * Function to extract the status string from the API response data.
   * Default extracts from data.status || data.payment_status || data.payment?.status
   */
  extractStatus?: (data: any) => string;
  /**
   * Function to extract an error message from the API response data.
   * Default extracts from data.message || data.error || data.detail
   */
  extractErrorMessage?: (data: any) => string;
  /**
   * Called when the payment is verified as successful.
   * Receives the full response data.
   */
  onSuccess?: (data: any) => void;
  /**
   * Called when the payment is verified as failed.
   * Receives the error message and the full response data.
   */
  onFailure?: (errorMessage: string, data?: any) => void;
  /**
   * Called when the polling reaches the max attempts limit.
   * Receives the last known status.
   */
  onTimeout?: (lastStatus: string) => void;
  /**
   * Called when polling is interrupted due to too many consecutive errors.
   * Receives the last error.
   */
  onMaxErrors?: (lastError: any) => void;
  /**
   * Whether to use progressive backoff on consecutive errors.
   * When true: 5s for first 3 errors, 10s for 3-6, 15s for 6+.
   * Default: true
   */
  progressiveBackoff?: boolean;
  /**
   * Whether to distinguish temporary errors (network, timeout, SSL)
   * from definitive payment failures when handling error responses.
   * Default: true
   */
  detectTemporaryErrors?: boolean;
}

export interface PaymentVerificationResult {
  /** Current verification status */
  status: PaymentVerificationStatus;
  /** Whether the polling loop is actively running */
  isVerifying: boolean;
  /** Last error message, if any */
  error: string | null;
  /** Last known payment status from the API */
  paymentStatus: string | null;
  /** Start the verification polling for a given paymentId */
  startVerification: (paymentId: string) => void;
  /** Stop the current verification polling */
  stopVerification: () => void;
  /** Perform a manual verification with limited retries */
  manualVerify: (paymentId: string, attempts?: number, delay?: number) => Promise<{
    success: boolean;
    status: string;
    data?: any;
    error?: string;
  }>;
}

// Default status extractor
const defaultExtractStatus = (data: any): string => {
  return (data?.status || data?.payment_status || data?.payment?.status || '').toLowerCase();
};

// Default error message extractor
const defaultExtractErrorMessage = (data: any): string => {
  return data?.message || data?.error || data?.detail || 'Le paiement a echoue';
};

// Check if an error is temporary (network, timeout, SSL, etc.)
const isTemporaryError = (error: any): boolean => {
  const errorMessage = (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    ''
  ).toLowerCase();

  const errorStatus = (
    error?.response?.data?.status ||
    error?.response?.data?.payment_status ||
    ''
  ).toLowerCase();

  return (
    errorMessage.includes('timed out') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('ssl') ||
    errorMessage.includes('handshake') ||
    errorMessage.includes('network') ||
    errorMessage.includes('econnrefused') ||
    errorMessage.includes('enotfound') ||
    errorMessage.includes('socket') ||
    error?.code === 'ECONNABORTED' ||
    error?.code === 'ERR_NETWORK' ||
    errorStatus === 'error'
  );
};

// ============================================
// HOOK
// ============================================

export function usePaymentVerification(
  config: PaymentVerificationConfig = {}
): PaymentVerificationResult {
  const {
    pollInterval = 5000,
    maxAttempts = 90,
    maxConsecutiveErrors = 10,
    verifyFn,
    extractStatus = defaultExtractStatus,
    extractErrorMessage = defaultExtractErrorMessage,
    onSuccess,
    onFailure,
    onTimeout,
    onMaxErrors,
    progressiveBackoff = true,
    detectTemporaryErrors = true,
  } = config;

  const [status, setStatus] = useState<PaymentVerificationStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);

  // Refs to manage the polling loop lifecycle
  const stopRef = useRef<boolean>(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep latest config callbacks in refs to avoid stale closures
  const onSuccessRef = useRef(onSuccess);
  const onFailureRef = useRef(onFailure);
  const onTimeoutRef = useRef(onTimeout);
  const onMaxErrorsRef = useRef(onMaxErrors);
  const verifyFnRef = useRef(verifyFn);

  // Update refs when callbacks change
  onSuccessRef.current = onSuccess;
  onFailureRef.current = onFailure;
  onTimeoutRef.current = onTimeout;
  onMaxErrorsRef.current = onMaxErrors;
  verifyFnRef.current = verifyFn;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRef.current = true;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  // Get the verify function -- use default paymentsAPI if none provided
  const getVerifyFn = useCallback(() => {
    if (verifyFnRef.current) return verifyFnRef.current;
    // Lazy import to avoid circular dependency issues
    const { paymentsAPI } = require('../api/client');
    return (paymentId: string) => paymentsAPI.verifyPayment(paymentId);
  }, []);

  const stopVerification = useCallback(() => {
    stopRef.current = true;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setStatus((prev) => (prev === 'verifying' ? 'stopped' : prev));
  }, []);

  const startVerification = useCallback(
    (paymentId: string) => {
      // Reset state
      stopRef.current = false;
      setStatus('verifying');
      setError(null);
      setPaymentStatus(null);

      let attempts = 0;
      let consecutiveErrors = 0;

      const verify = getVerifyFn();

      const checkStatus = async () => {
        if (stopRef.current) {
          console.log('[PaymentVerification] Polling stopped');
          return;
        }

        try {
          const response = await verify(paymentId);
          const data = response.data;
          const currentStatus = extractStatus(data);
          const errorMsg = extractErrorMessage(data);

          console.log(`[PaymentVerification] Poll #${attempts + 1}: status = ${currentStatus}`);

          // Reset consecutive errors on successful request
          consecutiveErrors = 0;
          setPaymentStatus(currentStatus);

          // Check again if stopped during the request
          if (stopRef.current) {
            console.log('[PaymentVerification] Polling stopped');
            return;
          }

          if (isPaymentSuccess(currentStatus)) {
            setStatus('completed');
            setError(null);
            onSuccessRef.current?.(data);
          } else if (isPaymentFailed(currentStatus)) {
            setStatus('failed');
            setError(errorMsg);
            onFailureRef.current?.(errorMsg, data);
          } else if (attempts < maxAttempts) {
            // Still pending
            attempts++;
            timeoutRef.current = setTimeout(checkStatus, pollInterval);
          } else {
            // Timeout
            setStatus('timeout');
            onTimeoutRef.current?.(currentStatus);
          }
        } catch (err: any) {
          if (stopRef.current) {
            console.log('[PaymentVerification] Polling stopped');
            return;
          }

          console.error('[PaymentVerification] Poll error:', err);

          // Check if the error response contains a definitive failure status
          const errorData = err.response?.data;
          const errorPaymentStatus = (
            errorData?.status || errorData?.payment_status || ''
          ).toLowerCase();

          const isDefiniteFailure =
            detectTemporaryErrors
              ? isPaymentFailed(errorPaymentStatus) &&
                !isTemporaryError(err) &&
                ['failed', 'cancelled', 'rejected', 'declined'].includes(errorPaymentStatus)
              : isPaymentFailed(errorPaymentStatus);

          if (isDefiniteFailure) {
            const errorMsg =
              errorData?.message || errorData?.detail || 'Le paiement a echoue';
            setStatus('failed');
            setError(errorMsg);
            setPaymentStatus(errorPaymentStatus);
            onFailureRef.current?.(errorMsg, errorData);
          } else {
            consecutiveErrors++;
            attempts++;

            if (attempts < maxAttempts && consecutiveErrors < maxConsecutiveErrors) {
              // Calculate delay with optional progressive backoff
              let delay = pollInterval;
              if (progressiveBackoff) {
                if (consecutiveErrors >= 6) {
                  delay = 15000;
                } else if (consecutiveErrors >= 3) {
                  delay = 10000;
                }
              }

              console.log(
                `[PaymentVerification] Temporary error (${consecutiveErrors} consecutive), retrying in ${delay / 1000}s... (${attempts}/${maxAttempts})`
              );
              timeoutRef.current = setTimeout(checkStatus, delay);
            } else {
              // Max attempts or max consecutive errors reached
              setStatus('timeout');
              onMaxErrorsRef.current?.(err);
            }
          }
        }
      };

      // Start the first check
      checkStatus();
    },
    [
      maxAttempts,
      maxConsecutiveErrors,
      pollInterval,
      progressiveBackoff,
      detectTemporaryErrors,
      extractStatus,
      extractErrorMessage,
      getVerifyFn,
    ]
  );

  /**
   * Perform a one-shot manual verification with limited retries.
   * Unlike startVerification, this returns a promise with the result
   * and does NOT update the hook state (useful for "I already paid" flows).
   */
  const manualVerify = useCallback(
    async (
      paymentId: string,
      attempts: number = 5,
      delay: number = 3000
    ): Promise<{
      success: boolean;
      status: string;
      data?: any;
      error?: string;
    }> => {
      const verify = getVerifyFn();

      for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
          console.log(
            `[PaymentVerification] Manual verification attempt ${attempt}/${attempts}`
          );

          const response = await verify(paymentId);
          const data = response.data;
          const currentStatus = extractStatus(data);

          console.log(
            `[PaymentVerification] Manual verification status: ${currentStatus}`
          );

          if (isPaymentSuccess(currentStatus)) {
            return { success: true, status: currentStatus, data };
          }

          if (
            isPaymentFailed(currentStatus) &&
            ['failed', 'cancelled', 'rejected', 'declined'].includes(currentStatus)
          ) {
            const errorMsg = extractErrorMessage(data);
            return { success: false, status: currentStatus, data, error: errorMsg };
          }

          // Still pending -- wait before next attempt (unless last)
          if (attempt < attempts) {
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        } catch (err: any) {
          console.error(
            `[PaymentVerification] Manual verification error (attempt ${attempt}):`,
            err
          );

          // On last attempt, return error
          if (attempt === attempts) {
            return {
              success: false,
              status: 'error',
              error:
                err?.response?.data?.message ||
                err?.response?.data?.detail ||
                'Impossible de verifier le statut du paiement',
            };
          }

          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      // Should not reach here, but just in case
      return { success: false, status: 'pending', error: 'Paiement toujours en attente' };
    },
    [extractStatus, extractErrorMessage, getVerifyFn]
  );

  return {
    status,
    isVerifying: status === 'verifying',
    error,
    paymentStatus,
    startVerification,
    stopVerification,
    manualVerify,
  };
}
