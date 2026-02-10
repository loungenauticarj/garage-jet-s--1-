
export const toTitleCase = (str: string) => {
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

export const formatCEP = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{2})(\d{3})(\d{3})$/, '$1.$2-$3')
    .substring(0, 10);
};

export const formatPhone = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
    .substring(0, 15);
};

export const formatCPF = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
    .substring(0, 14);
};

export const isValidCPF = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  const calcCheck = (base: string, factor: number) => {
    let sum = 0;
    for (let i = 0; i < base.length; i += 1) {
      sum += parseInt(base[i], 10) * (factor - i);
    }
    const mod = (sum * 10) % 11;
    return mod === 10 ? 0 : mod;
  };

  const firstCheck = calcCheck(digits.slice(0, 9), 10);
  if (firstCheck !== parseInt(digits[9], 10)) return false;

  const secondCheck = calcCheck(digits.slice(0, 10), 11);
  if (secondCheck !== parseInt(digits[10], 10)) return false;

  return true;
};

export const generateId = () => Math.random().toString(36).substr(2, 9).toUpperCase();

export const MOCK_MARINA_USER: any = {
  id: 'marina-1',
  name: 'Marina Central',
  email: 'admin@marina.com',
  role: 'MARINA',
  isBlocked: false,
};
