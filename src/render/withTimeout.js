export function withTimeout(promise, timeoutMs, code, { onLateResolve = () => {} } = {}) {
  let state = "pending";
  let timer;

  return new Promise((resolve, reject) => {
    timer = setTimeout(() => {
      if (state !== "pending") return;
      state = "timed-out";
      reject(new Error(code));
    }, timeoutMs);

    Promise.resolve(promise).then((value) => {
      if (state === "timed-out") {
        onLateResolve(value);
        return;
      }
      if (state !== "pending") return;
      state = "resolved";
      clearTimeout(timer);
      resolve(value);
    }, (error) => {
      if (state !== "pending") return;
      state = "rejected";
      clearTimeout(timer);
      reject(error);
    });
  });
}
