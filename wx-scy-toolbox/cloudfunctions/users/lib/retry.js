const RETRY_DELAYS = [100, 200, 400];

const defaultSleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

async function retryWrite(operation, { sleep = defaultSleep, delays = RETRY_DELAYS } = {}) {
  let lastError;

  for (let attempt = 0; attempt <= delays.length; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      if (attempt === delays.length) {
        break;
      }
      await sleep(delays[attempt]);
    }
  }

  throw lastError;
}

module.exports = { RETRY_DELAYS, retryWrite };
