const noop = () => {};
const logger = {
  info: noop,
  error: noop,
  warn: noop,
  debug: noop,
  child: () => logger,
};

const pino = () => logger;
pino.stdTimeFunctions = {
  epochTime: () => 0,
};

export default pino;
export { pino };
