
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

export const generateId = () => Math.random().toString(36).substr(2, 9).toUpperCase();

export const MOCK_MARINA_USER: any = {
  id: 'marina-1',
  name: 'Marina Central',
  email: 'admin@marina.com',
  role: 'MARINA',
  isBlocked: false,
};
