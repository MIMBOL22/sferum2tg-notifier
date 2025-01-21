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

export const getEnvs = () =>  {
  const envValues = ENV_KEYS.map(key => process.env[key]);
  if (Object.values(envValues).includes(undefined)) throw new Error('Missing environment variables');
  const envEntries = ENV_KEYS.map((key, index) => [key, envValues[index]]);
  const envs = Object.fromEntries(envEntries);
  return envs as EnvsType;
}