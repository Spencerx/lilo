const MODEL_AVAILABILITY_CHANGED_EVENT = "lilo-model-availability-changed";

export const notifyModelAvailabilityChanged = (): void => {
  window.dispatchEvent(new CustomEvent(MODEL_AVAILABILITY_CHANGED_EVENT));
};

export const onModelAvailabilityChanged = (listener: () => void): (() => void) => {
  const wrapped = () => listener();
  window.addEventListener(MODEL_AVAILABILITY_CHANGED_EVENT, wrapped);
  return () => window.removeEventListener(MODEL_AVAILABILITY_CHANGED_EVENT, wrapped);
};
