const ENV_KEYS = [
  'REDIS_URL',
  'ADMIN_TELEGRAM_ID',
  'ADMIN_TELEGRAM_USERNAME',
  'SFERUM_TOKEN',
  'SFERUM_CHAT_ID',
  'TELEGRAM_TOKEN'
] as const;

// Решил задушить TS, чтобы нельзя было получить ENV которого нет в ENV_KEYS
type EnvsType = {
  [key in typeof ENV_KEYS[number]]: string;
};

export const getEnvs = () => {
  const envEntries = ENV_KEYS.map((key) => [key, process.env[key]])
  if (Object.values(envEntries).includes(undefined)) throw new Error('Missing environment variables');
  const envs = Object.fromEntries(envEntries);
  return envs as EnvsType;
}
