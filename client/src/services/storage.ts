export const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

export const id = () => crypto.randomUUID();

export const now = () => new Date().toISOString();
