interface RateLimitStore {
    attempts: number;
    lastAttempt: number;
    locked: boolean;
    lockExpiry: number | null;
  }
  
  export class RateLimiter {
    private static MAX_ATTEMPTS = 5;
    private static LOCK_DURATION = 5 * 60 * 1000; // 5 minutes
    private static ATTEMPT_RESET = 60 * 1000; // 1 minute
  
    private static getStore(): RateLimitStore {
      const stored = sessionStorage.getItem('rateLimit');
      if (stored) {
        return JSON.parse(stored);
      }
      return {
        attempts: 0,
        lastAttempt: 0,
        locked: false,
        lockExpiry: null
      };
    }
  
    private static saveStore(store: RateLimitStore) {
      sessionStorage.setItem('rateLimit', JSON.stringify(store));
    }
  
    static attempt(): { allowed: boolean; remainingTime?: number } {
      const store = this.getStore();
      const now = Date.now();
  
      if (store.locked && store.lockExpiry) {
        if (now < store.lockExpiry) {
          return { 
            allowed: false, 
            remainingTime: Math.ceil((store.lockExpiry - now) / 1000) 
          };
        }
        store.locked = false;
        store.lockExpiry = null;
        store.attempts = 0;
      }
  
      if (now - store.lastAttempt > this.ATTEMPT_RESET) {
        store.attempts = 0;
      }
  
      store.attempts++;
      store.lastAttempt = now;
  
      if (store.attempts >= this.MAX_ATTEMPTS) {
        store.locked = true;
        store.lockExpiry = now + this.LOCK_DURATION;
        this.saveStore(store);
        return { 
          allowed: false, 
          remainingTime: Math.ceil(this.LOCK_DURATION / 1000) 
        };
      }
  
      this.saveStore(store);
      return { allowed: true };
    }
  
    static reset() {
      sessionStorage.removeItem('rateLimit');
    }
  
    static getRemainingAttempts(): number {
      const store = this.getStore();
      return Math.max(0, this.MAX_ATTEMPTS - store.attempts);
    }
  }
  