const hasValue = (value: unknown): boolean =>
  value !== null && value !== undefined && value !== "";
export default hasValue;
